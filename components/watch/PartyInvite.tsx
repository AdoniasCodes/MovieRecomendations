"use client";

import type { Title, User } from "@/lib/types";
import { motion } from "framer-motion";

// Small, non-blocking invite card for a partner-started (or rehydrated own)
// watch-along. It springs up above the bottom nav and stays until acted on —
// never a full-screen takeover, never a vanishing toast. `mine` = this is my
// own still-running session (came back to the app), so it reads as a resume.
export function PartyInvite({
  partner,
  title,
  mine = false,
  onJoin,
  onLater,
}: {
  partner: User;
  title: Title;
  mine?: boolean;
  onJoin: () => void;
  onLater: () => void;
}) {
  return (
    <motion.div
      className="fixed inset-x-0 bottom-24 z-30 mx-auto w-full max-w-md px-4"
      initial={{ y: 140, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <div className="glass-strong flex items-center gap-3 rounded-2xl p-3 shadow-card">
        <span
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl ring-2 ring-white/15"
          style={{ background: `${partner.color}55` }}
        >
          {partner.emoji}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm leading-snug text-white/90">
            {mine ? (
              <>
                Your watch-along of <span className="font-semibold">{title.title}</span> is still going 💞
              </>
            ) : (
              <>
                <span className="font-semibold">{partner.name}</span> started a watch-along of{" "}
                <span className="font-semibold">{title.title}</span> 💞
              </>
            )}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              onClick={onJoin}
              className="rounded-full bg-accent-gradient px-4 py-1.5 text-sm font-semibold text-white shadow-glow transition active:scale-95"
            >
              {mine ? "Resume 🍿" : "Join 🍿"}
            </button>
            <button
              onClick={onLater}
              className="rounded-full bg-white/[0.08] px-4 py-1.5 text-sm font-medium text-white/70 transition active:scale-95"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
