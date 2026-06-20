"use client";

import { Poster } from "@/components/ui/Poster";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { openTitleSheet } from "@/lib/title-sheet";
import type { Context, Scored } from "@/lib/types";
import {
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from "framer-motion";
import { Bookmark, Eye, RotateCcw, Sparkles, ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";

const THRESHOLD = 110;

export function SwipeDeck({
  cards,
  context,
  onEmpty,
}: {
  cards: Scored[];
  context: Context;
  onEmpty: () => void;
}) {
  const store = useStore();
  const [index, setIndex] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [40, 140], [0, 1]);
  const passOpacity = useTransform(x, [-140, -40], [1, 0]);

  const top = cards[index];
  const remaining = cards.length - index;

  const advance = () => {
    setHistory((h) => [...h, index]);
    setIndex((i) => i + 1);
    x.set(0);
  };

  const act = (kind: "like" | "pass" | "save" | "seen") => {
    if (!top) return;
    if (kind === "save") store.save(top.title.id);
    else if (kind === "seen") store.vote(top.title.id, "seen", context);
    else store.vote(top.title.id, kind === "like" ? "love" : "pass", context);
    advance();
  };

  const undo = () => {
    if (!history.length) return;
    const prev = history[history.length - 1];
    setHistory((h) => h.slice(0, -1));
    setIndex(prev);
    x.set(0);
  };

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x > THRESHOLD) act("like");
    else if (info.offset.x < -THRESHOLD) act("pass");
    else x.set(0);
  };

  if (!top) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
        <div className="text-5xl">🎉</div>
        <h3 className="mt-4 text-xl font-bold">That&apos;s the whole deck</h3>
        <p className="mt-1 max-w-xs text-sm text-white/50">
          Check your Watchlist & Matches, or run discovery again for a fresh mood.
        </p>
        <button onClick={onEmpty} className="chip chip-active mt-5">
          New discovery
        </button>
      </div>
    );
  }

  return (
    <div className="select-none">
      {/* deck */}
      <div className="relative mx-auto h-[58vh] max-h-[520px] w-full max-w-[330px]">
        {cards
          .slice(index, index + 3)
          .map((card, i) => {
            const isTop = i === 0;
            return (
              <motion.div
                key={card.title.id}
                className="absolute inset-0"
                style={isTop ? { x, rotate, zIndex: 30 } : { zIndex: 20 - i }}
                initial={false}
                animate={
                  isTop
                    ? { scale: 1, y: 0 }
                    : { scale: 1 - i * 0.05, y: i * 14, opacity: 1 - i * 0.15 }
                }
                drag={isTop ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.7}
                onDragEnd={isTop ? onDragEnd : undefined}
                whileTap={isTop ? { cursor: "grabbing" } : undefined}
              >
                <div className="relative h-full overflow-hidden rounded-3xl shadow-card">
                  <Poster title={card.title} showMeta={false} rounded="rounded-3xl" className="h-full" />

                  {/* like / pass stamps */}
                  {isTop && (
                    <>
                      <motion.div
                        style={{ opacity: likeOpacity }}
                        className="absolute left-5 top-6 rotate-[-14deg] rounded-xl border-4 border-emerald-400 px-3 py-1 text-2xl font-black text-emerald-400"
                      >
                        LIKE
                      </motion.div>
                      <motion.div
                        style={{ opacity: passOpacity }}
                        className="absolute right-5 top-6 rotate-[14deg] rounded-xl border-4 border-rose-500 px-3 py-1 text-2xl font-black text-rose-500"
                      >
                        PASS
                      </motion.div>
                    </>
                  )}

                  {/* info */}
                  <button
                    onClick={() => isTop && openTitleSheet(card.title.id)}
                    className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent p-4 pt-12 text-left"
                  >
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-black">{card.title.title}</h3>
                      <span className="text-sm text-white/50">{card.title.year}</span>
                    </div>
                    <p className="mb-1.5 text-xs text-white/55">
                      {card.title.mediaType === "tv"
                        ? `${card.title.seasons} seasons`
                        : `${card.title.runtime} min`}{" "}
                      · {card.title.genres.join(" / ")} · ⭐ {card.title.voteAverage.toFixed(1)}
                    </p>
                    <p className="flex items-start gap-1.5 text-xs leading-relaxed text-accent-glow">
                      <Sparkles className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="text-white/75">{card.why}</span>
                    </p>
                    <span className="mt-1 block text-[10px] text-white/35">Tap for details</span>
                  </button>
                </div>
              </motion.div>
            );
          })
          .reverse()}
      </div>

      {/* counter */}
      <p className="mt-3 text-center text-xs text-white/35">
        {remaining} {remaining === 1 ? "pick" : "picks"} left{" "}
        {context === "together" && "· 💞 Together mode"}
      </p>

      {/* controls */}
      <div className="mt-3 flex items-center justify-center gap-3">
        <Ctrl onClick={undo} disabled={!history.length} className="h-12 w-12 text-white/60" title="Undo">
          <RotateCcw className="h-5 w-5" />
        </Ctrl>
        <Ctrl onClick={() => act("pass")} className="h-16 w-16 text-rose-400" title="Pass">
          <ThumbsDown className="h-7 w-7" />
        </Ctrl>
        <Ctrl onClick={() => act("save")} className="h-12 w-12 text-sky-300" title="Save">
          <Bookmark className="h-5 w-5" />
        </Ctrl>
        <Ctrl onClick={() => act("seen")} className="h-12 w-12 text-amber-300" title="Seen it">
          <Eye className="h-5 w-5" />
        </Ctrl>
        <Ctrl
          onClick={() => act("like")}
          className="h-16 w-16 bg-accent-gradient !text-white shadow-glow"
          title="Like"
        >
          <ThumbsUp className="h-7 w-7" />
        </Ctrl>
      </div>
    </div>
  );
}

function Ctrl({
  children,
  onClick,
  disabled,
  className,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        "flex items-center justify-center rounded-full border border-white/10 bg-white/[0.05] backdrop-blur transition hover:bg-white/[0.1] active:scale-90 disabled:opacity-30",
        className
      )}
    >
      {children}
    </button>
  );
}
