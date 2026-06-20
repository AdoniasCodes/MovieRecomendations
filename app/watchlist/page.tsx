"use client";

import { PosterCard } from "@/components/ui/PosterCard";
import { cn } from "@/lib/cn";
import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Title, Watcher, WatchStatus } from "@/lib/types";
import Link from "next/link";
import { useMemo, useState } from "react";

type Filter = "matches" | "all" | "cinema" | "watched" | "planning" | "watching" | "finished";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "matches", label: "💞 Matches" },
  { key: "all", label: "🍿 Saved" },
  { key: "cinema", label: "🎬 Cinema" },
  { key: "watched", label: "✅ Watched" },
  { key: "planning", label: "Planning" },
  { key: "watching", label: "Watching" },
  { key: "finished", label: "Finished" },
];

const WHO: { key: Watcher | "both"; label: string }[] = [
  { key: "both", label: "Both of us" },
  { key: "me", label: "🐼 Me" },
  { key: "her", label: "💞 Amore" },
];

export default function WatchlistPage() {
  const store = useStore();
  const [filter, setFilter] = useState<Filter>("matches");
  const [who, setWho] = useState<Watcher | "both">("both");

  const matchTitles = useMemo(
    () => store.matches.map((m) => getTitle(m.titleId)).filter(Boolean) as Title[],
    [store.matches]
  );

  // who watched a title, for the rewatch browser
  const watchedItems = useMemo(() => {
    const ids = new Map<string, Watcher[]>();
    store.watched.forEach((w) => {
      const arr = ids.get(w.titleId) ?? [];
      arr.push(w.watcher);
      ids.set(w.titleId, arr);
    });
    return [...ids.entries()]
      .filter(([, ws]) => (who === "both" ? true : ws.includes(who)))
      .map(([id, ws]) => ({ title: getTitle(id), ws }))
      .filter((x) => x.title) as { title: Title; ws: Watcher[] }[];
  }, [store.watched, who]);

  const items = useMemo(() => {
    if (filter === "matches")
      return matchTitles.map((t) => ({ title: t, status: undefined as WatchStatus | undefined, badge: "Match" }));
    if (filter === "cinema")
      return store.watchlist
        .filter((w) => w.cinema)
        .map((w) => ({ title: getTitle(w.titleId), status: w.status, badge: "🎬" }))
        .filter((x) => x.title) as { title: Title; status: WatchStatus; badge: string }[];
    return store.watchlist
      .filter((w) => filter === "all" || w.status === filter)
      .map((w) => ({ title: getTitle(w.titleId), status: w.status, badge: w.cinema ? "🎬" : undefined }))
      .filter((x) => x.title) as { title: Title; status: WatchStatus; badge?: string }[];
  }, [filter, store.watchlist, matchTitles]);

  return (
    <div className="space-y-5">
      <div className="pt-1">
        <h1 className="text-2xl font-black tracking-tight">Watchlist & Matches</h1>
        <p className="text-sm text-white/45">
          {store.matches.length} matches · {store.watchlist.length} saved · {store.watched.length} watched
        </p>
      </div>

      {/* filter pills */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn("chip shrink-0", filter === f.key && "chip-active")}
          >
            {f.label}
          </button>
        ))}
      </div>

      {filter === "watched" ? (
        <>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Who watched it</p>
            <div className="flex gap-2">
              {WHO.map((w) => (
                <button
                  key={w.key}
                  onClick={() => setWho(w.key)}
                  className={cn("chip shrink-0 text-xs", who === w.key && "chip-active")}
                >
                  {w.label}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-white/45">
              Browse what {who === "her" ? "Amore has" : who === "me" ? "you've" : "you both have"} seen — tap any to
              rewatch, rate, or leave a note.
            </p>
          </div>

          {watchedItems.length === 0 ? (
            <Empty filter="watched" />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {watchedItems.map(({ title, ws }) => (
                <PosterCard
                  key={title.id}
                  title={title}
                  badge={ws.length === 2 ? "🐼💞" : ws[0] === "me" ? "🐼" : "💞"}
                />
              ))}
            </div>
          )}
        </>
      ) : items.length === 0 ? (
        <Empty filter={filter} />
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {items.map(({ title, status, badge }) => (
            <PosterCard
              key={title.id}
              title={title}
              status={filter === "all" || filter === "matches" || filter === "cinema" ? status : undefined}
              badge={badge}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Empty({ filter }: { filter: Filter }) {
  const copy: Record<Filter, { emoji: string; title: string; sub: string }> = {
    matches: { emoji: "💞", title: "No matches yet", sub: "Swipe in Together mode — when you both like the same title, it lands here." },
    all: { emoji: "🍿", title: "Nothing saved yet", sub: "Save titles while you discover and they'll show up here." },
    cinema: { emoji: "🎬", title: "No cinema picks yet", sub: "Open any title and tap “Watch in cinema” for the ones worth the big screen." },
    watched: { emoji: "✅", title: "Nothing watched yet", sub: "Mark titles watched (by you or Amore) to build your rewatch shelf." },
    planning: { emoji: "🗓️", title: "Nothing planned", sub: "Set a title's status to Planning." },
    watching: { emoji: "▶️", title: "Not watching anything", sub: "Set a title's status to Watching." },
    finished: { emoji: "🏁", title: "Nothing finished", sub: "Mark a title Finished when you're done." },
  };
  const c = copy[filter];
  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-white/10 py-16 text-center">
      <div className="text-4xl">{c.emoji}</div>
      <p className="mt-3 font-semibold">{c.title}</p>
      <p className="mt-1 max-w-[16rem] text-sm text-white/45">{c.sub}</p>
      <Link href="/discover" className="chip chip-active mt-5">
        Start discovering
      </Link>
    </div>
  );
}
