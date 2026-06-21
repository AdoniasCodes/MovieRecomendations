"use client";

import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
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
  signInWithOtp: (email: string) => Promise<{ error?: string }>;
  verifyOtp: (email: string, token: string) => Promise<{ error?: string }>;
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

  const loadAll = useCallback(
    async (s: Session | null) => {
      if (!sb || !s) {
        setProfile(null);
        setCouple(null);
        setPartner(null);
        return;
      }
      const uid = s.user.id;
      const fallbackName = (s.user.email?.split("@")[0] ?? "You").replace(/^\w/, (c) => c.toUpperCase());
      // make sure a profile row exists
      await sb.rpc("ensure_profile", { p_name: fallbackName, p_emoji: "💞", p_color: "#DB2777" });

      const { data: me } = await sb.from("profiles").select("id,name,emoji,color").eq("id", uid).single();
      setProfile(me ?? null);

      const { data: mem } = await sb.from("couple_members").select("couple_id").eq("user_id", uid).maybeSingle();
      if (!mem) {
        setCouple(null);
        setPartner(null);
        return;
      }
      const { data: c } = await sb.from("couples").select("id,code").eq("id", mem.couple_id).maybeSingle();
      setCouple(c ?? null);

      const { data: others } = await sb
        .from("couple_members")
        .select("user_id")
        .eq("couple_id", mem.couple_id)
        .neq("user_id", uid);
      const otherId = others?.[0]?.user_id;
      if (otherId) {
        const { data: p } = await sb.from("profiles").select("id,name,emoji,color").eq("id", otherId).maybeSingle();
        setPartner(p ?? null);
      } else {
        setPartner(null);
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
    sb.auth.getSession().then(async ({ data }) => {
      if (!active) return;
      setSession(data.session);
      await loadAll(data.session);
      setLoading(false);
    });
    const { data: sub } = sb.auth.onAuthStateChange(async (_e, s) => {
      setSession(s);
      await loadAll(s);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [sb, loadAll]);

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

  const signInWithOtp = useCallback(
    async (email: string) => {
      if (!sb) return { error: "Supabase not configured" };
      const { error } = await sb.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
      return error ? { error: error.message } : {};
    },
    [sb]
  );
  const verifyOtp = useCallback(
    async (email: string, token: string) => {
      if (!sb) return { error: "Supabase not configured" };
      const { error } = await sb.auth.verifyOtp({ email, token: token.trim(), type: "email" });
      return error ? { error: error.message } : {};
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

  const refresh = useCallback(() => loadAll(session), [loadAll, session]);

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
      signInWithOtp,
      verifyOtp,
      signOut,
      createCouple,
      joinCouple,
      refresh,
    }),
    [loading, session, profile, couple, partner, signInWithOtp, verifyOtp, signOut, createCouple, joinCouple, refresh]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
