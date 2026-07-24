"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { derivePassword } from "./pin-accounts";
import { getSupabase, supabaseConfigured } from "./supabase";

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
  // still-valid couple state or read as "genuinely unpaired" — one flaky boot
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
        if (mem.error) return false;
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
        return true;
      } catch {
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
    // Boot must NEVER pin the splash: every step is timed out and the loading
    // flag clears in finally even if the network stalls or a call rejects.
    const withTimeout = <T,>(p: Promise<T>, ms: number, fallback: T): Promise<T> =>
      Promise.race([p, new Promise<T>((res) => setTimeout(() => res(fallback), ms))]);
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
  // unresolved). Retry quietly until it completes — on a timer, on reconnect,
  // and on foreground — so a flaky boot can never strand the app in demo mode.
  const incomplete = !!session && (!couple || !partner);
  useEffect(() => {
    if (!sb || loading || !incomplete) return;
    let busy = false;
    const tryLoad = async () => {
      if (busy || document.visibilityState !== "visible") return;
      busy = true;
      try {
        await loadAll(session);
      } finally {
        busy = false;
      }
    };
    const t = setTimeout(tryLoad, 4_000);
    const iv = setInterval(tryLoad, 20_000);
    window.addEventListener("online", tryLoad);
    document.addEventListener("visibilitychange", tryLoad);
    return () => {
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
      return error ? { error: "Wrong PIN. Try again." } : {};
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
    await loadAll(session);
  }, [loadAll, session]);

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
    }),
    [loading, session, profile, couple, partner, signInWithPin, signOut, createCouple, joinCouple, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
