"use client";

// Every screen Hermi can be shown on July 31, one renderer per module kind.
// They all live in one file on purpose: they share a visual language and it is
// far easier to keep them consistent (and to scan on the night) than nine
// near-identical files.
//
// Nothing here talks to the network or the store. A module is handed its data
// and renders it. The stage decides WHICH one is on screen, the director panel
// decides WHEN. That split is what makes the whole thing controllable.

import { cn } from "@/lib/cn";
import { daysTogether, monthsTogether } from "@/lib/anniversary/date";
import type {
  AnniversaryModule,
  BannerModule,
  FinaleModule,
  ItineraryIcon,
  ItineraryModule,
  JokeModule,
  MessageModule,
  NumbersModule,
  PhotoGuessModule,
  PhotoModule,
  VoiceModule,
} from "@/lib/anniversary/script";
import { AnimatePresence, motion } from "framer-motion";
import {
  Cake,
  Cigarette,
  Gift,
  Heart,
  ImageOff,
  Martini,
  Mic,
  Moon,
  Pause,
  Play,
  Sparkles,
  Syringe,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

/** how long she holds a seal before it opens. Matches After Dark's SEAL_HOLD_MS. */
const HOLD_MS = 2000;

/* ------------------------------------------------------------------ atoms */

/**
 * Hold to open. Borrowed straight from the sealed-envelope interaction in
 * AfterDarkGame, because making someone hold their thumb down for two seconds
 * turns "tapping past a screen" into "opening something".
 */
function HoldToOpen({ label, onOpen }: { label: string; onOpen: () => void }) {
  const [progress, setProgress] = useState(0);
  const holding = useRef(false);
  const raf = useRef<number | null>(null);
  const startedAt = useRef(0);

  useEffect(
    () => () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    },
    []
  );

  const tick = () => {
    if (!holding.current) return;
    const pct = Math.min(1, (performance.now() - startedAt.current) / HOLD_MS);
    setProgress(pct);
    if (pct >= 1) {
      holding.current = false;
      try {
        navigator.vibrate?.([40, 30, 90]);
      } catch {}
      onOpen();
      return;
    }
    raf.current = requestAnimationFrame(tick);
  };

  const begin = () => {
    if (holding.current) return;
    holding.current = true;
    startedAt.current = performance.now();
    raf.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    holding.current = false;
    if (raf.current) cancelAnimationFrame(raf.current);
    setProgress(0);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <motion.button
        onPointerDown={begin}
        onPointerUp={cancel}
        onPointerLeave={cancel}
        onPointerCancel={cancel}
        className="relative flex h-40 w-40 select-none items-center justify-center rounded-full bg-accent-soft ring-1 ring-white/15"
        animate={{ scale: progress > 0 ? 1 + progress * 0.06 : 1 }}
        transition={{ duration: 0.1 }}
      >
        <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="46" fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="3" />
          <circle
            cx="50"
            cy="50"
            r="46"
            fill="none"
            stroke="#DB2777"
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={289}
            strokeDashoffset={289 * (1 - progress)}
          />
        </svg>
        <span className="text-5xl">💌</span>
      </motion.button>
      <p className="text-sm font-semibold text-white/70">{label}</p>
      <p className="text-xs text-white/40">{progress > 0 ? "Keep holding..." : "Press and hold"}</p>
    </div>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return (
    <motion.h2
      className="text-gradient text-center text-3xl font-black leading-tight tracking-tight"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
    >
      {children}
    </motion.h2>
  );
}

/* ------------------------------------------------------------------ views */

function BannerView({ m }: { m: BannerModule }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <motion.div
        className="text-6xl"
        animate={{ scale: [1, 1.15, 1], rotate: [0, -6, 6, 0] }}
        transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 0.6 }}
      >
        💞
      </motion.div>
      <motion.h1
        className="text-gradient text-4xl font-black leading-tight tracking-tight"
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        {m.headline}
      </motion.h1>
      <motion.p
        className="text-base text-white/70"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        {m.sub}
      </motion.p>
    </div>
  );
}

