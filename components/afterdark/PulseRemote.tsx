"use client";

// After Dark "Pulse": one phone drives the other phone's motor over Supabase
// broadcast. Either device can be the controller or the receiver, and roles
// swap with one tap, which matters a lot here: Android can produce every
// pattern including a solid buzz, an iPhone can only tap. If the iPhone side
// feels like nothing, swap so the Android is the one being held.
//
// Safety is not a feature bolted on the side, it is the shape of the thing:
// whoever is RECEIVING always has a full width STOP on screen, and the receiver
// stops itself if the page is hidden, if the controller goes quiet for ten
// seconds, or after the engine's own twenty minute cap. Nothing can keep
// running behind a lock screen or after someone walks away.
//
// Deliberately does NOT write to the database or fire partner notifications.
// After Dark has always been a sealed room (Phase 7 touched no store actions),
// and an 18+ event does not belong in the notification board.

import { useAuth } from "@/lib/auth";
import { openBroadcast, type BroadcastLink, type BroadcastStatus } from "@/lib/broadcast";
import { cn } from "@/lib/cn";
import {
  MAX_INTENSITY,
  MIN_INTENSITY,
  PULSE_MODES,
  capabilityNote,
  createPulseEngine,
  hapticsCapability,
  tapOnce,
  type PulseEngine,
  type PulseMode,
  type StopReason,
} from "@/lib/haptics";
import { partnerUser } from "@/lib/identity";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeftRight, Send, Square, Vibrate, Wifi, WifiOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

type Role = "pick" | "controller" | "receiver" | "solo";

const PING_MS = 3_000;
const LINK_TIMEOUT_MS = 10_000;

/** how the receiver's orb breathes for each mode */
const ORB: Record<PulseMode, { scale: number[]; duration: number }> = {
  constant: { scale: [1, 1.07, 1], duration: 1.1 },
  pulse: { scale: [1, 1.28, 1], duration: 0.55 },
  wave: { scale: [1, 1.1, 1.34, 1.1, 1], duration: 2.4 },
  heartbeat: { scale: [1, 1.22, 1.05, 1.18, 1], duration: 1.25 },
  tease: { scale: [1, 1.3, 1.02, 1.16, 1.06, 1.24, 1], duration: 1.9 },
};

