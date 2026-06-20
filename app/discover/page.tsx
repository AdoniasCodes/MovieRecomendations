"use client";

import { MoodQuiz } from "@/components/discover/MoodQuiz";
import { SwipeDeck } from "@/components/discover/SwipeDeck";
import { recommend } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import type { QuizAnswers, Scored } from "@/lib/types";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";

type Phase = "quiz" | "loading" | "deck";

export default function DiscoverPage() {
  const store = useStore();
  const [phase, setPhase] = useState<Phase>("quiz");
  const [cards, setCards] = useState<Scored[]>([]);
  const [context, setContext] = useState<QuizAnswers["context"]>("together");

  const start = useCallback(
    (a: QuizAnswers) => {
      setContext(a.context);
      const seen = new Set(store.votes.filter((v) => v.userId === store.me.id).map((v) => v.titleId));
      const recs = recommend(a, {
        excludeIds: seen,
        preferHiddenGems: a.vibe === "mysterious" || a.feeling === "curious",
        preferClassics: a.era === "70s" || a.era === "80s" || a.era === "90s",
      });
      setCards(recs);
      setPhase("loading");
      setTimeout(() => setPhase("deck"), 1400);
    },
    [store.votes, store.me.id]
  );

  if (phase === "quiz") return <MoodQuiz onDone={start} />;
  if (phase === "loading") return <Loader />;

  return (
    <div className="pt-2">
      <button
        onClick={() => setPhase("quiz")}
        className="mb-3 text-xs font-medium text-white/40 hover:text-white/70"
      >
        ← Change mood
      </button>
      <SwipeDeck cards={cards} context={context} onEmpty={() => setPhase("quiz")} />
    </div>
  );
}

function Loader() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center">
      <div className="relative h-32 w-24">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-2xl border border-white/10 bg-accent-soft backdrop-blur"
            animate={{
              y: [0, -10, 0],
              rotate: [(i - 1) * 6, (i - 1) * 10, (i - 1) * 6],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.15 }}
            style={{ zIndex: 3 - i }}
          />
        ))}
      </div>
      <motion.p
        className="mt-8 text-lg font-semibold text-gradient"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        Finding your picks…
      </motion.p>
      <p className="mt-1 text-sm text-white/40">Reading the mood, matching your taste</p>
    </div>
  );
}
