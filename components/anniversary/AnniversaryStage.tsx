"use client";

// Hermi's side of July 31. A full takeover that shows whatever Panda fires from
// his phone, in whatever order he decides on the day.
//
// Mounted globally in app/providers.tsx so it can appear over any tab. z-[90]:
// above every other overlay in the app, below WelcomeGate (z-100) so the
// identity picker still wins when the app is deciding who is holding the phone.
//
// Two ways it comes alive:
//   1. The morning. On July 31, Hermi's first app open fires the banner by
//      itself, once per device, and she can walk forward to the first letter and
//      then close it. That is the only self-driven part.
//   2. The rest of the day. Panda sends `show` from his director panel and this
//      takes over instantly. No next button, no way to run ahead, because he is
//      pacing it around a real day.
//
// The presenter's own device never reacts to its own messages (broadcast is
// opened with self: false), so his panel is never hijacked by his own sends.

import { ModuleView } from "@/components/anniversary/ModuleView";
import {
  STAGE_EVENTS,
  STAGE_OPENED_KEY,
  clearStageCache,
  readStageCache,
  stageTopic,
  writeStageCache,
} from "@/lib/anniversary/channel";
import { isAnniversaryDay } from "@/lib/anniversary/date";
import { OPENING_MODULE_ID, moduleById } from "@/lib/anniversary/script";
import { useAuth } from "@/lib/auth";
import { openBroadcast, type BroadcastLink } from "@/lib/broadcast";
import { identityFromEmail, useWhoami } from "@/lib/identity";
import { AnimatePresence, motion } from "framer-motion";
import { Volume2, VolumeX } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const HEARTS = Array.from({ length: 14 });
/** the letter the morning banner walks forward to */
const MORNING_FOLLOW_UP = "letter-morning";
/** long-press duration on the hidden escape dot */
const ESCAPE_MS = 1500;

