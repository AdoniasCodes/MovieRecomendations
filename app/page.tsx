"use client";

import { PosterCard } from "@/components/ui/PosterCard";
import { tonightCatalog } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { getTitle } from "@/lib/mock-data";
import { classics, hiddenGems, reseed, surpriseMe, tonightsPick } from "@/lib/recommend";
import { useStore } from "@/lib/store";
import { openTitleSheet } from "@/lib/title-sheet";
import type { Scored, Title } from "@/lib/types";
import { motion } from "framer-motion";
import { Dices, Play, Shuffle, Sparkles } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

/** a friendly "why" for a TMDB pool title, leaning on the taste brief */
function whyFor(t: Title): string {
  if (t.international && t.cerebral) return `A cerebral ${t.country} pick — the mind-game, not the carnage.`;
  if (t.international) return `${t.country} cinema you two might love.`;
  if (t.cerebral) return `Cerebral ${(t.genres[0] ?? "mystery").toLowerCase()} — outsmart the story.`;
  if (t.violence <= 1) return `Wholesome and easy — good for together.`;
  if (t.genres.some((g) => ["Crime", "Thriller", "Mystery"].includes(g)))
    return `A gripping ${t.genres[0].toLowerCase()} for the dark-drama mood.`;
  return `Highly rated ${(t.genres[0] ?? "pick").toLowerCase()} you haven't watched yet.`;
}

export default function HomePage() {
  const store = useStore();
  const [pickSeed, setPickSeed] = useState(0);
  const [pool, setPool] = useState<Title[]>([]);
  const [idx, setIdx] = useState(0);

  const excluded = useMemo(
    () => new Set(store.watchlist.filter((w) => w.status === "finished").map((w) => w.titleId)),
    [store.watchlist]
  );

  // pull a big, shuffled TMDB pool once so "Not feeling it" always has more
  useEffect(() => {
    let alive = true;
    tonightCatalog().then((list) => {
      if (!alive || !list.length) return;
      const a = [...list];
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      setPool(a);
    });
    return () => {
      alive = false;
    };
  }, []);

  const curated = useMemo(() => {
    reseed(1337 + pickSeed * 17);
    return pickSeed % 2 === 1 ? surpriseMe(excluded) : tonightsPick(excluded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pickSeed, excluded]);

  // the live pool (minus anything finished) drives the carousel; fall back to
  // the curated engine until the pool loads.
  const poolView = useMemo(() => pool.filter((t) => !excluded.has(t.id)), [pool, excluded]);
  const fromPool = poolView.length ? poolView[idx % poolView.length] : null;
  const pick: Scored = fromPool ? { title: fromPool, score: 0, why: whyFor(fromPool) } : curated;

  const nextPick = () => (poolView.length ? setIdx((i) => i + 1) : setPickSeed((s) => s + 1));
  const surprisePick = () =>
    poolView.length
      ? setIdx((i) => i + 1 + Math.floor(Math.random() * Math.max(1, poolView.length - 1)))
      : setPickSeed((s) => s + 1);

  const gems = useMemo(() => hiddenGems(8), []);
  const classicPicks = useMemo(() => classics(8), []);
  const matchTitles = store.matches.map((m) => getTitle(m.titleId)).filter(Boolean) as Title[];
  const continueWatching = store.watchlist
    .filter((w) => w.status === "watching" || w.status === "paused")
    .map((w) => getTitle(w.titleId))
    .filter(Boolean) as Title[];

  const partnerEvent = store.activity.find((a) => a.actorId === store.partner.id);

  return (
    <div className="space-y-7">
      <Header partnerName={store.partner.name} herOnline={store.herOnline} />

      {/* Tonight's Pick hero */}
      <TonightHero pick={pick} onReshuffle={nextPick} />

      {/* quick actions */}
      <div className="grid grid-cols-3 gap-2.5">
        <QuickAction
          icon={<Sparkles className="h-5 w-5" />}
          label="Surprise Me"
          onClick={surprisePick}
        />
        <QuickAction icon={<Dices className="h-5 w-5" />} label="Randomize" onClick={() => randomFrom(store, openTitleSheet)} />
        <Link href="/discover" className="contents">
          <QuickAction icon={<Shuffle className="h-5 w-5" />} label="Discovery" />
        </Link>
      </div>

      {/* partner peek */}
      {partnerEvent && (
        <Link
          href="/us"
          className="glass flex items-center gap-3 rounded-2xl p-3 transition hover:bg-white/[0.08]"
        >
          <span
            className="flex h-10 w-10 items-center justify-center rounded-full text-lg"
            style={{ background: `${store.partner.color}33` }}
          >
            {store.partner.emoji}
          </span>
          <p className="flex-1 text-sm text-white/75">
            <span className="font-semibold text-white">{store.partner.name}</span>{" "}
            {partnerEvent.detail}
          </p>
          <span className="text-xs text-white/35">›</span>
        </Link>
      )}

      {matchTitles.length > 0 && <Rail title="💞 It's a Match" items={matchTitles} badge="Match" />}
      {continueWatching.length > 0 && <Rail title="Continue watching" items={continueWatching} />}
      <RailScored title="💎 Hidden gems for you" items={gems} />
      <RailScored title="🏛️ Classics you've missed" items={classicPicks} />

      <div className="h-2" />
    </div>
  );
}

function Header({ partnerName, herOnline }: { partnerName: string; herOnline: boolean }) {
  return (
    <div className="flex items-center justify-between pt-1">
      <div>
        <p className="text-xs uppercase tracking-widest text-white/40">Amore Movies</p>
        <h1 className="text-2xl font-black tracking-tight">
          What should you <span className="text-gradient">watch?</span>
        </h1>
        <p className="mt-0.5 text-[11px] text-white/45">
          {herOnline ? (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> {partnerName} is online
            </span>
          ) : (
            <span className="text-white/35">{partnerName} is offline</span>
          )}
        </p>
      </div>
      <div className="flex -space-x-2">
        <Bubble emoji="🐼" color="#7C3AED" />
        <Bubble emoji="💞" color="#DB2777" online={herOnline} />
      </div>
    </div>
  );
}

function Bubble({ emoji, color, online }: { emoji: string; color: string; online?: boolean }) {
  return (
    <span className="relative">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-base ring-2 ring-base"
        style={{ background: `${color}33` }}
      >
        {emoji}
      </span>
      {online && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-2 ring-base" />
      )}
    </span>
  );
}