function MessageView({ m }: { m: MessageModule }) {
  const [open, setOpen] = useState(false);
  return (
    <AnimatePresence mode="wait">
      {!open ? (
        <motion.div key="seal" exit={{ opacity: 0, scale: 0.9 }} className="flex justify-center">
          <HoldToOpen label={m.seal} onOpen={() => setOpen(true)} />
        </motion.div>
      ) : (
        <motion.div
          key="letter"
          className="space-y-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Title>{m.title}</Title>
          <div className="space-y-4">
            {m.body.map((para, i) => (
              <motion.p
                key={i}
                className="text-[15px] leading-relaxed text-white/80"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 + i * 0.25 }}
              >
                {para}
              </motion.p>
            ))}
          </div>
          {m.signoff && (
            <motion.p
              className="pt-2 text-right text-sm font-semibold italic text-magenta"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 + m.body.length * 0.25 }}
            >
              {m.signoff} 💞
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function VoiceView({ m }: { m: VoiceModule }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [failed, setFailed] = useState(false);

  const toggle = () => {
    const el = audio.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      void el.play().catch(() => setFailed(true));
    }
  };

  return (
    <div className="space-y-6">
      <Title>{m.title}</Title>

      {failed ? (
        <p className="rounded-2xl bg-amber-500/10 p-4 text-center text-sm text-amber-200 ring-1 ring-amber-400/20">
          This voice note has not been recorded yet.
        </p>
      ) : (
        <div className="glass space-y-4 rounded-3xl p-6">
          <div className="flex items-center gap-4">
            <button
              onClick={toggle}
              className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent-gradient shadow-glow transition active:scale-95"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? <Pause className="h-6 w-6" /> : <Play className="ml-1 h-6 w-6" />}
            </button>
            <div className="min-w-0 flex-1 space-y-2">
              {/* a soft bar-graph waveform, animated only while playing */}
              <div className="flex h-10 items-end gap-1">
                {Array.from({ length: 26 }).map((_, i) => {
                  const base = 20 + ((i * 37) % 70);
                  const active = progress * 26 > i;
                  return (
                    <motion.span
                      key={i}
                      className={cn("flex-1 rounded-full", active ? "bg-magenta" : "bg-white/15")}
                      style={{ height: `${base}%` }}
                      animate={playing ? { scaleY: [1, 0.6 + ((i * 13) % 8) / 10, 1] } : { scaleY: 1 }}
                      transition={{ duration: 0.7 + (i % 5) * 0.12, repeat: playing ? Infinity : 0 }}
                    />
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/40">
                <Mic className="h-3 w-3" />
                {playing ? "Playing" : progress > 0 ? "Paused" : "Tap to play"}
              </div>
            </div>
          </div>
          {m.caption && <p className="text-sm text-white/55">{m.caption}</p>}
        </div>
      )}

      <audio
        ref={audio}
        src={m.src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(1);
        }}
        onError={() => setFailed(true)}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          if (el.duration > 0) setProgress(el.currentTime / el.duration);
        }}
      />
    </div>
  );
}

function PhotoView({ m }: { m: PhotoModule }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="space-y-4">
      <motion.div
        className="overflow-hidden rounded-3xl shadow-glow-magenta"
        initial={{ opacity: 0, scale: 0.94, rotate: -1.5 }}
        animate={{ opacity: 1, scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 180, damping: 18 }}
      >
        {broken ? (
          <div className="flex aspect-[4/5] items-center justify-center bg-white/5 text-white/25">
            <ImageOff className="h-10 w-10" />
          </div>
        ) : (
          // plain img on purpose: the Netlify image optimizer is not reachable
          // from Panda's ISP route (see handoff.md), posters do the same
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.src}
            alt={m.caption}
            className="h-auto w-full object-cover"
            onError={() => setBroken(true)}
          />
        )}
      </motion.div>
      <motion.div
        className="space-y-2 text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
      >
        <p className="text-lg font-black">{m.caption}</p>
        {m.story && <p className="text-sm leading-relaxed text-white/60">{m.story}</p>}
      </motion.div>
    </div>
  );
}

