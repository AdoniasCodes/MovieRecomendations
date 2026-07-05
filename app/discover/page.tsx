"use client";

import { Browse } from "@/components/discover/Browse";
import { MoodQuiz } from "@/components/discover/MoodQuiz";
import { SwipeDeck } from "@/components/discover/SwipeDeck";
import { recommend } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import type { QuizAnswers, Scored } from "@/lib/types";
import { useCallback, useState } from "react";

type Phase = "quiz" | "deck";
type Tab = "browse" | "mood";

export default function DiscoverPage() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>("browse");
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
      setPhase("deck");
    },
    [store.votes, store.me.id]
  );

  const tabs = (
    <div className="mb-4 flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
      {(["browse", "mood"] as Tab[]).map((t) => (
        <button
          key={t}
          onClick={() => setTab(t)}
          className={`flex-1 rounded-xl py-2 text-sm font-semibold transition ${
            tab === t ? "bg-accent-gradient text-white shadow-glow" : "text-white/55 hover:text-white"
          }`}
        >
          {t === "browse" ? "Browse" : "Mood match"}
        </button>
      ))}
    </div>
  );

  if (tab === "browse") {
    return (
      <div className="pt-2">
        {tabs}
        <Browse />
      </div>
    );
  }

  // mood-match flow
  if (phase === "quiz")
    return (
      <div className="pt-2">
        {tabs}
        <MoodQuiz onDone={start} />
      </div>
    );
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
