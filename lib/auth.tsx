"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { diag } from "./diag";
import { reviveRealtime } from "./live";
import { derivePassword } from "./pin-accounts";
import { getSupabase, supabaseConfigured } from "./supabase";

/**
 * Bound a promise. EVERY await on a recovery path goes through this.
 *
 * The 2026-08-16 wedge taught the lesson twice over: the boot path was already
 * timed out, but the self-heal retry and the "tap to reconnect" handler were
 * not, so when a Supabase call hung they hung with it: the retry loop's `busy`
 * flag stayed true forever and the reconnect spinner span until the app was
 * force-quit. A recovery path that can itself hang is not a recovery path.
 */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
}

/** one couple-slice load should never take longer than this */
const LOAD_TIMEOUT_MS = 12_000;
/** a forced token refresh is a single round trip; it gets less rope */
const AUTH_TIMEOUT_MS = 10_000;

export interface Profile {
  id: string;
  name: string;
  emoji: string;
  color: string;
}
export interface Couple {
  id: string;
  code: string;
}

interface AuthCtx {
  configured: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  couple: Couple | null;
  partner: Profile | null;
  /** logged in AND paired with someone */
  live: boolean;
  /** "pick who you are" + shared PIN → password sign-in (no email). */
  signInWithPin: (email: string, pin: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  createCouple: () => Promise<{ code?: string; error?: string }>;
  joinCouple: (code: string) => Promise<{ error?: string }>;
  refresh: () => Promise<void>;
  /** full repair: fresh token, reload, rebuild sockets. true = live again. */
  reconnect: () => Promise<boolean>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const sb = getSupabase();
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [couple, setCouple] = useState<Couple | null>(null);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(supabaseConfigured());

  // Resolves the couple slice. Returns false on a FAILED/PARTIAL load (network
  // error mid-way) so callers retry; a transient failure must never clear
  // still-valid couple state or read as "genuinely unpaired". One flaky boot
  // used to leave the app silently in demo mode until a full restart.
  const loadAll = useCallback(
    async (s: Session | null): Promise<boolean> => {
      if (!sb) return true;
      if (!s) {
        setProfile(null);
        setCouple(null);
        setPartner(null);
        return true;
      }
      const uid = s.user.id;
      const fallbackName = (s.user.email?.split("@")[0] ?? "You").replace(/^\w/, (c) => c.toUpperCase());
      try {
        // make sure a profile row exists (best-effort: it exists after first boot)
        await sb
          .rpc("ensure_profile", { p_name: fallbackName, p_emoji: "💞", p_color: "#DB2777" })
          .then(null, () => null);

        const me = await sb.from("profiles").select("id,name,emoji,color").eq("id", uid).single();
        if (!me.error && me.data) setProfile(me.data);

        const mem = await sb.from("couple_members").select("couple_id").eq("user_id", uid).maybeSingle();
        if (mem.error) {
          diag.log("load.fail", `members ${mem.error.code ?? ""} ${mem.error.message}`.slice(0, 120));
          return false;
        }
        if (!mem.data) {
          // genuinely unpaired (the query succeeded and found nothing)
          setCouple(null);
          setPartner(null);
          return true;
        }
        const c = await sb.from("couples").select("id,code").eq("id", mem.data.couple_id).maybeSingle();
        if (c.error || !c.data) return false;
        setCouple(c.data);

        const others = await sb
          .from("couple_members")
          .select("user_id")
          .eq("couple_id", mem.data.couple_id)
          .neq("user_id", uid);
        if (others.error) return false;
        const otherId = others.data?.[0]?.user_id;
        if (!otherId) {
          setPartner(null); // paired, waiting for the partner to join
          return true;
        }
        const p = await sb.from("profiles").select("id,name,emoji,color").eq("id", otherId).maybeSingle();
        if (p.error || !p.data) return false;
        setPartner(p.data);
        diag.log("load.ok");
        return true;
      } catch (e) {
        diag.log("load.throw", String((e as Error)?.message ?? e).slice(0, 120));
        return false;
      }
    },
    [sb]
  );

  useEffect(() => {
    if (!sb) {
      setLoading(false);
      return;
    }
    let active = true;
    diag.log("boot");
    // Boot must NEVER pin the splash: every step is timed out (module-level
    // withTimeout) and the loading flag clears in finally even if the network
    // stalls or a call rejects.
    // loadAll dedup: the boot IIFE and onAuthStateChange (INITIAL_SESSION,
    // TOKEN_REFRESHED) would otherwise each run the same ~6-query load for the
    // same user. Track whose data is loaded and only reload on a real change.
    let loadedFor: string | null | undefined = undefined;
    (async () => {
      try {
        const { data } = await withTimeout(
          sb.auth.getSession(),
          5000,
          { data: { session: null } } as Awaited<ReturnType<typeof sb.auth.getSession>>
        );
        if (!active) return;
        setSession(data.session);
        loadedFor = data.session?.user.id ?? null;
        const ok = await withTimeout(loadAll(data.session), 8000, false);
        if (!ok) loadedFor = undefined; // failed load: the next auth event must retry
      } catch (e) {
        console.error("auth boot failed", e);
        loadedFor = undefined;
      } finally {
        if (active) setLoading(false);
      }
    })();
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, s) => {
      diag.log("auth.event", `${_e}${s ? "" : " nosession"}`);
      setSession(s);
      const key = s?.user.id ?? null;
      if (key === loadedFor) {
        setLoading(false); // same user's data already loaded (or loading)
        return;
      }
      loadedFor = key;
      try {
        const ok = await loadAll(s);
        if (!ok) loadedFor = undefined;
      } catch (e) {
        console.error("auth reload failed", e);
        loadedFor = undefined;
      } finally {
        // late-arriving session (e.g. after a getSession timeout) also unlocks
        setLoading(false);
      }
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [sb, loadAll]);

  // SELF-HEAL: signed in but the couple slice is incomplete (couple or partner
  // unresolved). Retry quietly until it completes, on a timer, on reconnect
  // and on foreground, so a flaky boot can never strand the app in demo mode.
  //
  // It now also ESCALATES: a plain retry cannot fix an expired access token, so from
  // the third attempt on it forces a token refresh first. That is the step the
  // old loop was missing, and it is why a bad stretch used to survive until a
  // force-quit: a restart refreshes the token, which is the only reason
  // reopening the app "fixed" it.
  const incomplete = !!session && (!couple || !partner);
  useEffect(() => {
    if (!sb || loading || !incomplete) return;
    let busy = false;
    let attempt = 0;
    let stop = false;
    const tryLoad = async () => {
      if (busy || stop || document.visibilityState !== "visible") return;
      busy = true;
      attempt += 1;
      try {
        if (attempt >= 3) {
          // bounded: a hung refresh must not take the retry loop down with it
          diag.log("heal.token", `attempt ${attempt}`);
          await withTimeout(sb.auth.refreshSession().then(() => true), AUTH_TIMEOUT_MS, false);
        }
        const ok = await withTimeout(loadAll(session), LOAD_TIMEOUT_MS, false);
        diag.log("heal", `attempt ${attempt} ${ok ? "ok" : "fail"}`);
        if (ok) {
          attempt = 0;
          // the data path is back; make sure the realtime path is too
          reviveRealtime();
        }
      } finally {
        // ALWAYS releases, because every await above is bounded
        busy = false;
      }
    };
    const t = setTimeout(tryLoad, 4_000);
    const iv = setInterval(tryLoad, 20_000);
    window.addEventListener("online", tryLoad);
    document.addEventListener("visibilitychange", tryLoad);
    return () => {
      stop = true;
      clearTimeout(t);
      clearInterval(iv);
      window.removeEventListener("online", tryLoad);
      document.removeEventListener("visibilitychange", tryLoad);
    };
  }, [sb, loading, incomplete, session, loadAll]);

  // while waiting for the partner to join, watch the couple for a new member
  useEffect(() => {
    if (!sb || !session || !couple || partner) return;
    const ch = sb
      .channel(`members:${couple.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "couple_members", filter: `couple_id=eq.${couple.id}` },
        () => loadAll(session)
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [sb, session, couple, partner, loadAll]);

  const signInWithPin = useCallback(
    async (email: string, pin: string) => {
      if (!sb) return { error: "Supabase not configured" };
      const { error } = await sb.auth.signInWithPassword({ email, password: derivePassword(pin) });
      if (!error) return {};
      // Only a real "invalid credentials" answer means the PIN is wrong. Anything
      // else (server asleep, network down, 5xx) must not blame the PIN.
      const code = (error as { code?: string }).code;
      if (code === "invalid_credentials" || /invalid login credentials/i.test(error.message)) {
        return { error: "Wrong PIN. Try again." };
      }
      return { error: "Can't reach the server right now, your PIN is probably fine. Check your connection and try again in a minute." };
    },
    [sb]
  );
  const signOut = useCallback(async () => {
    await sb?.auth.signOut();
  }, [sb]);

  const createCouple = useCallback(async () => {
    if (!sb) return { error: "Supabase not configured" };
    const { data, error } = await sb.rpc("create_couple");
    if (error) return { error: error.message };
    await loadAll(session);
    return { code: data as string };
  }, [sb, session, loadAll]);

  const joinCouple = useCallback(
    async (code: string) => {
      if (!sb) return { error: "Supabase not configured" };
      const { error } = await sb.rpc("join_couple", { p_code: code });
      if (error) return { error: error.message };
      await loadAll(session);
      return {};
    },
    [sb, session, loadAll]
  );

  const refresh = useCallback(async () => {
    await withTimeout(loadAll(session), LOAD_TIMEOUT_MS, false);
  }, [loadAll, session]);

  /**
   * What "tap to reconnect" should always have done. The old version re-ran the
   * same six queries with the same (possibly expired) token, which is why
   * tapping it did nothing while force-quitting the app worked. This does the
   * three things a restart does, in the order a restart does them:
   *
   *   1. force a fresh access token,
   *   2. reload the couple slice,
   *   3. rebuild the realtime socket and every channel on it.
   *
   * Every step is bounded, so this always returns instead of spinning forever.
   * Returns true when the app is genuinely live again.
   */
  const reconnect = useCallback(async (): Promise<boolean> => {
    if (!sb) return false;
    diag.log("repair.start");
    // 1. token
    const fresh = await withTimeout(
      sb.auth
        .refreshSession()
        .then((r) => (r.error ? null : r.data.session))
        .catch(() => null),
      AUTH_TIMEOUT_MS,
      null
    );
    if (fresh) setSession(fresh);
    diag.log("repair.token", fresh ? "ok" : "fail");

    // 2. data
    const ok = await withTimeout(loadAll(fresh ?? session), LOAD_TIMEOUT_MS, false);

    // 3. sockets. Worth doing even when the data load failed: the two paths
    //    fail independently and a live socket is what stops the next stall.
    try {
      sb.realtime.disconnect();
      sb.realtime.connect();
    } catch {
      /* realtime rebuild is best-effort */
    }
    reviveRealtime();

    diag.log("repair.done", ok ? "ok" : "fail");
    return ok;
  }, [sb, loadAll, session]);

  const value = useMemo<AuthCtx>(
    () => ({
      configured: supabaseConfigured(),
      loading,
      session,
      user: session?.user ?? null,
      profile,
      couple,
      partner,
      live: !!session && !!couple,
      signInWithPin,
      signOut,
      createCouple,
      joinCouple,
      refresh,
      reconnect,
    }),
    [loading, session, profile, couple, partner, signInWithPin, signOut, createCouple, joinCouple, refresh, reconnect]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
