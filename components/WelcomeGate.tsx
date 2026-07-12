"use client";

import { IdentityPicker, PinPad } from "@/components/auth/PinLogin";
import { getLastActivity, touchActivity } from "@/lib/activity";
import { useAuth } from "@/lib/auth";
import { setWhoami } from "@/lib/identity";
import { PIN_IDENTITIES, type PinIdentity } from "@/lib/pin-accounts";
import { getSupabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";

const IDLE_MS = 3_600_000; // re-lock after 1h idle

type Phase = "splash" | "pick" | "pin";

// Full-screen welcome. The Panda/Hermi picker shows on EVERY app open; PIN only
// when there's no valid session for the picked identity. Re-locks after long idle.
export function WelcomeGate() {
  const auth = useAuth();
  const [entered, setEntered] = useState(false);
  const [phase, setPhase] = useState<Phase>("splash");
  const [who, setWho] = useState<PinIdentity | null>(null);

  // DISPLAY identity follows the real session (session is the source of truth)
  useEffect(() => {
    const email = auth.session?.user.email;
    if (!email) return;
    const match = PIN_IDENTITIES.find((p) => p.email === email);
    if (match) setWhoami(match.key);
  }, [auth.session]);

  // SOFT GATE: a signed-in known identity that was active under an hour ago
  // walks straight in. Splash + picker only appear on first open, after
  // sign-out, or after a long idle. A missing activity stamp means "unknown,
  // not idle-forever": stamp now so it can never instant-relock.
  useEffect(() => {
    if (getLastActivity() === 0) touchActivity();
    if (auth.loading) return; // decide only once the session is known
    const email = auth.session?.user.email;
    const known = email ? PIN_IDENTITIES.find((p) => p.email === email) : undefined;
    if (known && Date.now() - getLastActivity() < IDLE_MS) {
      setWhoami(known.key);
      touchActivity();
      setEntered(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.loading, auth.session]);

  // pick who you are → straight in, or PIN when a fresh sign-in is needed
  const pick = useCallback(
    async (id: PinIdentity) => {
      setWhoami(id.key);
      setWho(id);
      const email = auth.session?.user.email;
      if (email === id.email) {
        setEntered(true); // already signed in as this identity → no PIN
        return;
      }
      if (!auth.configured || !getSupabase()) {
        setEntered(true); // demo mode (no Supabase) → enter directly
        return;
      }
      if (auth.session && email !== id.email) {
        await auth.signOut(); // signed in as the other identity → sign out first
      }
      setPhase("pin");
    },
    [auth]
  );

  // reconcile the PIN phase with a late-arriving session (loading race / persist)
  useEffect(() => {
    if (phase !== "pin" || !who) return;
    const email = auth.session?.user.email;
    if (email === who.email) setEntered(true);
    else if (email && email !== who.email) auth.signOut();
  }, [phase, who, auth]);

  // idle re-lock: back to the picker after a long idle (identity stays remembered)
  useEffect(() => {
    if (!entered) return;
    const check = () => {
      if (Date.now() - getLastActivity() > IDLE_MS) {
        setEntered(false);
        setPhase("pick");
      }
    };
    const iv = setInterval(check, 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") check();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(iv);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [entered]);

  // Escape hatch: a stalled boot must never pin the splash. After 5s the
  // button unlocks even if auth is still warming up (PIN flow handles the rest).
  const [waitedTooLong, setWaitedTooLong] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaitedTooLong(true), 5000);
    return () => clearTimeout(t);
  }, []);
  const booting = auth.loading && !waitedTooLong;

  if (entered) return null;

  // While auth resolves, hold a neutral black screen instead of flashing the
  // splash: the common case (fresh session + recent activity) enters directly
  // via the soft gate. The 5s escape hatch still forces the splash on a hung boot.
  if (booting) return <div className="fixed inset-0 z-[100] bg-black" />;

  const showLogin = phase !== "splash";

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      {/* couple photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/couple.jpg"
        alt="Panda & Hermi"
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
          showLogin ? "scale-110 opacity-25 blur-sm" : "opacity-100"
        }`}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/90" />

      <AnimatePresence mode="wait">
        {phase === "splash" ? (
          <motion.div
            key="splash"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex h-full flex-col items-center justify-between px-6 py-14 text-center"
          >
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="pt-4"
            >
              <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/70">
                Welcome to
              </p>
              <h1 className="mt-2 text-5xl font-black tracking-tight text-white drop-shadow-[0_2px_20px_rgba(0,0,0,0.6)]">
                Amore <span className="text-gradient">Movies</span>
              </h1>
              <p className="mt-3 text-sm text-white/75">Made for Panda &amp; Hermi 💞</p>
            </motion.div>

            <motion.button
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              onClick={() => setPhase("pick")}
              disabled={booting}
              className="w-full max-w-xs rounded-2xl bg-accent-gradient py-4 text-base font-bold text-white shadow-glow transition active:scale-95 disabled:opacity-60"
            >
              {booting ? "Warming up…" : "Get in 💞"}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="login"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative flex h-full flex-col items-center justify-center gap-4 px-6"
          >
            <div className="w-full max-w-sm">
              {phase === "pin" && who ? (
                <PinPad
                  who={who}
                  onSuccess={() => setEntered(true)}
                  onBack={() => { setWho(null); setPhase("pick"); }}
                />
              ) : (
                <IdentityPicker onPick={pick} />
              )}
            </div>
            <button
              onClick={() => setPhase("splash")}
              className="text-[11px] text-white/30 hover:text-white/60"
            >
              ← back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
