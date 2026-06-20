"use client";

import { cn } from "@/lib/cn";
import { ME, PARTNER, getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { ActivityEvent, Title } from "@/lib/types";
import { motion } from "framer-motion";
import { useMemo } from "react";

export default function UsPage() {
  const store = useStore();

  const engaged = useMemo(() => {
    const ids = new Set<string>();
    store.matches.forEach((m) => ids.add(m.titleId));
    store.watchlist.forEach((w) => ids.add(w.titleId));
    store.votes.filter((v) => v.value !== "pass").forEach((v) => ids.add(v.titleId));
    return [...ids].map(getTitle).filter(Boolean) as Title[];
  }, [store.matches, store.watchlist, store.votes]);

  const finished = store.watchlist.filter((w) => w.status === "finished");
  const hours = Math.round(
    finished.reduce((acc, w) => {
      const t = getTitle(w.titleId);
      if (!t) return acc;
      return acc + (t.mediaType === "tv" ? (t.seasons ?? 1) * 8 * (t.runtime / 60) : t.runtime / 60);
    }, 0)
  );

  const genreCount = useMemo(() => {
    const m = new Map<string, number>();
    engaged.forEach((t) => t.genres.forEach((g) => m.set(g, (m.get(g) ?? 0) + 1)));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [engaged]);

  const has = (pred: (t: Title) => boolean, n: number) => ({
    count: engaged.filter(pred).length,
    need: n,
  });
  const achievements = [
    { key: "mystery", emoji: "🕵️", name: "Mystery Lovers", ...has((t) => t.genres.includes("Mystery"), 3) },
    { key: "thriller", emoji: "🔪", name: "Thriller Experts", ...has((t) => t.genres.includes("Thriller"), 3) },
    { key: "binge", emoji: "🛌", name: "Weekend Bingers", ...has((t) => t.mediaType === "tv", 3) },
    { key: "classic", emoji: "🏛️", name: "Classic Explorers", ...has((t) => t.classic, 2) },
    { key: "crime", emoji: "🚔", name: "Crime Connoisseurs", ...has((t) => t.genres.includes("Crime"), 4) },
    { key: "match", emoji: "💞", name: "In Sync", count: store.matches.length, need: 3 },
  ];

  return (
    <div className="space-y-6">
      <div className="pt-1">
        <h1 className="text-2xl font-black tracking-tight">Us</h1>
        <p className="text-sm text-white/45">
          {ME.emoji} {ME.name} & {PARTNER.name} {PARTNER.emoji}
        </p>
      </div>

      {/* stats hero */}
      <div className="grid grid-cols-2 gap-3">
        <Stat value={hours} label="Hours together" suffix="h" />
        <Stat value={store.matches.length} label="Matches" />
        <Stat value={finished.length} label="Completed" />
        <Stat value={store.watchlist.length} label="On the list" />
      </div>

      {/* genre breakdown */}
      {genreCount.length > 0 && (
        <section className="glass rounded-2xl p-4">
          <h3 className="mb-3 text-sm font-bold">Your taste DNA</h3>
          <div className="space-y-2">
            {genreCount.slice(0, 5).map(([g, c], i) => {
              const pct = Math.round((c / genreCount[0][1]) * 100);
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-white/70">{g}</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <motion.div
                      className="h-full rounded-full bg-accent-gradient"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: i * 0.08, duration: 0.6 }}
                    />
                  </div>
                  <span className="w-6 text-right text-xs text-white/40">{c}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* achievements */}
      <section>
        <h3 className="mb-3 text-base font-bold">Achievements</h3>
        <div className="grid grid-cols-3 gap-3">
          {achievements.map((a) => {
            const unlocked = a.count >= a.need;
            return (
              <div
                key={a.key}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition",
                  unlocked
                    ? "border-accent/40 bg-accent-soft shadow-glow"
                    : "border-white/10 bg-white/[0.03]"
                )}
              >
                <span className={cn("text-2xl", !unlocked && "grayscale opacity-40")}>{a.emoji}</span>
                <span className={cn("text-[11px] font-semibold leading-tight", !unlocked && "text-white/45")}>
                  {a.name}
                </span>
                <span className="text-[10px] text-white/40">
                  {unlocked ? "Unlocked" : `${Math.min(a.count, a.need)}/${a.need}`}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* activity feed */}
      <section>
        <h3 className="mb-3 text-base font-bold">Activity</h3>
        <div className="space-y-2">
          {store.activity.slice(0, 20).map((e) => (
            <FeedRow key={e.id} e={e} latest={store.activity[0]?.createdAt ?? e.createdAt} />
          ))}
        </div>
      </section>

      <div className="h-2" />
    </div>
  );
}

function Stat({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  return (
    <div className="glass rounded-2xl p-4">
      <motion.p
        className="text-3xl font-black text-gradient"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {value}
        {suffix}
      </motion.p>
      <p className="text-xs text-white/50">{label}</p>
    </div>
  );
}

function FeedRow({ e, latest }: { e: ActivityEvent; latest: number }) {
  const actor = e.actorId === ME.id ? ME : PARTNER;
  const t = e.titleId ? getTitle(e.titleId) : null;
  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3">
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ background: `${actor.color}33` }}
      >
        {actor.emoji}
      </span>
      <p className="flex-1 text-sm text-white/75">
        <span className="font-semibold text-white">{actor.name}</span>{" "}
        {e.detail ?? e.type}
      </p>
      {t && (
        <span
          className="h-9 w-6 shrink-0 rounded-md"
          style={{ background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})` }}
        />
      )}
      <span className="shrink-0 text-[10px] text-white/35">{rel(e.createdAt, latest)}</span>
    </div>
  );
}

function rel(ts: number, now: number) {
  const d = Math.max(0, now - ts);
  const m = Math.round(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
