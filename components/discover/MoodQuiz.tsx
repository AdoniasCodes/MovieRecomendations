"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  COMMITMENTS,
  CONTEXTS,
  ENERGIES,
  ERAS,
  FEELINGS,
  VIBES,
} from "@/lib/quiz-options";
import type { QuizAnswers } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

type StepKey = "feeling" | "context" | "vibe" | "era" | "commitment" | "energy";
const ORDER: StepKey[] = ["feeling", "context", "vibe", "era", "commitment", "energy"];

const TITLES: Record<StepKey, string> = {
  feeling: "How are you feeling?",
  context: "Who's watching?",
  vibe: "What vibe tonight?",
  era: "Which era?",
  commitment: "How much commitment?",
  energy: "Energy level?",
};

export function MoodQuiz({ onDone }: { onDone: (a: QuizAnswers) => void }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({ context: "together", era: "any" });
  const key = ORDER[step];

  const pick = (patch: Partial<QuizAnswers>) => {
    const next = { ...answers, ...patch };
    setAnswers(next);
    if (step === ORDER.length - 1) onDone(next);
    else setStep(step + 1);
  };

  return (
    <div className="flex min-h-[80vh] flex-col">
      {/* header */}
      <div className="mb-6 flex items-center gap-3">
        {step > 0 ? (
          <button
            onClick={() => setStep(step - 1)}
            className="glass flex h-9 w-9 items-center justify-center rounded-full"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-9 w-9" />
        )}
        <div className="flex flex-1 gap-1.5">
          {ORDER.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1 flex-1 rounded-full transition-all",
                i <= step ? "bg-accent-gradient" : "bg-white/10"
              )}
            />
          ))}
        </div>
        <button onClick={() => onDone(answers)} className="text-xs font-medium text-white/40">
          Skip
        </button>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={key}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25 }}
          className="flex-1"
        >
          <h1 className="mb-1 text-3xl font-black tracking-tight">{TITLES[key]}</h1>
          <p className="mb-6 text-sm text-white/45">
            {key === "context"
              ? "Together mode fires live matches."
              : "Tap one — there's no wrong answer."}
          </p>

          {key === "feeling" && (
            <Grid>
              {FEELINGS.map((f) => (
                <Card key={f.value} emoji={f.emoji} label={f.label} onClick={() => pick({ feeling: f.value })} />
              ))}
            </Grid>
          )}

          {key === "context" && (
            <div className="grid gap-3">
              {CONTEXTS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => pick({ context: c.value })}
                  className="glass flex items-center gap-4 rounded-2xl p-5 text-left transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <span className="text-3xl">{c.emoji}</span>
                  <span>
                    <span className="block text-lg font-bold">{c.label}</span>
                    <span className="block text-sm text-white/50">{c.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {key === "vibe" && (
            <Grid>
              {VIBES.map((v) => (
                <Card key={v.value} emoji={v.emoji} label={v.label} onClick={() => pick({ vibe: v.value })} />
              ))}
            </Grid>
          )}

          {key === "era" && (
            <div className="flex flex-wrap gap-2.5">
              {ERAS.map((e) => (
                <button
                  key={e.value}
                  onClick={() => pick({ era: e.value })}
                  className="chip px-5 py-3 text-base hover:bg-white/[0.08]"
                >
                  {e.label}
                </button>
              ))}
            </div>
          )}

          {key === "commitment" && (
            <Grid>
              {COMMITMENTS.map((c) => (
                <Card key={c.value} emoji={c.emoji} label={c.label} onClick={() => pick({ commitment: c.value })} />
              ))}
            </Grid>
          )}

          {key === "energy" && (
            <div className="grid gap-3">
              {ENERGIES.map((en) => (
                <button
                  key={en.value}
                  onClick={() => pick({ energy: en.value })}
                  className="glass flex items-center gap-4 rounded-2xl p-5 text-left transition hover:bg-white/[0.08] active:scale-[0.98]"
                >
                  <span className="text-3xl">{en.emoji}</span>
                  <span>
                    <span className="block text-lg font-bold">{en.label}</span>
                    <span className="block text-sm text-white/50">{en.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {key === "context" && (
        <Button variant="ghost" className="mt-4" onClick={() => onDone(answers)}>
          Just surprise us →
        </Button>
      )}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

function Card({ emoji, label, onClick }: { emoji: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass flex flex-col items-start gap-2 rounded-2xl p-4 text-left transition hover:border-accent/40 hover:bg-white/[0.08] active:scale-[0.97]"
    >
      <span className="text-2xl">{emoji}</span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  );
}
