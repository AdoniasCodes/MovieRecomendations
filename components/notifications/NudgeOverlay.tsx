"use client";

// Full takeover when the partner nudges you: waving hand, rising hearts, the
// nudge text, and a one-tap "nudge back". Fires only for a FRESH incoming
// nudge (under 2 minutes old, like MatchOverlay's freshness gate) so hydrating
// history at boot can never replay old ones — but a nudge sent moments before
// opening the app still lands with full fanfare.
import { Poster } from "@/components/ui/Poster";
import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Notification } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

const HEARTS = Array.from({ length: 12 });
const FRESH_MS = 120_000;

export function NudgeOverlay() {
  const store = useStore();
  const [nudge, setNudge] = useState<Notification | null>(null);
  const [sentBack, setSentBack] = useState(false);
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    const nudges = store.notifications.filter((n) => n.type === "nudge");
    if (seen.current === null) {
      seen.current = new Set(nudges.map((n) => n.id));
      return;
    }
    const fresh = nudges.find(
      (n) =>
        !seen.current!.has(n.id) &&
        n.toId === store.me.id &&
        n.actorId !== store.me.id &&
        Date.now() - n.createdAt < FRESH_MS
    );
    for (const n of nudges) seen.current.add(n.id);
    if (fresh) {
      setNudge(fresh);
      setSentBack(false);
      try {
        navigator.vibrate?.([80, 40, 80, 40, 160]);
      } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [store.notifications, store.me.id]);

  // leaves on its own; tapping anywhere also dismisses
  useEffect(() => {
    if (!nudge) return;
    const t = setTimeout(() => setNudge(null), 9_000);
    return () => clearTimeout(t);
  }, [nudge]);

  const title = nudge?.titleId ? getTitle(nudge.titleId) : null;

  const nudgeBack = () => {
    if (!nudge || sentBack) return;
    setSentBack(true);
    if (nudge.titleId && title) {
      store.nudge(`${store.me.name}'s thinking about ${title.title} too 💘`, nudge.titleId);
    } else {
      store.nudge(`${store.me.name}'s thinking about you too 💘`);
    }
    try {
      navigator.vibrate?.(40);
    } catch {}
    setTimeout(() => setNudge(null), 1_200);
  };

  return (
    <AnimatePresence>
      {nudge && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setNudge(null)}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* rising hearts */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {HEARTS.map((_, i) => {
              const left = (i * 41 + 13) % 100;
              const delay = (i % 6) * 0.35;
              const size = 14 + ((i * 7) % 14);
              return (
                <motion.span
                  key={i}
                  className="absolute bottom-[-8%]"
                  style={{ left: `${left}%`, fontSize: size }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: "-110vh", opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 3.4 + (i % 4) * 0.5, delay, repeat: Infinity, ease: "easeIn" }}
                >
                  {i % 3 === 0 ? "💘" : i % 3 === 1 ? "💞" : "💗"}
                </motion.span>
              );
            })}
          </div>

          <motion.div
            className="relative z-10 w-full max-w-sm text-center"
            initial={{ scale: 0.8, y: 24 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              className="mx-auto origin-[70%_80%] text-7xl drop-shadow-[0_4px_24px_rgba(219,39,119,0.45)]"
              animate={{ rotate: [0, 24, -16, 24, -10, 0] }}
              transition={{ duration: 1.1, repeat: Infinity, repeatDelay: 0.5 }}
            >
              👋
            </motion.div>

            <motion.h2
              className="text-gradient mt-4 text-3xl font-black tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {store.partner.name} nudged you!
            </motion.h2>
            <p className="mt-2 text-sm text-white/75">{nudge.text}</p>

            {title && (
              <motion.div
                className="mx-auto mt-5 w-32"
                initial={{ rotate: -5, y: 12, opacity: 0 }}
                animate={{ rotate: 0, y: 0, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
              >
                <div className="rounded-2xl shadow-glow-magenta">
                  <Poster title={title} />
                </div>
                <p className="mt-2 text-sm font-bold">{title.title}</p>
              </motion.div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={nudgeBack}
                disabled={sentBack}
                className="w-full rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold text-white shadow-glow transition active:scale-95 disabled:opacity-80"
              >
                {sentBack ? "Nudged back 💘" : `Nudge ${store.partner.name} back 👋`}
              </button>
              <button
                onClick={() => setNudge(null)}
                className="w-full rounded-2xl py-2.5 text-xs font-semibold text-white/50"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
