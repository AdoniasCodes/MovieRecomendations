"use client";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { getTitle } from "@/lib/mock-data";
import { scoreTitle } from "@/lib/recommend";
import type { AIResult } from "@/lib/ai";
import type { Audience } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { closeTitleSheet, openTitleSheet, useOpenTitleId } from "@/lib/title-sheet";
import type { Watcher, WatchStatus } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell, Bookmark, Check, Clapperboard, Eye, MessageCirclePlus, Sparkles, Star,
  ThumbsDown, ThumbsUp, Wand2, X,
} from "lucide-react";
import { useState } from "react";

const STATUSES: WatchStatus[] = ["planning", "watching", "paused", "finished", "dropped"];
const AUDIENCES: { key: Audience; label: string }[] = [
  { key: "together", label: "💞 For us" },
  { key: "me", label: "🐼 Me" },
  { key: "her", label: "💞 Her" },
];

export function TitleSheetHost() {
  const id = useOpenTitleId();
  const title = id ? getTitle(id) : null;

  return (
    <AnimatePresence>
      {title && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={closeTitleSheet} />
          <motion.div
            className="glass-strong relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-3xl sm:rounded-3xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 280, damping: 30 }}
          >
            <Body key={title.id} titleId={title.id} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Body({ titleId }: { titleId: string }) {
  const t = getTitle(titleId)!;
  const store = useStore();
  const saved = store.isSaved(t.id);
  const matched = store.isMatched(t.id);
  const cinema = store.isCinema(t.id);
  const myVote = store.myVote(t.id);
  const myRating = store.ratings[t.id];
  const status = store.watchlist.find((w) => w.titleId === t.id)?.status;
  const watchers = store.watchersOf(t.id);
  const herRecord = store.watchedRecord(t.id, "her");
  const notes = store.notesFor(t.id);
  const why = scoreTitle(t, { context: "together", era: "any", vibe: t.vibes[0] }).why;

  const [aud, setAud] = useState<Audience>("together");
  const [sim, setSim] = useState<AIResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [noteText, setNoteText] = useState("");

  async function loadSimilar(audience: Audience) {
    setSimLoading(true);
    try {
      const res = await fetch("/api/similar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ titleId: t.id, audience }),
      });
      setSim(await res.json());
    } catch {
      setSim({ source: "local", intro: "Couldn't reach AI — try again.", picks: [] });
    }
    setSimLoading(false);
  }

  return (
    <div>
      {/* backdrop header */}
      <div className="relative h-44" style={{ background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})` }}>
        <div className="absolute inset-0 bg-gradient-to-t from-[#16161c] via-transparent to-transparent" />
        <button
          onClick={closeTitleSheet}
          className="glass absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="absolute left-4 top-4 flex gap-2">
          {matched && (
            <span className="rounded-full bg-accent-gradient px-3 py-1 text-xs font-bold shadow-glow">💞 Matched</span>
          )}
          {t.international && (
            <span className="glass rounded-full px-2.5 py-1 text-xs font-medium">🌍 {t.country}</span>
          )}
        </div>
        <div className="absolute -bottom-1 left-4 right-4">
          <h2 className="text-2xl font-black leading-tight drop-shadow">{t.title}</h2>
          <p className="text-sm text-white/60">
            {t.year} · {t.mediaType === "tv" ? `${t.seasons} seasons` : `${t.runtime} min`} · {t.genres.join(" / ")}
          </p>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* badges */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge>
            <Star className="h-3.5 w-3.5 fill-amber-300 text-amber-300" /> {t.voteAverage.toFixed(1)} TMDB
          </Badge>
          <Badge>{violenceLabel(t.violence)}</Badge>
          {t.cerebral && <Badge>🧠 Cerebral</Badge>}
          {t.hiddenGem && <Badge>💎 Hidden gem</Badge>}
          {t.classic && <Badge>🏛️ Classic</Badge>}
          {myRating != null && <Badge>🐼 You · {myRating}/10</Badge>}
          {herRecord?.rating != null && <Badge>💞 Amore · {herRecord.rating}/10</Badge>}
        </div>

        {/* why */}
        <div className="rounded-2xl border border-accent/30 bg-accent-soft p-3">
          <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-accent-glow">
            <Sparkles className="h-3.5 w-3.5" /> Why this
          </div>
          <p className="text-sm leading-relaxed text-white/85">{why}</p>
        </div>

        <p className="text-sm leading-relaxed text-white/70">{t.overview}</p>

        <div>
          <p className="mb-1 text-xs uppercase tracking-wider text-white/40">Cast</p>
          <p className="text-sm text-white/80">{t.cast.join(" · ")}</p>
        </div>

        {/* vote + save row */}
        <div className="grid grid-cols-3 gap-2">
          <Action
            active={myVote === "like" || myVote === "love"}
            onClick={() => store.vote(t.id, "love", "together")}
            icon={<ThumbsUp className="h-5 w-5" />}
            label="Like"
          />
          <Action
            active={saved}
            onClick={() => store.toggleSave(t.id)}
            icon={<Bookmark className={cn("h-5 w-5", saved && "fill-current")} />}
            label={saved ? "Saved" : "Save"}
          />
          <Action
            active={myVote === "pass"}
            onClick={() => store.vote(t.id, "pass", "together")}
            icon={<ThumbsDown className="h-5 w-5" />}
            label="Pass"
          />
        </div>

        {/* cinema + nudge row */}
        <div className="grid grid-cols-2 gap-2">
          <Action
            active={cinema}
            onClick={() => store.toggleCinema(t.id)}
            icon={<Clapperboard className="h-5 w-5" />}
            label={cinema ? "On cinema list" : "Watch in cinema"}
          />
          <Action
            onClick={() => store.nudge(`Panda's thinking about ${t.title} 👀`, t.id)}
            icon={<Bell className="h-5 w-5" />}
            label="Nudge Amore"
          />
        </div>

        {/* watched by */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Watched by</p>
          <div className="flex gap-2">
            <WatchedToggle who="me" emoji="🐼" name="Me" on={watchers.includes("me")} store={store} id={t.id} />
            <WatchedToggle who="her" emoji="💞" name="Amore" on={watchers.includes("her")} store={store} id={t.id} />
          </div>
        </div>

        {/* status */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Set status</p>
          <div className="flex flex-wrap gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => store.setStatus(t.id, s)}
                className={cn("chip capitalize", status === s && "chip-active")}
              >
                {status === s && <Check className="mr-1 inline h-3 w-3" />}
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* rating */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Your rating</p>
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => {
              const val = (i + 1) * 2;
              const on = (myRating ?? 0) >= val;
              return (
                <button key={i} onClick={() => store.rate(t.id, val)} className="active:scale-90">
                  <Star className={cn("h-7 w-7", on ? "fill-amber-300 text-amber-300" : "text-white/25")} />
                </button>
              );
            })}
          </div>
        </div>

        {/* notes */}
        <div>
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Notes</p>
          <div className="space-y-2">
            {notes.map((n) => (
              <div key={n.id} className="flex items-start gap-2 rounded-2xl bg-white/[0.05] p-3">
                <span className="text-base leading-none">{n.authorId === store.me.id ? store.me.emoji : store.partner.emoji}</span>
                <p className="flex-1 text-sm text-white/85">{n.text}</p>
                {n.authorId === store.me.id && (
                  <button onClick={() => store.deleteNote(n.id)} className="text-white/30 hover:text-white/60">
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
            <div className="flex items-center gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && noteText.trim()) {
                    store.addNote(t.id, noteText.trim());
                    setNoteText("");
                  }
                }}
                placeholder="Leave a note — “rewatch”, “check this out”…"
                className="flex-1 rounded-full bg-white/[0.06] px-4 py-2.5 text-sm outline-none placeholder:text-white/35 focus:bg-white/[0.1]"
              />
              <button
                onClick={() => {
                  if (!noteText.trim()) return;
                  store.addNote(t.id, noteText.trim());
                  setNoteText("");
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent-gradient active:scale-90"
              >
                <MessageCirclePlus className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* similar movies */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-accent-glow">
              <Wand2 className="h-3.5 w-3.5" /> Similar movies
            </span>
            <div className="flex gap-1">
              {AUDIENCES.map((x) => (
                <button
                  key={x.key}
                  onClick={() => setAud(x.key)}
                  className={cn("rounded-full px-2 py-0.5 text-[10px]", aud === x.key ? "bg-accent-gradient" : "bg-white/[0.06] text-white/60")}
                >
                  {x.label}
                </button>
              ))}
            </div>
          </div>

          {!sim && (
            <button
              onClick={() => loadSimilar(aud)}
              disabled={simLoading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-white/[0.06] py-2.5 text-sm font-medium transition hover:bg-white/[0.1] disabled:opacity-50"
            >
              {simLoading ? "Finding picks…" : `Find more like ${t.title}`}
            </button>
          )}

          {sim && (
            <div className="space-y-3">
              <p className="text-sm text-white/80">{sim.intro}</p>
              <div className="flex flex-wrap gap-2">
                {sim.picks.map((p, i) =>
                  p.id ? (
                    <button
                      key={i}
                      onClick={() => openTitleSheet(p.id!)}
                      className="rounded-xl bg-accent-soft px-3 py-1.5 text-left text-xs font-medium text-white/90 active:scale-95"
                    >
                      {p.title}
                      <span className="block text-[10px] font-normal text-white/55">{p.reason}</span>
                    </button>
                  ) : (
                    <div key={i} className="rounded-xl bg-white/[0.05] px-3 py-1.5 text-left text-xs text-white/80">
                      {p.title} {p.year ? `(${p.year})` : ""}
                      <span className="block text-[10px] text-white/50">{p.reason}</span>
                    </div>
                  )
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-white/35">
                  {sim.source === "gemini" ? "✨ AI-powered (Gemini)" : "from your local engine"}
                </span>
                <button onClick={() => loadSimilar(aud)} className="text-[10px] text-accent-glow">
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>

        <Button variant="glass" className="w-full" onClick={closeTitleSheet}>
          Done
        </Button>
      </div>
    </div>
  );
}

function WatchedToggle({
  who, emoji, name, on, store, id,
}: {
  who: Watcher;
  emoji: string;
  name: string;
  on: boolean;
  store: ReturnType<typeof useStore>;
  id: string;
}) {
  return (
    <button
      onClick={() => (on ? store.unwatch(id, who) : store.markWatched(id, who))}
      className={cn(
        "flex flex-1 items-center justify-center gap-1.5 rounded-2xl border py-2.5 text-sm font-medium transition active:scale-95",
        on
          ? "border-transparent bg-accent-gradient text-white shadow-glow"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
      )}
    >
      {on ? <Eye className="h-4 w-4" /> : <span className="text-base leading-none">{emoji}</span>}
      {name}
      {on && <Check className="h-3.5 w-3.5" />}
    </button>
  );
}

function violenceLabel(v: number): string {
  if (v <= 0) return "🕊️ No gore";
  if (v <= 1) return "🌿 Gentle";
  if (v <= 2) return "🩹 Mild";
  if (v <= 3) return "⚔️ Some violence";
  if (v <= 4) return "🩸 Gory";
  return "🩸🩸 Brutal";
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium text-white/80">
      {children}
    </span>
  );
}

function Action({
  icon, label, active, onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 rounded-2xl border py-3 text-xs font-medium transition active:scale-95",
        active
          ? "border-transparent bg-accent-gradient text-white shadow-glow"
          : "border-white/10 bg-white/[0.04] text-white/70 hover:bg-white/[0.08]"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
