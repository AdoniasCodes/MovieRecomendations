"use client";

import { GoLive } from "@/components/auth/GoLive";
import { PosterCard } from "@/components/ui/PosterCard";
import { ME, PARTNER, TASTE_SEED, getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Title } from "@/lib/types";
import { LogOut, RefreshCw } from "lucide-react";

export default function ProfilePage() {
  const store = useStore();
  const loved = TASTE_SEED.lovedTitleIds.map(getTitle).filter(Boolean) as Title[];

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

      {/* couple — real auth + pairing */}
      <GoLive />

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
        Amore Movies · live TMDB catalog · made for Panda &amp; Hermi 💞
      </p>
    </div>
  );
}