export function PulseRemote({ onExit }: { onExit: () => void }) {
  const auth = useAuth();
  const coupleId = auth.couple?.id ?? null;
  const her = partnerUser();

  const [role, setRole] = useState<Role>("pick");
  const [armed, setArmed] = useState(false);
  const [mode, setMode] = useState<PulseMode | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [partnerHere, setPartnerHere] = useState(false);
  const [linkStatus, setLinkStatus] = useState<BroadcastStatus>("joining");
  const [notice, setNotice] = useState<string | null>(null);

  const engineRef = useRef<PulseEngine | null>(null);
  const linkRef = useRef<BroadcastLink | null>(null);
  const lastPing = useRef(0);
  // handlers live for the lifetime of the channel, so current values ride refs
  const roleRef = useRef<Role>("pick");
  const armedRef = useRef(false);
  const intensityRef = useRef(3);
  roleRef.current = role;
  armedRef.current = armed;
  intensityRef.current = intensity;

  const capability = hapticsCapability();

  /* ------------------------------------------------------------- engine */
  useEffect(() => {
    const engine = createPulseEngine({
      onAutoStop: (reason: StopReason) => {
        setMode(null);
        setNotice(
          reason === "hidden"
            ? "Stopped, because the app left the screen."
            : reason === "timeout"
              ? "Stopped after twenty minutes. Start it again whenever."
              : "This device cannot vibrate from the browser."
        );
      },
    });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  /* ---------------------------------------------------------- broadcast */
  useEffect(() => {
    if (!coupleId) return;

    const applyStop = () => {
      engineRef.current?.stop();
      setMode(null);
    };

    const link = openBroadcast(
      `pulse:${coupleId}`,
      {
        set: (p) => {
          if (roleRef.current !== "receiver" || !armedRef.current) return;
          const next = p.mode as PulseMode | undefined;
          const level = typeof p.intensity === "number" ? p.intensity : intensityRef.current;
          if (!next) return;
          setNotice(null);
          setMode(next);
          setIntensity(level);
          engineRef.current?.start(next, level);
        },
        stop: () => {
          if (roleRef.current !== "receiver") return;
          applyStop();
        },
        ping: () => {
          lastPing.current = Date.now();
          setPartnerHere(true);
        },
        hello: () => {
          setPartnerHere(true);
          linkRef.current?.send("here", { role: roleRef.current });
        },
        here: () => setPartnerHere(true),
        swap: () => {
          // the other side asked to trade places
          applyStop();
          setArmed(false);
          setRole((cur) => (cur === "receiver" ? "controller" : cur === "controller" ? "receiver" : cur));
        },
        bye: () => setPartnerHere(false),
      },
      setLinkStatus
    );

    linkRef.current = link;
    link?.send("hello", {});

    return () => {
      link?.send("bye", {});
      link?.close();
      linkRef.current = null;
    };
  }, [coupleId]);

  /* controller heartbeat, so the receiver can tell the link is still alive */
  useEffect(() => {
    if (role !== "controller") return;
    const beat = () => linkRef.current?.send("ping", {});
    beat();
    const t = setInterval(beat, PING_MS);
    return () => clearInterval(t);
  }, [role]);

  /* receiver watchdog: controller went quiet, so stop */
  useEffect(() => {
    if (role !== "receiver") return;
    const t = setInterval(() => {
      if (!engineRef.current?.running()) return;
      if (lastPing.current && Date.now() - lastPing.current > LINK_TIMEOUT_MS) {
        engineRef.current?.stop();
        setMode(null);
        setPartnerHere(false);
        setNotice("Lost the connection, so it stopped.");
      }
    }, 2_000);
    return () => clearInterval(t);
  }, [role]);

  /* keep the receiver's screen awake, or the motor dies with the display */
  useEffect(() => {
    if (role !== "receiver" || !armed) return;
    type Sentinel = { release?: () => Promise<void> | void };
    const nav = navigator as Navigator & { wakeLock?: { request(t: "screen"): Promise<Sentinel> } };
    let sentinel: Sentinel | null = null;
    let cancelled = false;

    const acquire = () => {
      if (cancelled || sentinel || document.visibilityState !== "visible") return;
      nav.wakeLock
        ?.request("screen")
        .then((s) => {
          if (cancelled) void s.release?.();
          else sentinel = s;
        })
        .catch(() => {
          /* not supported or refused: the screen may sleep, nothing we can do */
        });
    };
    acquire();
    const onVisible = () => {
      sentinel = null;
      acquire();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      void sentinel?.release?.();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [role, armed]);

  /* ------------------------------------------------------------ actions */

  const drive = useCallback(
    (nextMode: PulseMode, nextIntensity: number) => {
      setNotice(null);
      setMode(nextMode);
      if (roleRef.current === "solo") {
        engineRef.current?.start(nextMode, nextIntensity);
      } else {
        linkRef.current?.send("set", { mode: nextMode, intensity: nextIntensity });
      }
    },
    []
  );

  const pickMode = (m: PulseMode) => {
    tapOnce();
    drive(m, intensity);
  };

  const pickIntensity = (level: number) => {
    tapOnce();
    setIntensity(level);
    if (mode) drive(mode, level);
  };

  const stopAll = useCallback(() => {
    engineRef.current?.stop();
    setMode(null);
    if (roleRef.current !== "solo") linkRef.current?.send("stop", {});
  }, []);

  const swapRoles = () => {
    stopAll();
    setArmed(false);
    linkRef.current?.send("swap", {});
    setRole((cur) => (cur === "controller" ? "receiver" : "controller"));
  };

  const exit = () => {
    stopAll();
    onExit();
  };

  /* --------------------------------------------------------------- views */

  const LinkPill = () => {
    const good = partnerHere && linkStatus === "joined";
    return (
      <span
        className={cn(
          "glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold",
          good ? "text-emerald-300" : "text-white/45"
        )}
      >
        {good ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
        {good ? `${her.name}'s phone is here` : "Waiting for the other phone"}
      </span>
    );
  };

  const TopBar = ({ showSwap }: { showSwap: boolean }) => (
    <div className="flex items-center justify-between pt-1">
      <LinkPill />
      <div className="flex items-center gap-2">
        {showSwap && (
          <button
            onClick={swapRoles}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold text-rose-300"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Swap
          </button>
        )}
        <button onClick={exit} className="glass rounded-full p-2 text-white/60" aria-label="Leave pulse">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  const Notice = () =>
    notice ? (
      <p className="rounded-xl bg-amber-500/10 px-3 py-2 text-center text-xs text-amber-200 ring-1 ring-amber-400/20">
        {notice}
      </p>
    ) : null;

  /* ---- role picker */
  if (role === "pick") {
    return (
      <div className="flex min-h-[70vh] flex-col justify-center space-y-6">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-500/15 text-3xl ring-1 ring-rose-400/30">
            <Vibrate className="h-7 w-7 text-rose-300" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            Pulse<span className="text-rose-400">.</span>
          </h1>
          <p className="text-sm text-white/50">One of you drives. The other one holds it.</p>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => {
              tapOnce();
              setRole("controller");
            }}
            className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-400/25">
              <Send className="h-5 w-5 text-rose-300" />
            </span>
            <span>
              <span className="block text-sm font-bold">I am driving</span>
              <span className="block text-xs text-white/45">
                This phone becomes the remote for {her.name}&apos;s phone.
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              tapOnce();
              setRole("receiver");
            }}
            className="glass flex w-full items-center gap-4 rounded-2xl p-4 text-left transition active:scale-[0.98]"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-magenta/15 ring-1 ring-magenta/25">
              <Vibrate className="h-5 w-5 text-rose-200" />
            </span>
            <span>
              <span className="block text-sm font-bold">I am holding it</span>
              <span className="block text-xs text-white/45">
                This phone does the buzzing. {her.name} controls it.
              </span>
            </span>
          </button>

          <button
            onClick={() => {
              tapOnce();
              setRole("solo");
            }}
            className="w-full rounded-2xl border border-white/10 p-3 text-center text-xs font-semibold text-white/50 transition active:scale-[0.98]"
          >
            Just try it on this phone
          </button>
        </div>

        <p className="text-center text-[11px] leading-relaxed text-white/35">{capabilityNote(capability)}</p>

        <button onClick={onExit} className="text-center text-xs text-white/40 underline-offset-2 hover:underline">
          Back to After Dark
        </button>
      </div>
    );
  }

  /* ---- receiver, before the arming tap (which is also the gesture the
         browser demands before it will let us vibrate at all) */
  if (role === "receiver" && !armed) {
    return (
      <div className="space-y-5">
        <TopBar showSwap />
        <div className="flex min-h-[60vh] flex-col justify-center space-y-6 text-center">
          <div className="space-y-2">
            <h1 className="text-2xl font-black">Ready when you are.</h1>
            <p className="mx-auto max-w-xs text-sm text-white/50">
              Keep this screen open and awake. If the app goes to the background or the phone locks,
              it stops on its own.
            </p>
          </div>
          <button
            onClick={() => {
              tapOnce();
              setArmed(true);
              linkRef.current?.send("here", { role: "receiver" });
            }}
            className="w-full rounded-2xl bg-gradient-to-r from-rose-600 to-magenta py-5 text-base font-bold shadow-glow-magenta transition active:scale-[0.98]"
          >
            I am ready
          </button>
          <p className="text-[11px] leading-relaxed text-white/35">{capabilityNote(capability)}</p>
        </div>
      </div>
    );
  }

  /* ---- receiver, live */
  if (role === "receiver") {
    const orb = mode ? ORB[mode] : null;
    return (
      <div className="space-y-5">
        <TopBar showSwap />
        <div className="flex min-h-[58vh] flex-col items-center justify-center space-y-8">
          <div className="relative flex h-56 w-56 items-center justify-center">
            <AnimatePresence>
              {orb && (
                <motion.div
                  key={mode}
                  className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-500/30 to-magenta/20 blur-2xl"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, scale: orb.scale }}
                  exit={{ opacity: 0 }}
                  transition={{
                    scale: { duration: orb.duration, repeat: Infinity, ease: "easeInOut" },
                    opacity: { duration: 0.3 },
                  }}
                />
              )}
            </AnimatePresence>
            <motion.div
              className="relative flex h-40 w-40 items-center justify-center rounded-full bg-rose-500/10 ring-1 ring-rose-400/30"
              animate={orb ? { scale: orb.scale } : { scale: 1 }}
              transition={
                orb ? { duration: orb.duration, repeat: Infinity, ease: "easeInOut" } : { duration: 0.4 }
              }
            >
              <Vibrate className={cn("h-12 w-12", mode ? "text-rose-200" : "text-white/25")} />
            </motion.div>
          </div>

          <div className="space-y-1 text-center">
            <p className="text-lg font-black">
              {mode ? PULSE_MODES.find((m) => m.key === mode)?.label : "Nothing right now"}
            </p>
            <p className="text-xs text-white/45">
              {mode ? `Level ${intensity} of ${MAX_INTENSITY}` : `${her.name} is choosing.`}
            </p>
          </div>

          <Notice />

          <button
            onClick={() => {
              tapOnce();
              stopAll();
            }}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 py-5 text-base font-bold ring-1 ring-white/15 transition active:scale-[0.98]"
          >
            <Square className="h-4 w-4" />
            Stop
          </button>
          <p className="text-center text-[11px] text-white/30">
            This button is yours. No reason needed, ever.
          </p>
        </div>
      </div>
    );
  }

  /* ---- controller (and solo, which is the same panel driving this phone) */
  const solo = role === "solo";
  return (
    <div className="space-y-5">
      {solo ? (
        <div className="flex items-center justify-between pt-1">
          <span className="glass rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/45">
            This phone only
          </span>
          <button onClick={exit} className="glass rounded-full p-2 text-white/60" aria-label="Leave pulse">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <TopBar showSwap />
      )}

      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight">
          {solo ? "Feel it yourself" : `You have the remote`}
        </h1>
        <p className="text-xs text-white/45">
          {solo
            ? "Everything runs on this phone, nothing is sent anywhere."
            : `Tap a pattern and it starts on ${her.name}'s phone.`}
        </p>
      </div>

      <div className="grid gap-2">
        {PULSE_MODES.map((m) => (
          <button
            key={m.key}
            onClick={() => pickMode(m.key)}
            className={cn(
              "flex items-center justify-between rounded-2xl p-4 text-left transition active:scale-[0.98]",
              mode === m.key
                ? "bg-gradient-to-r from-rose-600 to-magenta shadow-glow-magenta"
                : "glass"
            )}
          >
            <span>
              <span className="block text-sm font-bold">{m.label}</span>
              <span className={cn("block text-xs", mode === m.key ? "text-white/70" : "text-white/40")}>
                {m.hint}
              </span>
            </span>
            {mode === m.key && <span className="text-[11px] font-black uppercase tracking-widest">Live</span>}
          </button>
        ))}
      </div>

      <div className="glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-widest text-rose-300">Level</p>
          <p className="text-xs text-white/40">
            {intensity} of {MAX_INTENSITY}
          </p>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: MAX_INTENSITY - MIN_INTENSITY + 1 }, (_, idx) => idx + MIN_INTENSITY).map(
            (level) => (
              <button
                key={level}
                onClick={() => pickIntensity(level)}
                aria-label={`Level ${level}`}
                className={cn(
                  "h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-[0.96]",
                  level <= intensity
                    ? "bg-gradient-to-br from-rose-500 to-magenta"
                    : "bg-white/5 text-white/30 ring-1 ring-white/10"
                )}
              >
                {level}
              </button>
            )
          )}
        </div>
        <p className="text-[11px] leading-relaxed text-white/35">
          The web cannot change motor strength, so level changes the rhythm and how much of it is on.
          Five is as solid as the phone gets.
        </p>
      </div>

      <Notice />

      <button
        onClick={() => {
          tapOnce();
          stopAll();
        }}
        disabled={!mode}
        className={cn(
          "flex w-full items-center justify-center gap-2 rounded-2xl py-5 text-base font-bold transition active:scale-[0.98]",
          mode ? "bg-white/10 ring-1 ring-white/15" : "bg-white/5 text-white/25"
        )}
      >
        <Square className="h-4 w-4" />
        Stop
      </button>

      {!solo && (
        <p className="text-center text-[11px] leading-relaxed text-white/30">
          {her.name}&apos;s app has to stay open with the screen on. Her Stop button always wins, and it
          stops itself if her phone locks or the link drops.
        </p>
      )}
    </div>
  );
}