function PhotoGuessView({ m }: { m: PhotoGuessModule }) {
  const [picked, setPicked] = useState<number | null>(null);
  const answered = picked !== null;
  const correct = picked === m.answerIndex;

  return (
    <div className="space-y-5">
      <Title>{m.question}</Title>

      <motion.div className="relative overflow-hidden rounded-3xl" layout>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={m.src}
          alt="A photo of us, waiting to be guessed"
          className={cn(
            "h-auto w-full object-cover transition-all duration-700",
            answered ? "blur-0 scale-100" : "scale-110 blur-2xl"
          )}
        />
        {!answered && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Sparkles className="h-10 w-10 text-white/60" />
          </div>
        )}
      </motion.div>

      <div className="space-y-2">
        {m.options.map((opt, i) => {
          const isAnswer = i === m.answerIndex;
          const state = !answered ? "idle" : isAnswer ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button
              key={i}
              disabled={answered}
              onClick={() => {
                setPicked(i);
                try {
                  navigator.vibrate?.(i === m.answerIndex ? [40, 40, 90] : 30);
                } catch {}
              }}
              className={cn(
                "w-full rounded-2xl p-4 text-left text-sm font-semibold transition active:scale-[0.98]",
                state === "idle" && "glass",
                state === "right" && "bg-gradient-to-r from-emerald-600/80 to-emerald-500/60 ring-1 ring-emerald-300/40",
                state === "wrong" && "bg-white/5 text-white/40 line-through",
                state === "dim" && "bg-white/[0.02] text-white/25"
              )}
            >
              {opt}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {answered && (
          <motion.div
            className="space-y-2 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="text-sm font-black text-magenta">
              {correct ? "You remembered 💞" : "Close, but no."}
            </p>
            <p className="text-sm leading-relaxed text-white/70">{m.reveal}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function NumbersView({ m }: { m: NumbersModule }) {
  // computed in an effect, never during render: Date in a first-render path is
  // a hydration mismatch waiting to happen (workspace rule)
  const [live, setLive] = useState<{ days: number; months: number } | null>(null);
  useEffect(() => {
    setLive({ days: daysTogether(), months: monthsTogether() });
  }, []);

  const resolve = (value: string) => {
    if (value === "live:days") return live ? String(live.days) : "...";
    if (value === "live:months") return live ? String(live.months) : "...";
    return value;
  };

  return (
    <div className="space-y-6">
      <Title>{m.title}</Title>
      <div className="grid grid-cols-2 gap-3">
        {m.stats.map((s, i) => (
          <motion.div
            key={i}
            className="glass space-y-1 rounded-2xl p-4"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
          >
            <p className="text-gradient text-3xl font-black tabular-nums">{resolve(s.value)}</p>
            <p className="text-xs font-semibold leading-snug text-white/70">{s.label}</p>
            {s.note && <p className="text-[11px] leading-snug text-white/35">{s.note}</p>}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

const ITINERARY_ICONS: Record<ItineraryIcon, typeof Gift> = {
  gift: Gift,
  ink: Syringe,
  drinks: Martini,
  smoke: Cigarette,
  moon: Moon,
};

function ItineraryView({ m }: { m: ItineraryModule }) {
  const Icon = ITINERARY_ICONS[m.icon];
  return (
    <div className="space-y-6">
      <motion.div
        className="flex flex-col items-center gap-3"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 18 }}
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-accent-soft ring-1 ring-white/15">
          <Icon className="h-9 w-9 text-magenta" />
        </span>
        <span className="chip text-[11px] font-black uppercase tracking-widest">
          Stop {m.step} · {m.when}
        </span>
      </motion.div>

      <div className="space-y-3 text-center">
        <Title>{m.headline}</Title>
        <p className="text-xs font-black uppercase tracking-widest text-white/40">{m.place}</p>
        <motion.p
          className="text-[15px] leading-relaxed text-white/75"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {m.detail}
        </motion.p>
      </div>
    </div>
  );
}

function JokeView({ m }: { m: JokeModule }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="space-y-6 text-center">
      <p className="text-xl font-bold leading-snug text-white/85">{m.setup}</p>
      <AnimatePresence mode="wait">
        {shown ? (
          <motion.p
            key="punch"
            className="text-gradient text-2xl font-black leading-snug"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
          >
            {m.punch}
          </motion.p>
        ) : (
          <motion.button
            key="cover"
            onClick={() => setShown(true)}
            exit={{ opacity: 0 }}
            className="glass w-full rounded-2xl py-5 text-sm font-bold text-white/60"
          >
            Tap for the rest
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}

function FinaleView({ m }: { m: FinaleModule }) {
  return (
    <div className="space-y-6 text-center">
      <motion.div
        className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/15 ring-1 ring-rose-400/30"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 1.6, repeat: Infinity }}
      >
        <Heart className="h-9 w-9 text-rose-300" />
      </motion.div>
      <Title>{m.headline}</Title>
      <p className="text-[15px] leading-relaxed text-white/75">{m.body}</p>
      <Link
        href="/after-dark"
        className="block w-full rounded-2xl bg-gradient-to-r from-rose-600 to-magenta py-4 text-base font-bold shadow-glow-magenta transition active:scale-[0.98]"
      >
        Open After Dark 🌙
      </Link>
    </div>
  );
}

/* -------------------------------------------------------------- dispatch */

export function ModuleView({ module: m }: { module: AnniversaryModule }) {
  switch (m.kind) {
    case "banner":
      return <BannerView m={m} />;
    case "message":
      return <MessageView m={m} />;
    case "voice":
      return <VoiceView m={m} />;
    case "photo":
      return <PhotoView m={m} />;
    case "photoGuess":
      return <PhotoGuessView m={m} />;
    case "numbers":
      return <NumbersView m={m} />;
    case "itinerary":
      return <ItineraryView m={m} />;
    case "joke":
      return <JokeView m={m} />;
    case "finale":
      return <FinaleView m={m} />;
  }
}

/** tiny icon for the director list, so Panda can scan by shape not just text */
export function ModuleGlyph({ module: m, className }: { module: AnniversaryModule; className?: string }) {
  const Icon =
    m.kind === "itinerary"
      ? ITINERARY_ICONS[m.icon]
      : m.kind === "voice"
        ? Mic
        : m.kind === "photo" || m.kind === "photoGuess"
          ? Sparkles
          : m.kind === "numbers"
            ? Cake
            : m.kind === "finale"
              ? Heart
              : Gift;
  return <Icon className={className} />;
}
