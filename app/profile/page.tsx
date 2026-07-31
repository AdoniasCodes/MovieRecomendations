"use client";

import { PinLogin } from "@/components/auth/PinLogin";
import { EnableAlerts } from "@/components/notifications/EnableAlerts";
import { InstallButton } from "@/components/pwa/InstallButton";
import { PosterCard } from "@/components/ui/PosterCard";
import { anniversaryPhase, type AnniversaryPhase } from "@/lib/anniversary/date";
import { setAnniversaryDemo, useAnniversaryDemo } from "@/lib/anniversary/demo";
import { MODULES } from "@/lib/anniversary/script";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { identityFromEmail, useWhoami } from "@/lib/identity";
import { TASTE_AMORE, TASTE_SEED, getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Title } from "@/lib/types";
import { Flame, FlaskConical, Heart, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const prettify = (s: string) => s.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase());

export default function ProfilePage() {
  const store = useStore();
  const auth = useAuth();
  const who = useWhoami();
  const taste = who === "hermi" ? TASTE_AMORE : TASTE_SEED;
  const loved = taste.lovedTitleIds.map(getTitle).filter(Boolean) as Title[];

  // Until July 31 is over this card is Panda's console, so it stays hidden from
  // Hermi. Afterwards it belongs to both of them, as the way back in.
  // Resolved in an effect: a date read during first render is a hydration risk.
  const [phase, setPhase] = useState<AnniversaryPhase | null>(null);
  useEffect(() => setPhase(anniversaryPhase()), []);
  // identity from the SESSION, not the display toggle (which reads "panda" on a
  // cold load), so the card can never flash into view on her phone
  const realWho = auth.configured ? identityFromEmail(auth.session?.user.email) : who;
  const demo = useAnniversaryDemo();
  const showAnniversary =
    phase !== null && !(auth.configured && auth.loading) && (phase === "after" || realWho === "panda");

  const reset = () => {
    if (!confirm("Reset all watchlist, votes and matches? Your taste profile stays.")) return;
    Object.keys(localStorage)
      .filter((key) => key.startsWith("amore-movies/"))
      .forEach((key) => localStorage.removeItem(key));
    location.reload();
  };

  return (
    <div className="space-y-6">
      {/* identity */}
      <div className="flex items-center gap-4 pt-2">
        <span
          className="flex h-16 w-16 items-center justify-center rounded-2xl text-3xl ring-2 ring-white/15"
          style={{ background: `${store.me.color}33` }}
        >
          {store.me.emoji}
        </span>
        <div>
          <h1 className="text-2xl font-black tracking-tight">{store.me.name}</h1>
          <p className="text-sm text-white/45">Paired with {store.partner.name} {store.partner.emoji}</p>
        </div>
      </div>

      {/* couple — real auth + pairing */}
      <PinLogin />

      {/* install as an app */}
      <InstallButton />

      {/* device alerts (web push) */}
      <EnableAlerts />

      {/* year one: the anniversary experience */}
      {showAnniversary && (
        <Link
          href="/anniversary"
          className="flex w-full items-center gap-3 rounded-2xl bg-accent-soft p-4 text-left text-sm ring-1 ring-white/10 transition active:scale-[0.99]"
        >
          <Heart className="h-5 w-5 text-magenta" />
          <span>
            <span className="flex items-center gap-2 font-semibold">
              Year One
              <span className="rounded bg-magenta/20 px-1.5 py-0.5 text-[10px] font-bold text-magenta">
                {phase === "after" ? "Relive it" : "Ready"}
              </span>
            </span>
            <span className="text-xs text-white/45">
              {phase === "after"
                ? "Everything from our anniversary, any time you want it"
                : "The whole day, and you are the one driving it"}
            </span>
          </span>
        </Link>
      )}

      {/* demo switch: Panda only, and only before the day is over */}
      {showAnniversary && phase !== "after" && (
        <div
          className={cn(
            "space-y-3 rounded-2xl p-4 ring-1 transition",
            demo ? "bg-amber-500/10 ring-amber-400/30" : "glass ring-white/10"
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className={cn("h-4 w-4", demo ? "text-amber-300" : "text-white/50")} />
                Demo the surprise
              </p>
              <p className="mt-1 text-xs text-white/45">
                Watch it exactly as {store.partner.name} will, on this phone.
              </p>
            </div>
            <button
              role="switch"
              aria-checked={demo}
              aria-label="Demo mode"
              onClick={() => setAnniversaryDemo(!demo)}
              className={cn(
                "relative h-7 w-12 shrink-0 rounded-full transition",
                demo ? "bg-amber-500" : "bg-white/15"
              )}
            >
              <span
                className={cn(
                  "absolute top-1 h-5 w-5 rounded-full bg-white transition-all",
                  demo ? "left-6" : "left-1"
                )}
              />
            </button>
          </div>
          {demo ? (
            <p className="rounded-xl bg-black/25 p-3 text-[11px] leading-relaxed text-amber-100/80">
              Now switch to {store.partner.name} with &quot;Switch user&quot; below. Her side opens
              by itself and you can step through all {MODULES.length} screens. Nothing you do
              touches her phone, and this does not use up her real first open. Come back here and
              turn it off when you are done.
            </p>
          ) : (
            <p className="text-[11px] leading-relaxed text-white/35">
              Turn this on, switch to her account on this phone, and you will see the whole thing
              end to end. Off is the real behaviour.
            </p>
          )}
        </div>
      )}

      {/* after dark */}
      <Link
        href="/after-dark"
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm transition hover:bg-white/[0.08]"
      >
        <Flame className="h-5 w-5 text-rose-400" />
        <span>
          <span className="flex items-center gap-2 font-semibold">
            After Dark
            <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">18+</span>
          </span>
          <span className="text-xs text-white/45">A dice game for just the two of you</span>
        </span>
      </Link>

      {/* taste */}
      <section>
        <h3 className="mb-2 text-base font-bold">Genres you love</h3>
        <div className="flex flex-wrap gap-2">
          {taste.genres.map((g) => (
            <span key={g} className="chip chip-active text-xs">{g}</span>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-2 text-base font-bold">What you don&apos;t want</h3>
        <div className="flex flex-wrap gap-2">
          {taste.doNotWant.map((g) => (
            <span key={g} className="chip text-xs text-white/55">🚫 {prettify(g)}</span>
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
      </section>

      <p className="pb-2 pt-2 text-center text-[11px] text-white/30">
        Amore Movies · live TMDB catalog · made for Panda &amp; Hermi 💞
      </p>
    </div>
  );
}
