"use client";

import { Button } from "@/components/ui/Button";
import { Poster } from "@/components/ui/Poster";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { Heart } from "lucide-react";

const CONFETTI = Array.from({ length: 28 });
const COLORS = ["#7C3AED", "#DB2777", "#A855F7", "#F472B6", "#FBBF24"];

export function MatchOverlay() {
  const { pendingMatch, clearMatch, me, partner } = useStore();

  return (
    <AnimatePresence>
      {pendingMatch && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={clearMatch}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

          {/* confetti */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {CONFETTI.map((_, i) => {
              const left = (i * 37) % 100;
              const delay = (i % 7) * 0.06;
              const color = COLORS[i % COLORS.length];
              return (
                <motion.span
                  key={i}
                  className="absolute top-[-10%] h-2.5 w-2.5 rounded-sm"
                  style={{ left: `${left}%`, background: color }}
                  initial={{ y: -40, opacity: 0, rotate: 0 }}
                  animate={{ y: "110vh", opacity: [0, 1, 1, 0], rotate: 360 }}
                  transition={{ duration: 2.2 + (i % 5) * 0.3, delay, ease: "easeIn" }}
                />
              );
            })}
          </div>

          <motion.div
            className="relative z-10 w-full max-w-sm text-center"
            initial={{ scale: 0.8, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-center gap-3">
              <Avatar emoji={me.emoji} color={me.color} />
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300 }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-gradient shadow-glow-magenta"
              >
                <Heart className="h-5 w-5 fill-white text-white" />
              </motion.div>
              <Avatar emoji={partner.emoji} color={partner.color} />
            </div>

            <motion.h2
              className="text-gradient text-4xl font-black tracking-tight"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              IT&apos;S A MATCH!
            </motion.h2>
            <p className="mt-1 text-sm text-white/60">You both want to watch this.</p>

            <motion.div
              className="mx-auto mt-6 w-44"
              initial={{ rotate: -6, y: 14, opacity: 0 }}
              animate={{ rotate: 0, y: 0, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 200, damping: 16 }}
            >
              <div className="shadow-glow-magenta rounded-2xl">
                <Poster title={pendingMatch} />
              </div>
              <p className="mt-3 text-lg font-bold">{pendingMatch.title}</p>
              <p className="text-xs text-white/50">
                Added to your Matches & tonight&apos;s shortlist
              </p>
            </motion.div>

            <div className="mt-6 flex flex-col gap-2">
              <Button onClick={clearMatch}>Add to tonight 🍿</Button>
              <Button variant="ghost" onClick={clearMatch}>
                Keep swiping
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Avatar({ emoji, color }: { emoji: string; color: string }) {
  return (
    <div
      className="flex h-12 w-12 items-center justify-center rounded-full text-xl ring-2 ring-white/20"
      style={{ background: `${color}33` }}
    >
      {emoji}
    </div>
  );
}
