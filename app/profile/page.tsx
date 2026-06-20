"use client";

import { PosterCard } from "@/components/ui/PosterCard";
import { ME, PARTNER, TASTE_SEED, getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Title } from "@/lib/types";
import { Check, Copy, LogOut, RefreshCw } from "lucide-react";
import { useState } from "react";

export default function ProfilePage() {
  const store = useStore();
  const [copied, setCopied] = useState(false);
  const loved = TASTE_SEED.lovedTitleIds.map(getTitle).filter(Boolean) as Title[];

  const copyCode = () => {
    navigator.clipboard?.writeText("AMORE-7C3A").catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const reset = () => {
    if (!confirm("Reset all watchlist, votes and matches? Your taste profile stays.")) return;
    localStorage.removeItem("amore-movies/v1");
    location.reload();
  };

  return (
    <div className="space-y-6">
      {/* identity */}
      <div className="flex items-center gap-4 pt-2">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ring-2 ring-white/15"
          style={{ background: `${ME.color}33` }}
        >
          {ME.emoji}
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{ME.name}</h1>
          <p className="text-sm text-white/45">Paired with {PARTNER.name} {PARTNER.emoji}</p>
        </div>
      </div>

      {/* couple invite */}
      <section className="glass rounded-2xl p-4">
        <h3 className="text-sm font-bold">Your couple</h3>
        <p className="mt-0.5 text-xs text-white/45">Share this code so your partner joins the same space.</p>
        <button
          onClick={copyCode}
          className="mt-3 flex w-full items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3 transition hover:bg-white/[0.1]"
        >
          <span className="font-mono text-lg tracking-widest">AMORE-7C3A</span>
          {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/50" />}
        </button>
      </section>

      {/* taste */}
      <section>
        <h3 className="mb-2 text-base font-bold">Genres you love</h3>
        <div className="flex flex-wrap gap-2">
          {TASTE_SEED.genres.map((g) => (
            <span key={g} className="chip chip-active text-xs">{g}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold">What you don&apos;t want</h3>
        <div className="flex flex-wrap gap-2">
          {["Generic / low-quality", "Poorly written romance", "Predictable stories"].map((g) => (
            <span key={g} className="chip text-xs text-white/55">🚫 {g}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-base font-bold">Titles that define your taste</h3>
        <div className="grid grid-cols-3 gap-3">
          {loved.slice(0, 6).map((t) => (
            <PosterCard key={t.id} title={t} />
          ))}
        </div>
      </section>

      {/* danger / utility */}
      <section className="space-y-2 pt-2">
        <button
          onClick={reset}
          className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm transition hover:bg-white/[0.08]"
        >
          <RefreshCw className="h-5 w-5 text-white/50" />
          <span>
            <span className="block font-semibold">Reset activity</span>
            <span className="text-xs text-white/45">Clear watchlist, votes & matches</span>
          </span>
        </button>
        <button className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm text-white/50 transition hover:bg-white/[0.08]">
          <LogOut className="h-5 w-5" />
          <span className="font-semibold">Sign out (demo)</span>
        </button>
      </section>

      <p className="pb-2 pt-2 text-center text-[11px] text-white/30">
        Amore Movies · running on mock data · Supabase + TMDB wiring next
      </p>
    </div>
  );
}
