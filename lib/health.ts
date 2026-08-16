"use client";

// Connection self-test (2026-08-16).
//
// The maintenance strategy this app was missing: a way to find out WHICH leg is
// broken, from the phone that is actually broken, without a laptop attached.
// Three legs fail independently and they were never distinguishable from the
// outside:
//
//   auth      the token refresh at supabase.co/auth/v1 (the one whose hang
//             wedged everything, see the header of lib/supabase.ts)
//   data      REST reads/writes at supabase.co/rest/v1
//   realtime  the websocket, which is what actually carries "she just did
//             something" and can be dead while data is perfectly healthy
//   host      Netlify, which serves the app itself and /api/* (catalog, AI,
//             push). This is the leg Panda's ISP has historically black-holed,
//             and it is INDEPENDENT of everything Supabase.
//
// Knowing "data is fine, realtime is dead" versus "the host is unreachable but
// Supabase is fine" is the difference between a two-minute fix and another week
// of guessing.

import type { SupabaseClient } from "@supabase/supabase-js";
import { diag } from "./diag";

export type LegState = "ok" | "slow" | "fail";

export interface Leg {
  name: "auth" | "data" | "realtime" | "host";
  state: LegState;
  ms: number;
  detail: string;
}

export interface HealthReport {
  at: number;
  legs: Leg[];
  /** true when everything the couple sync needs is working */
  healthy: boolean;
}

/** slower than this and something is wrong even though it technically worked */
const SLOW_MS = 4_000;
/** each leg gets its own ceiling; the whole test must stay under ~15s */
const LEG_TIMEOUT_MS = 12_000;

function race<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
}

function grade(ms: number, ok: boolean): LegState {
  if (!ok) return "fail";
  return ms > SLOW_MS ? "slow" : "ok";
}

/** is the access token still valid, and for how much longer */
async function checkAuth(sb: SupabaseClient): Promise<Leg> {
  const t0 = Date.now();
  const res = await race(
    sb.auth.getSession().then((r) => r.data.session).catch(() => null),
    LEG_TIMEOUT_MS,
    null
  );
  const ms = Date.now() - t0;
  if (!res) {
    // A getSession that does not answer in 12 seconds is the wedge itself.
    return { name: "auth", state: "fail", ms, detail: ms >= LEG_TIMEOUT_MS ? "no answer (stuck)" : "no session" };
  }
  const expiresIn = (res.expires_at ?? 0) * 1000 - Date.now();
  const mins = Math.round(expiresIn / 60_000);
  return {
    name: "auth",
    state: grade(ms, expiresIn > 0),
    ms,
    detail: expiresIn > 0 ? `token valid ${mins} min` : "token expired",
  };
}

/** a real round trip to the database */
async function checkData(sb: SupabaseClient): Promise<Leg> {
  const t0 = Date.now();
  // an async wrapper, not a bare builder: a postgrest builder is a PromiseLike,
  // and it must be a real Promise to race
  const attempt = (async () => {
    try {
      const r = await sb.from("profiles").select("id").limit(1);
      return { ok: !r.error, detail: r.error?.message ?? "read ok" };
    } catch (e) {
      return { ok: false, detail: (e as Error)?.message ?? "threw" };
    }
  })();
  const res = await race(attempt, LEG_TIMEOUT_MS, { ok: false, detail: "no answer (stuck)" });
  const ms = Date.now() - t0;
  return { name: "data", state: grade(ms, res.ok), ms, detail: res.detail.slice(0, 80) };
}

/** can we actually open a websocket channel, and how fast */
async function checkRealtime(sb: SupabaseClient): Promise<Leg> {
  const t0 = Date.now();
  // its own throwaway topic, so a failing probe can never disturb the real
  // couple channels (one client cannot hold two subs to the same topic)
  const topic = `health:${Date.now().toString(36)}`;
  const ch = sb.channel(topic);
  const joined = await new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), LEG_TIMEOUT_MS);
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        clearTimeout(timer);
        resolve(true);
      } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        clearTimeout(timer);
        resolve(false);
      }
    });
  });
  const ms = Date.now() - t0;
  void sb.removeChannel(ch);
  return {
    name: "realtime",
    state: grade(ms, joined),
    ms,
    detail: joined ? "channel joined" : "could not join",
  };
}

/** Netlify: the app's own origin and its API routes */
async function checkHost(): Promise<Leg> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), LEG_TIMEOUT_MS);
  try {
    // cache-busted so a service worker or the browser cache cannot answer for
    // the network and report a dead route as healthy
    const res = await fetch(`/api/push?ping=${Date.now()}`, { signal: ctl.signal, cache: "no-store" });
    const ms = Date.now() - t0;
    return { name: "host", state: grade(ms, res.ok), ms, detail: `HTTP ${res.status}` };
  } catch (e) {
    const ms = Date.now() - t0;
    const aborted = (e as { name?: string })?.name === "AbortError";
    return { name: "host", state: "fail", ms, detail: aborted ? "no answer (stuck)" : "unreachable" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run all four legs. They run in PARALLEL on purpose: a wedged auth leg used to
 * be able to hold everything behind it, and this test must never be able to
 * reproduce the bug it is diagnosing.
 */
export async function runHealthCheck(sb: SupabaseClient | null): Promise<HealthReport> {
  diag.log("health.start");
  const legs: Leg[] = sb
    ? await Promise.all([checkAuth(sb), checkData(sb), checkRealtime(sb), checkHost()])
    : [{ name: "host", state: "fail", ms: 0, detail: "Supabase not configured" } as Leg];

  for (const l of legs) diag.log(`health.${l.name}`, `${l.state} ${l.ms}ms ${l.detail}`);

  // "host" being down is miserable but it does not stop the couple syncing, so
  // it does not count against healthy. The other three do.
  const healthy = legs
    .filter((l) => l.name !== "host")
    .every((l) => l.state !== "fail");

  return { at: Date.now(), legs, healthy };
}
