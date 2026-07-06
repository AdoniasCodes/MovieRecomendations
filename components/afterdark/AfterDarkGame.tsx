"use client";

import { DECK } from "@/lib/afterdark/deck";
import {
  Card,
  GameState,
  HEAT_NAMES,
  HEAT_TAGLINES,
  applyCard,
  draw,
  freshGame,
  renderCard,
  skipCard,
  turnUpHeat,
} from "@/lib/afterdark/engine";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { EyeOff, Flame, Link2, Moon, Pause, SkipForward, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const HOLD_MS = 3000;

export function AfterDarkGame() {
  const store = useStore();
  const [phase, setPhase] = useState<"consent" | "playing" | "recap">("consent");
  const [game, setGame] = useState<GameState>(() => freshGame("me"));
  const [card, setCard] = useState<Card | null>(null);
  const [rolling, setRolling] = useState(false);
  const [paused, setPaused] = useState(false);
  const [skipsUsed, setSkipsUsed] = useState(0);
  const [wildsDrawn, setWildsDrawn] = useState(0);
  const maxHeatRef = useRef(1);

  // countdown timer for timed cards
  const [timer, setTimer] = useState<{ left: number; total: number } | null>(null);
  useEffect(() => {
    if (!timer || timer.left <= 0 || paused) return;
    const t = setInterval(
      () => setTimer((cur) => (cur ? { ...cur, left: Math.max(0, cur.left - 1) } : cur)),
      1000
    );
    return () => clearInterval(t);
  }, [timer !== null, timer?.left === 0, paused]); // eslint-disable-line react-hooks/exhaustive-deps

  // hold-to-upgrade
  const [holdPct, setHoldPct] = useState(0);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startHold = () => {
    if (game.heat >= 4 || holdRef.current) return;
    const startedAt = performance.now();
    holdRef.current = setInterval(() => {
      const pct = Math.min(100, ((performance.now() - startedAt) / HOLD_MS) * 100);
      setHoldPct(pct);
      if (pct >= 100) {
        endHold();
        setGame((g) => turnUpHeat(g));
        try {
          navigator.vibrate?.(80);
        } catch {}
      }
    }, 40);
  };
  const endHold = () => {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
    setHoldPct(0);
  };
  useEffect(() => () => endHold(), []);
  useEffect(() => {
    maxHeatRef.current = Math.max(maxHeatRef.current, game.heat);
  }, [game.heat]);

  const roller = game.turn === "me" ? store.me : store.partner;
  const partnerOfRoller = game.turn === "me" ? store.partner : store.me;

  const roll = () => {
    if (rolling) return;
    setRolling(true);
    setCard(null);
    setTimer(null);
    setTimeout(() => {
      const next = draw(DECK, game);
      setCard(next);
      if (next.wild) setWildsDrawn((n) => n + 1);
      setRolling(false);
    }, 900);
  };

  const done = () => {
    if (!card) return;
    setGame((g) => applyCard(g, card));
    setCard(null);
    setTimer(null);
  };

  const skip = () => {
    if (!card || game.players[game.turn].skipsLeft <= 0) return;
    setGame((g) => skipCard(g, card.id));
    setSkipsUsed((n) => n + 1);
    setCard(null);
    setTimer(null);
  };

  const restart = () => {
    setGame(freshGame("me"));
    setCard(null);
    setTimer(null);
    setSkipsUsed(0);
    setWildsDrawn(0);
    maxHeatRef.current = 1;
    setPhase("consent");
  };

  /* ---------------------------------------------------------- consent gate */
  if (phase === "consent") {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center space-y-6 text-center">
        <div className="space-y-2">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/15 text-3xl ring-1 ring-rose-400/30">
            🌙
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            After <span className="text-rose-400">Dark</span>
          </h1>
          <p className="text-sm text-white/50">
            A dice game for exactly two people. The dice decides, you two deliver.
          </p>
        </div>
        <div className="glass space-y-3 rounded-2xl p-5 text-left text-sm">
          <p className="font-semibold text-rose-300">House rules</p>
          <ul className="space-y-2 text-white/70">
            <li>1. The Pause button is sacred. Either of you can hit it, anytime, no reason needed.</li>
            <li>2. Every card is an invitation, never an obligation. You each get 3 skips.</li>
            <li>3. The deck already knows your limits. What is off the table stays off the table.</li>
            <li>4. Heat only goes up when you BOTH hold the button. That is the whole point.</li>
          </ul>
        </div>
        <button
          onClick={() => setPhase("playing")}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-magenta py-4 text-base font-bold shadow-glow-magenta transition active:scale-[0.98]"
        >
          We are both in 🔥
        </button>
        <Link href="/profile" className="text-xs text-white/40 underline-offset-2 hover:underline">
          Actually, back to the movies
        </Link>
      </div>
    );
  }

  /* ---------------------------------------------------------------- recap */
  if (phase === "recap") {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center space-y-6 text-center">
        <div className="space-y-2">
          <div className="text-4xl">🥵</div>
          <h1 className="text-2xl font-black">Well played, you two.</h1>
        </div>
        <div className="glass grid grid-cols-3 gap-2 rounded-2xl p-5">
          <Stat label="Cards played" value={String(game.rolls)} />
          <Stat label="Peak heat" value={HEAT_NAMES[maxHeatRef.current as 1 | 2 | 3 | 4]} />
          <Stat label="Wild cards" value={String(wildsDrawn)} />
        </div>
        <p className="text-sm text-white/50">
          {skipsUsed === 0 ? "Zero skips used. Impressive." : `${skipsUsed} skip${skipsUsed === 1 ? "" : "s"} used. Fair enough.`}
        </p>
        <button
          onClick={restart}
          className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-magenta py-4 text-base font-bold shadow-glow-magenta"
        >
          Round two?
        </button>
        <Link href="/profile" className="text-xs text-white/40 underline-offset-2 hover:underline">
          Back to the movies. Goodnight 🌙
        </Link>
      </div>
    );
  }

  /* ----------------------------------------------------------------- game */
  return (
    <div className="space-y-5">
      {/* header */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <Moon className="h-5 w-5 text-rose-400" />
          <h1 className="text-lg font-black tracking-tight">After Dark</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPaused(true)}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-rose-300"
          >
            <Pause className="h-3.5 w-3.5" /> Pause
          </button>
          <button
            onClick={() => setPhase("recap")}
            className="glass rounded-full p-1.5 text-white/50"
            aria-label="End the night"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* heat meter */}
      <div className="glass rounded-2xl p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-white/40">Heat</span>
          <span className="text-xs font-bold text-rose-300">
            {HEAT_NAMES[game.heat]} · {HEAT_TAGLINES[game.heat]}
          </span>
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4] as const).map((h) => (
            <div
              key={h}
              className={cn(
                "flex h-8 flex-1 items-center justify-center rounded-lg text-sm transition",
                h <= game.heat ? "bg-gradient-to-r from-rose-600/80 to-magenta/80" : "bg-white/[0.05]"
              )}
            >
              <Flame className={cn("h-4 w-4", h <= game.heat ? "text-white" : "text-white/20")} />
            </div>
          ))}
        </div>
        {game.heat < 4 && (
          <button
            onPointerDown={startHold}
            onPointerUp={endHold}
            onPointerLeave={endHold}
            className="relative mt-3 w-full overflow-hidden rounded-xl border border-rose-400/30 py-2.5 text-xs font-bold text-rose-300"
          >
            <span
              className="absolute inset-y-0 left-0 bg-rose-500/30 transition-[width]"
              style={{ width: `${holdPct}%` }}
            />
            <span className="relative">Both hold to turn up the heat (3s)</span>
          </button>
        )}
      </div>

      {/* players strip */}
      <div className="grid grid-cols-2 gap-2">
        {(["me", "her"] as const).map((id) => {
          const u = id === "me" ? store.me : store.partner;
          const p = game.players[id];
          const isTurn = game.turn === id;
          return (
            <div
              key={id}
              className={cn(
                "glass rounded-2xl p-3 transition",
                isTurn && "ring-1 ring-rose-400/50"
              )}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{u.emoji}</span>
                <span className="text-sm font-bold">{u.name}</span>
                {isTurn && <span className="ml-auto text-[10px] font-bold uppercase text-rose-300">rolls</span>}
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {[1, 2, 3].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      "h-1.5 w-4 rounded-full",
                      i <= p.clothing ? "bg-white/50" : "bg-rose-500/60"
                    )}
                  />
                ))}
                {p.blindfolded && <EyeOff className="h-3.5 w-3.5 text-rose-300" />}
                {p.restrained && <Link2 className="h-3.5 w-3.5 text-rose-300" />}
                <span className="ml-auto text-[10px] text-white/35">{p.skipsLeft} skips</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* the table: dice or card */}
      <div className="flex min-h-[280px] flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {rolling ? (
            <motion.div
              key="dice"
              initial={{ scale: 0.6, rotate: 0 }}
              animate={{ rotate: [0, 200, 360, 540, 720], scale: [0.8, 1.15, 0.95, 1.1, 1] }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.9, ease: "easeInOut" }}
              className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-600 to-magenta text-4xl shadow-glow-magenta"
            >
              🎲
            </motion.div>
          ) : card ? (
            <motion.div
              key={card.id}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.35 }}
              className={cn(
                "glass-strong w-full rounded-3xl p-6",
                card.wild && "ring-2 ring-rose-400/60 shadow-glow-magenta"
              )}
            >
              <div className="mb-3 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                <span className="text-rose-300">
                  {card.wild ? "Wild card" : `${HEAT_NAMES[card.heat]} · ${roller.name}'s move`}
                </span>
                {card.wild && <Sparkles className="h-4 w-4 text-rose-300" />}
              </div>
              <p className="text-lg font-semibold leading-relaxed">
                {renderCard(card.text, partnerOfRoller.name)}
              </p>
              {card.timerSec && (
                <div className="mt-4">
                  {timer ? (
                    <div className="space-y-1.5">
                      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-rose-500 to-magenta transition-all duration-1000"
                          style={{ width: `${(timer.left / timer.total) * 100}%` }}
                        />
                      </div>
                      <p className="text-center text-xs font-bold text-rose-300">
                        {timer.left > 0 ? `${timer.left}s` : "Time. Hands where we can see them."}
                      </p>
                    </div>
                  ) : (
                    <button
                      onClick={() => setTimer({ left: card.timerSec!, total: card.timerSec! })}
                      className="w-full rounded-xl border border-rose-400/30 py-2 text-xs font-bold text-rose-300"
                    >
                      Start the {card.timerSec}s timer
                    </button>
                  )}
                </div>
              )}
              <div className="mt-5 flex gap-2">
                <button
                  onClick={done}
                  className="flex-1 rounded-xl bg-gradient-to-r from-rose-600 to-magenta py-3 text-sm font-bold transition active:scale-[0.98]"
                >
                  Done. Next victim.
                </button>
                <button
                  onClick={skip}
                  disabled={game.players[game.turn].skipsLeft <= 0}
                  className="glass flex items-center gap-1 rounded-xl px-4 text-xs font-semibold text-white/60 disabled:opacity-30"
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="roll"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={roll}
              className="flex flex-col items-center gap-3"
            >
              <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-rose-600 to-magenta text-4xl shadow-glow-magenta transition active:scale-95">
                🎲
              </span>
              <span className="text-sm font-bold text-white/70">
                {roller.emoji} {roller.name}, roll the dice
              </span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* pause modal (blocking, by design) */}
      <AnimatePresence>
        {paused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-strong w-full max-w-sm space-y-4 rounded-3xl p-6 text-center"
            >
              <div className="text-3xl">🤍</div>
              <h2 className="text-lg font-black">Paused. Check in.</h2>
              <p className="text-sm text-white/60">
                Water, breath, a real look at each other. Everything okay? Anything to dial up or down?
              </p>
              <button
                onClick={() => setPaused(false)}
                className="w-full rounded-xl bg-gradient-to-r from-rose-600 to-magenta py-3 text-sm font-bold"
              >
                We are good, keep going
              </button>
              <button
                onClick={() => {
                  setPaused(false);
                  setPhase("recap");
                }}
                className="w-full rounded-xl border border-white/10 py-3 text-sm font-semibold text-white/60"
              >
                End the night here
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xl font-black text-rose-300">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
    </div>
  );
}
