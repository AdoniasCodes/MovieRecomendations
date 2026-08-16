// Gated Supabase client (Phase 3). Returns null until env is set, so the app
// keeps running entirely on the mock store. When you add the env vars and flip
// the store over to this layer, screens don't change (same action seam).
//
// Env (see .env.example):
//   NEXT_PUBLIC_SUPABASE_URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY
//
// ---------------------------------------------------------------------------
// WHY THERE IS A CUSTOM fetch HERE (2026-08-16). Read before removing it.
//
// This is the fix for "it says not synced and tapping reconnect does nothing,
// but force-closing the app and reopening works", which plagued Panda's phone
// for weeks and did not care whether the VPN was on.
//
// supabase-js ships NO timeout on its fetch. On a route that black-holes
// packets (his ISP does this to the Netlify edge routinely) a request does not
// fail, it HANGS. If the request that hangs happens to be the token refresh,
// auth-js parks its single-flight promise (`refreshingDeferred`) and never
// settles it. From that moment on:
//
//   - every later getSession() returns that same never-resolving promise, and
//   - every REST query calls _getAccessToken() -> getSession() first,
//
// so EVERY read and write hangs forever, with no error and no rejection, for
// the life of the page. The couple slice never loads, the "Not synced" strip
// appears, and tapping it just awaits the same dead promise. Only destroying
// the page (force-quit + reopen) builds a fresh client and clears it. That is
// exactly the reported behaviour, and it is why the VPN never mattered: the
// jam is inside the tab, not on the wire.
//
// A hard per-request timeout converts that hang into an ordinary error. auth-js
// treats an abort as a retryable fetch error, so the deferred SETTLES, the
// retry/backoff paths run, and the app can heal itself instead of needing a
// restart. Everything downstream (auth, REST, storage) shares this fetch.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { diag } from "./diag";

let _client: SupabaseClient | null | undefined;

/** No Supabase call may take longer than this. Nothing on this app's critical
 *  path is legitimately slower, and a request still running at 20s on a phone
 *  is a request that is never coming back. */
export const REQUEST_TIMEOUT_MS = 20_000;

/** true once both public Supabase env vars are present */
export function supabaseConfigured(): boolean {
  return (
    !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/** the project ref, e.g. "abcdefg" from https://abcdefg.supabase.co */
export function projectRef(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return url.replace(/^https?:\/\//, "").split(".")[0] ?? "";
}

/** short label for a request URL, for the diagnostics log (never logs tokens) */
function label(input: RequestInfo | URL): string {
  try {
    const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const u = new URL(raw);
    // path only: query strings carry filters and, on auth routes, secrets
    return u.pathname.replace("/rest/v1/", "").replace("/auth/v1/", "auth:");
  } catch {
    return "?";
  }
}

/**
 * fetch with a hard deadline. Anything that outlives REQUEST_TIMEOUT_MS is
 * aborted so the caller gets a real error instead of waiting forever. Slow
 * requests are also recorded, because "everything works but takes 9 seconds" is
 * the state that precedes a wedge and we want it visible in the log.
 */
const timedFetch: typeof fetch = async (input, init) => {
  const ctl = new AbortController();
  const started = Date.now();
  const name = label(input);

  // honour a caller-supplied signal as well as our deadline
  const upstream = init?.signal;
  if (upstream) {
    if (upstream.aborted) ctl.abort();
    else upstream.addEventListener("abort", () => ctl.abort(), { once: true });
  }
  const timer = setTimeout(() => ctl.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(input, { ...init, signal: ctl.signal });
    const ms = Date.now() - started;
    if (ms > 5_000) diag.log("net.slow", `${name} ${ms}ms ${res.status}`);
    else if (!res.ok && res.status !== 406) diag.log("net.err", `${name} ${res.status}`);
    return res;
  } catch (e) {
    const ms = Date.now() - started;
    const aborted = (e as { name?: string })?.name === "AbortError";
    // The distinction matters when reading a log: "timeout" is the ISP
    // black-holing us, "fail" is a refused/offline connection.
    diag.log(aborted ? "net.timeout" : "net.fail", `${name} ${ms}ms`);
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

/** the browser client, or null when Supabase isn't configured yet */
export function getSupabase(): SupabaseClient | null {
  if (_client !== undefined) return _client;
  if (!supabaseConfigured()) {
    _client = null;
    return null;
  }
  _client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { persistSession: true, autoRefreshToken: true },
      global: { fetch: timedFetch },
    }
  );
  return _client;
}
