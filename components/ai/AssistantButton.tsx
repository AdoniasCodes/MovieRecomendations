"use client";

import { Poster } from "@/components/ui/Poster";
import type { AIResult, Pick } from "@/lib/ai";
import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { openTitleSheet } from "@/lib/title-sheet";
import { AnimatePresence, motion } from "framer-motion";
import { Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

const SUGGESTIONS = [
  "Something wholesome for us tonight",
  "A cerebral crime film, low on blood",
  "A Korean movie Hermi would love",
  "A dark thriller just for me",
];

interface Msg {
  role: "user" | "ai";
  text: string;
  picks?: Pick[];
  source?: "gemini" | "local";
}

export function AssistantButton() {
  const [open, setOpen] = useState(false);
  const { pendingMatch } = useStore();
  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: "ai",
      text: "Hey Panda 🐼 — tell me the mood and I'll find something you'll both love. Try one of these:",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const ask = async (text: string) => {
    if (!text.trim() || loading) return;
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: text, audience: "together" }),
      });
      const data: AIResult = await res.json();
      setMsgs((m) => [...m, { role: "ai", text: data.intro, picks: data.picks, source: data.source }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "Hmm, I couldn't think straight just now — try again?" }]);
    }
    setLoading(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-24 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-accent-gradient shadow-glow-magenta transition active:scale-90 ${
          pendingMatch ? "opacity-0" : "opacity-100"
        }`}
        aria-label="AI assistant"
      >
        <Sparkles className="h-6 w-6" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              className="glass-strong relative z-10 flex h-[78vh] w-full max-w-md flex-col rounded-t-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-gradient">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="text-sm font-bold leading-none">Amore AI</p>
                    <p className="text-[11px] text-white/45">Your couple&apos;s movie concierge</p>
                  </div>
                </div>
                <button onClick={() => setOpen(false)} className="glass flex h-8 w-8 items-center justify-center rounded-full">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-4 overflow-y-auto p-4">
                {msgs.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : ""}>
                    <div
                      className={
                        m.role === "user"
                          ? "max-w-[80%] rounded-2xl rounded-br-md bg-accent-gradient px-4 py-2.5 text-sm"
                          : "max-w-[88%] rounded-2xl rounded-bl-md bg-white/[0.06] px-4 py-2.5 text-sm text-white/85"
                      }
                    >
                      {m.text}
                      {m.picks && m.picks.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {m.picks.map((c, j) => {
                            const inApp = c.id ? getTitle(c.id) : null;
                            return inApp ? (
                              <button
                                key={j}
                                onClick={() => openTitleSheet(inApp.id)}
                                className="w-20 shrink-0 active:scale-95"
                              >
                                <Poster title={inApp} showMeta={false} rounded="rounded-lg" />
                                <p className="mt-1 truncate text-[10px] text-white/70">{inApp.title}</p>
                              </button>
                            ) : (
                              <div key={j} className="w-full rounded-xl bg-white/[0.05] px-3 py-2 text-xs text-white/80">
                                <span className="font-semibold">{c.title}</span>
                                {c.year ? <span className="text-white/40"> · {c.year}</span> : null}
                                <span className="block text-[10px] text-white/50">{c.reason}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                      {m.source && (
                        <p className="mt-2 text-[10px] text-white/30">
                          {m.source === "gemini" ? "✨ AI-powered (Gemini)" : "from your local engine"}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex items-center gap-1.5 px-1 text-white/50">
                    <Dot /> <Dot /> <Dot />
                  </div>
                )}

                {msgs.length <= 1 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} onClick={() => ask(s)} className="chip text-xs hover:bg-white/[0.08]">
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 border-t border-white/10 p-3">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && ask(input)}
                  placeholder="Ask for anything…"
                  className="flex-1 rounded-full bg-white/[0.06] px-4 py-3 text-sm outline-none placeholder:text-white/35 focus:bg-white/[0.1]"
                />
                <button
                  onClick={() => ask(input)}
                  disabled={loading}
                  className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-gradient active:scale-90 disabled:opacity-50"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Dot() {
  return (
    <motion.span
      className="h-2 w-2 rounded-full bg-white/40"
      animate={{ opacity: [0.3, 1, 0.3] }}
      transition={{ duration: 1, repeat: Infinity }}
    />
  );
}