function TonightHero({ pick, onReshuffle }: { pick: Scored; onReshuffle: () => void }) {
  const t = pick.title;
  return (
    <motion.div
      key={t.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-3xl shadow-card"
    >
      <div
        className="relative h-72"
        style={{ background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})` }}
      >
        {t.posterPath && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`https://image.tmdb.org/t/p/w780${t.posterPath}`}
            alt={t.title}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        )}
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/55 to-black/10" />
        <div className="absolute left-4 top-4 rounded-full bg-black/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white/80 backdrop-blur">
          ✦ Tonight&apos;s pick
        </div>
        <div className="absolute inset-x-0 bottom-0 p-4">
          <h2 className="text-3xl font-black leading-tight">{t.title}</h2>
          <p className="mt-0.5 text-sm text-white/55">
            {t.year} · {t.mediaType === "tv" ? `${t.seasons} seasons` : `${t.runtime} min`} ·{" "}
            {t.genres.slice(0, 2).join(" / ")} · ⭐ {t.voteAverage.toFixed(1)}
          </p>
          <p className="mt-2 flex items-start gap-1.5 text-xs text-white/75">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-accent-glow" />
            {pick.why}
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => openTitleSheet(t.id)}
              className="flex items-center gap-2 rounded-full bg-accent-gradient px-5 py-2.5 text-sm font-semibold shadow-glow active:scale-95"
            >
              <Play className="h-4 w-4 fill-white" /> Watch tonight
            </button>
            <button
              onClick={onReshuffle}
              className="glass rounded-full px-4 py-2.5 text-sm font-medium active:scale-95"
            >
              Not feeling it
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function QuickAction({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="glass flex flex-col items-center gap-2 rounded-2xl py-4 text-xs font-semibold text-white/85 transition hover:bg-white/[0.08] active:scale-95"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent-glow">
        {icon}
      </span>
      {label}
    </button>
  );
}

function Rail({ title, items, badge }: { title: string; items: Title[]; badge?: string }) {
  return (
    <section>
      <h3 className="mb-3 text-base font-bold">{title}</h3>
      <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">
        {items.map((t) => (
          <PosterCard key={t.id} title={t} className="w-32 shrink-0" badge={badge} />
        ))}
      </div>
    </section>
  );
}

function RailScored({ title, items }: { title: string; items: Scored[] }) {
  return <Rail title={title} items={items.map((s) => s.title)} />;
}

function randomFrom(
  store: ReturnType<typeof useStore>,
  open: (id: string) => void
) {
  const pool = store.watchlist.length
    ? store.watchlist.map((w) => w.titleId)
    : store.matches.map((m) => m.titleId);
  if (!pool.length) return;
  const id = pool[Math.floor(((Date.now() % 9973) / 9973) * pool.length)];
  open(id);
}