export function AnniversaryStage() {
  const auth = useAuth();
  const who = useWhoami();
  const coupleId = auth.couple?.id ?? null;
  // the morning takeover must fire on HER phone and only hers, so it keys off
  // the signed-in account rather than the local display toggle
  const realWho = auth.configured ? identityFromEmail(auth.session?.user.email) : who;

  const [active, setActive] = useState(false);
  const [moduleId, setModuleId] = useState<string | null>(null);
  const [blanked, setBlanked] = useState(false);
  /** true while she is walking the morning pair herself */
  const [selfPaced, setSelfPaced] = useState(false);
  const [muted, setMuted] = useState(true);

  const linkRef = useRef<BroadcastLink | null>(null);
  const ambient = useRef<HTMLAudioElement | null>(null);
  // the channel handlers live for the channel's lifetime, so the current module
  // id has to reach them through a ref rather than a closure
  const moduleIdRef = useRef<string | null>(null);
  moduleIdRef.current = moduleId;

  /* ------------------------------------------------- the morning surprise */
  useEffect(() => {
    if (realWho !== "hermi" || !isAnniversaryDay()) return;
    try {
      if (window.localStorage.getItem(STAGE_OPENED_KEY)) return;
      window.localStorage.setItem(STAGE_OPENED_KEY, String(Date.now()));
    } catch {
      /* storage blocked: it just means it can fire again, which is survivable */
    }
    setActive(true);
    setSelfPaced(true);
    setModuleId(OPENING_MODULE_ID);
    try {
      navigator.vibrate?.([60, 40, 60, 40, 180]);
    } catch {}
  }, [realWho]);

  /* ---------------------------------------- restore after an accidental reload */
  useEffect(() => {
    const cached = readStageCache();
    if (!cached) return;
    if (cached.moduleId || cached.blanked) {
      setActive(true);
      setModuleId(cached.moduleId);
      setBlanked(cached.blanked);
    }
  }, []);

  /* ----------------------------------------------------- listen for Panda */
  useEffect(() => {
    if (!coupleId) return;

    const show = (id: string) => {
      if (!moduleById(id)) return;
      setSelfPaced(false);
      setBlanked(false);
      setActive(true);
      setModuleId(id);
      writeStageCache(id, false);
      linkRef.current?.send(STAGE_EVENTS.ack, { moduleId: id });
      try {
        navigator.vibrate?.(45);
      } catch {}
    };

    const hold = () => {
      setSelfPaced(false);
      setActive(true);
      setBlanked(true);
      setModuleId(null);
      writeStageCache(null, true);
      linkRef.current?.send(STAGE_EVENTS.ack, { moduleId: null });
    };

    const link = openBroadcast(stageTopic(coupleId), {
      [STAGE_EVENTS.show]: (p) => {
        if (typeof p.moduleId === "string") show(p.moduleId);
      },
      [STAGE_EVENTS.blank]: hold,
      [STAGE_EVENTS.end]: () => {
        setActive(false);
        setBlanked(false);
        setModuleId(null);
        setSelfPaced(false);
        clearStageCache();
      },
      // he just opened his panel and is asking what we have on screen
      [STAGE_EVENTS.hello]: () => {
        linkRef.current?.send(STAGE_EVENTS.ack, { moduleId: moduleIdRef.current });
      },
      // His answer to OUR hello, after we reloaded or reconnected mid-story.
      // This is the only way to recover anything he sent while this device's
      // channel was down, so it has to cover the holding screen too.
      [STAGE_EVENTS.state]: (p) => {
        if (typeof p.moduleId === "string") show(p.moduleId);
        else if (p.blanked === true) hold();
      },
    });

    linkRef.current = link;
    link?.send(STAGE_EVENTS.hello, {});

    return () => {
      link?.close();
      linkRef.current = null;
    };
  }, [coupleId]);

  /* ------------------------------------------------------- ambient sound */
  const unlockAudio = useCallback(() => {
    const el = ambient.current;
    if (!el || !muted) return;
    // iOS will not start audio without a gesture, so the first touch does it
    el.volume = 0.35;
    void el.play().then(() => setMuted(false)).catch(() => {
      /* no track yet, or refused: silence is fine */
    });
  }, [muted]);

  const toggleMute = () => {
    const el = ambient.current;
    if (!el) return;
    if (muted) {
      el.volume = 0.35;
      void el.play().then(() => setMuted(false)).catch(() => {});
    } else {
      el.pause();
      setMuted(true);
    }
  };

  /* --------------------------------------------------------- escape hatch */
  // Deliberately hard to find: a takeover she can dismiss by accident is not a
  // surprise. But being trapped in the app if something breaks is worse, so a
  // long press on the corner dot always releases it on her device. He can
  // simply send the module again.
  const escapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startEscape = () => {
    escapeTimer.current = setTimeout(() => {
      setActive(false);
      setModuleId(null);
      setBlanked(false);
      clearStageCache();
    }, ESCAPE_MS);
  };
  const cancelEscape = () => {
    if (escapeTimer.current) clearTimeout(escapeTimer.current);
    escapeTimer.current = null;
  };
  useEffect(() => () => cancelEscape(), []);

  const current = moduleId ? moduleById(moduleId) : null;

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          className="fixed inset-0 z-[90] overflow-y-auto overscroll-contain"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onPointerDown={unlockAudio}
        >
          {/* backdrop */}
          <div className="fixed inset-0 bg-base/95 backdrop-blur-xl" />
          <div className="app-aurora fixed inset-0 opacity-60" />

          {/* rising hearts, same motif as the nudge takeover */}
          <div className="pointer-events-none fixed inset-0 overflow-hidden">
            {HEARTS.map((_, i) => {
              const left = (i * 37 + 9) % 100;
              const delay = (i % 7) * 0.55;
              const size = 12 + ((i * 5) % 16);
              return (
                <motion.span
                  key={i}
                  className="absolute bottom-[-8%]"
                  style={{ left: `${left}%`, fontSize: size }}
                  initial={{ y: 0, opacity: 0 }}
                  animate={{ y: "-112vh", opacity: [0, 0.9, 0.9, 0] }}
                  transition={{
                    duration: 5.5 + (i % 5) * 0.7,
                    delay,
                    repeat: Infinity,
                    ease: "easeIn",
                  }}
                >
                  {i % 3 === 0 ? "💞" : i % 3 === 1 ? "💗" : "🤍"}
                </motion.span>
              );
            })}
          </div>

          {/* the hidden way out */}
          <button
            aria-label="Close"
            onPointerDown={startEscape}
            onPointerUp={cancelEscape}
            onPointerLeave={cancelEscape}
            onPointerCancel={cancelEscape}
            className="fixed right-3 top-3 z-20 h-8 w-8 rounded-full opacity-[0.12] transition active:opacity-40"
          >
            <span className="mx-auto block h-1.5 w-1.5 rounded-full bg-white" />
          </button>

          {/* mute toggle */}
          <button
            onClick={toggleMute}
            aria-label={muted ? "Play music" : "Mute music"}
            className="glass fixed bottom-4 left-4 z-20 rounded-full p-2.5 text-white/50"
          >
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>

          {/* content */}
          <div className="relative z-10 mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-6 py-16">
            <AnimatePresence mode="wait">
              {current ? (
                <motion.div
                  key={current.id}
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ModuleView module={current} />

                  {/* the morning pair is the only part she walks herself */}
                  {selfPaced && (
                    <div className="mt-10 space-y-2">
                      {current.id === OPENING_MODULE_ID ? (
                        <button
                          onClick={() => setModuleId(MORNING_FOLLOW_UP)}
                          className="w-full rounded-2xl bg-accent-gradient py-4 text-base font-bold shadow-glow transition active:scale-[0.98]"
                        >
                          There is more 💌
                        </button>
                      ) : (
                        <>
                          <p className="text-center text-xs leading-relaxed text-white/40">
                            The rest of today comes from me, when the moment is right.
                          </p>
                          <button
                            onClick={() => {
                              setActive(false);
                              setModuleId(null);
                              setSelfPaced(false);
                            }}
                            className="w-full rounded-2xl py-3 text-sm font-semibold text-white/50"
                          >
                            Close for now
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </motion.div>
              ) : (
                /* the holding screen between modules, so she never falls back
                   into the normal app mid-story */
                <motion.div
                  key="holding"
                  className="flex flex-col items-center gap-5 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <motion.div
                    className="text-5xl"
                    animate={{ scale: [1, 1.12, 1] }}
                    transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    💞
                  </motion.div>
                  <p className="text-sm font-semibold text-white/60">Stay right here.</p>
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-magenta"
                        animate={{ opacity: [0.25, 1, 0.25] }}
                        transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.22 }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <audio ref={ambient} src="/anniversary/audio/ambient.mp3" loop preload="none" className="hidden" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
