"use client";

import { PinLogin } from "@/components/auth/PinLogin";
import { useAuth } from "@/lib/auth";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// Full-screen welcome splash shown on load. "Get in" → pick-who-you-are + PIN.
export function WelcomeGate() {
  const auth = useAuth();
  const [entered, setEntered] = useState(false);
  const [phase, setPhase] = useState<"splash" | "login">("splash");

  // once they sign in from the login phase, drop them into the app
  useEffect(() => {
    if (phase === "login" && auth.session) setEntered(true);
  }, [phase, auth.session]);

  if (entered) return null;

  const getIn = () => {
    // already signed in (persisted session)? straight in. otherwise → login.
    if (auth.session) setEntered(true);
    else setPhase("login");
  };

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-black">
      {/* couple photo */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/couple.jpg"
        alt="Panda & Hermi"
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
          phase === "login" ? "scale-110 opacity-25 blur-sm" : "opacity-100"
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
              onClick={getIn}
              className="w-full max-w-xs rounded-2xl bg-accent-gradient py-4 text-base font-bold text-white shadow-glow transition active:scale-95"
            >
              Get in 💞
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
              <PinLogin />
            </div>
            <button
              onClick={() => setEntered(true)}
              className="text-xs text-white/45 hover:text-white/70"
            >
              Just browse for now →
            </button>
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
