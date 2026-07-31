"use client";

// Panda's side of July 31. Every module in one scrollable list, tap to put it on
// her screen. He is the pacing, because a real day does not run to a schedule.
//
// Also the after-the-day home for the whole thing: once July 31 has passed
// either of them can open this and either drive it again or walk it themselves
// on one phone ("Just us, on this phone"), which is how they get to relive it.

import { ModuleGlyph, ModuleView } from "@/components/anniversary/ModuleView";
import { PLAN_KEY, STAGE_EVENTS, stageTopic } from "@/lib/anniversary/channel";
import { anniversaryPhase, type AnniversaryPhase } from "@/lib/anniversary/date";
import {
  GROUP_LABELS,
  MODULES,
  moduleById,
  modulesInGroup,
  type AnniversaryModule,
  type ModuleGroup,
} from "@/lib/anniversary/script";
import { useAuth } from "@/lib/auth";
import { openBroadcast, type BroadcastLink, type BroadcastStatus } from "@/lib/broadcast";
import { cn } from "@/lib/cn";
import { pingPartnerDevice } from "@/lib/live";
import { identityFromEmail, partnerUser, useWhoami } from "@/lib/identity";
import { getSupabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  Lock,
  RotateCcw,
  Square,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

const GROUP_ORDER: ModuleGroup[] = ["opening", "letters", "photos", "numbers", "day", "finale"];

export function DirectorPanel() {
  const auth = useAuth();
  const who = useWhoami();
  const her = partnerUser();
  const coupleId = auth.couple?.id ?? null;

  // Who is REALLY holding this phone. The signed-in account, not the local
  // display toggle: the toggle reads "panda" on a cold load until an effect
  // corrects it, which would flash the whole surprise onto her screen. Demo
  // mode has no session at all, so it falls back to the toggle.
  const realWho = auth.configured ? identityFromEmail(auth.session?.user.email) : who;

  // Date in a first-render path is a hydration mismatch, so the phase arrives
  // in an effect and the page shows a neutral shell for one frame
  const [phase, setPhase] = useState<AnniversaryPhase | null>(null);
  useEffect(() => setPhase(anniversaryPhase()), []);

  const [mode, setMode] = useState<"direct" | "solo">("direct");
  const [sent, setSent] = useState<Set<string>>(new Set());
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [herShowing, setHerShowing] = useState<string | null | undefined>(undefined);
  const [linkStatus, setLinkStatus] = useState<BroadcastStatus>("joining");
  const [preview, setPreview] = useState<AnniversaryModule | null>(null);
  const [pinged, setPinged] = useState(false);
  const [soloIndex, setSoloIndex] = useState(0);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [blanked, setBlanked] = useState(false);
  /** the running order: itinerary ids in the order he actually sent them, which
   * is where her step numbers come from. Persisted so reloading his panel
   * mid-day does not renumber the whole plan. */
  const [plan, setPlan] = useState<string[]>([]);

  const linkRef = useRef<BroadcastLink | null>(null);
  // the channel handlers outlive any single render, so the state they answer
  // with has to reach them through refs
  const currentRef = useRef<string | null>(null);
  const blankedRef = useRef(false);
  const planRef = useRef<string[]>([]);
  currentRef.current = currentId;
  blankedRef.current = blanked;
  planRef.current = plan;

  // restore the running order after a reload of his own panel
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PLAN_KEY);
      if (raw) setPlan(JSON.parse(raw) as string[]);
    } catch {
      /* a lost plan only costs the numbering, not the night */
    }
  }, []);

  /* ----------------------------------------------------------- transport */
  useEffect(() => {
    if (!coupleId) return;
    const link = openBroadcast(
      stageTopic(coupleId),
      {
        // her device reporting what it has on screen
        [STAGE_EVENTS.ack]: (p) => {
          setHerShowing((p.moduleId as string | null) ?? null);
        },
        // She reloaded (or her app reconnected) and is asking what she should be
        // showing. Always answer, including "nothing but the holding screen":
        // broadcast is fire and forget, so anything sent while her channel was
        // down is only recoverable through this handshake.
        [STAGE_EVENTS.hello]: () => {
          linkRef.current?.send(STAGE_EVENTS.state, {
            moduleId: currentRef.current,
            blanked: blankedRef.current,
            plan: planRef.current,
          });
        },
      },
      setLinkStatus
    );
    linkRef.current = link;
    // ask her device to report in, so the panel is honest from the first second
    link?.send(STAGE_EVENTS.hello, {});
    return () => {
      link?.close();
      linkRef.current = null;
    };
  }, [coupleId]);

  /* ------------------------------------------------------------- actions */
  const show = useCallback((id: string) => {
    setCurrentId(id);
    setBlanked(false);
    setSent((prev) => new Set(prev).add(id));

    // Sending an itinerary item is what puts it in the plan, and its position
    // in that list IS its step number on her screen. Re-sending one already in
    // the plan keeps its original place rather than bumping it to the end.
    let nextPlan = planRef.current;
    if (moduleById(id)?.kind === "itinerary" && !nextPlan.includes(id)) {
      nextPlan = [...nextPlan, id];
      planRef.current = nextPlan;
      setPlan(nextPlan);
      try {
        window.localStorage.setItem(PLAN_KEY, JSON.stringify(nextPlan));
      } catch {}
    }

    linkRef.current?.send(STAGE_EVENTS.show, { moduleId: id, plan: nextPlan });
    try {
      navigator.vibrate?.(30);
    } catch {}
  }, []);

  const blank = () => {
    setCurrentId(null);
    setBlanked(true);
    linkRef.current?.send(STAGE_EVENTS.blank, {});
  };

  const end = () => {
    setCurrentId(null);
    setBlanked(false);
    linkRef.current?.send(STAGE_EVENTS.end, {});
  };

  /**
   * Wipe the rehearsal. The database never held any of this, so "history" is
   * entirely local: the running order, which modules show as already sent, and
   * whatever any logged-in device still has on screen. The broadcast `end` is
   * the important part, because it also clears the cached stage on any OTHER
   * device still signed in as her (a laptop used for testing, for instance).
   */
  const doReset = () => {
    setPlan([]);
    planRef.current = [];
    setSent(new Set());
    setCurrentId(null);
    setBlanked(false);
    setHerShowing(undefined);
    try {
      window.localStorage.removeItem(PLAN_KEY);
    } catch {
      /* nothing to remove is a fine outcome */
    }
    linkRef.current?.send(STAGE_EVENTS.end, {});
    setConfirmReset(false);
    setResetDone(true);
  };

  const ping = async () => {
    const sb = getSupabase();
    if (!sb || !auth.couple || !auth.user || !auth.partner) return;
    setPinged(true);
    await pingPartnerDevice(
      sb,
      { couple: auth.couple.id, my: auth.user.id, her: auth.partner.id },
      "Open me 💌",
      "Happy Anniversary"
    );
    setTimeout(() => setPinged(false), 4_000);
  };

  /* --------------------------------------------------------------- gating */
  // Nothing at all until both the date and the identity are known. This gate
  // fails CLOSED on purpose: a blank frame costs nothing, a leaked frame of the
  // director panel costs the surprise.
  if (phase === null || (auth.configured && auth.loading)) {
    return <div className="min-h-[60vh]" />;
  }

  // Until July 31 is behind them this is Panda's console only, which includes
  // the days BEFORE (she must not be able to browse the surprise early by
  // typing the URL). From August it belongs to both of them.
  if (phase !== "after" && realWho !== "panda") {
    return (
      <div className="flex min-h-[70vh] flex-col items-center justify-center space-y-4 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft ring-1 ring-white/15">
          <Lock className="h-7 w-7 text-magenta" />
        </span>
        <h1 className="text-2xl font-black">Not this one.</h1>
        <p className="max-w-xs text-sm text-white/50">
          Today comes to you, not from you. Close this and wait for me 💞
        </p>
        <Link href="/" className="text-xs text-white/40 underline-offset-2 hover:underline">
          Back to the app
        </Link>
      </div>
    );
  }

  /* ----------------------------------------------------------- solo mode */
  if (mode === "solo") {
    const m = MODULES[soloIndex];
    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between pt-1">
          <span className="glass rounded-full px-3 py-1.5 text-[11px] font-semibold text-white/45">
            {soloIndex + 1} of {MODULES.length}
          </span>
          <button
            onClick={() => setMode("direct")}
            className="glass rounded-full p-2 text-white/60"
            aria-label="Back to the panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.4 }}
          >
            <ModuleView module={m} plan={plan} />
          </motion.div>
        </AnimatePresence>

        <div className="flex gap-2 pt-2">
          <button
            onClick={() => setSoloIndex((i) => Math.max(0, i - 1))}
            disabled={soloIndex === 0}
            className="glass flex flex-1 items-center justify-center gap-1 rounded-2xl py-3.5 text-sm font-bold disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
            Back
          </button>
          <button
            onClick={() => setSoloIndex((i) => Math.min(MODULES.length - 1, i + 1))}
            disabled={soloIndex === MODULES.length - 1}
            className="flex flex-1 items-center justify-center gap-1 rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold shadow-glow disabled:opacity-40"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ------------------------------------------------------- director panel */
  const connected = linkStatus === "joined" && herShowing !== undefined;
  const showingLabel =
    herShowing === undefined
      ? "Not connected yet"
      : herShowing === null
        ? "Holding screen"
        : (moduleById(herShowing)?.label ?? herShowing);

  return (
    <div className="space-y-5 pb-8">
      <div className="space-y-1 pt-1">
        <h1 className="text-2xl font-black tracking-tight">
          You are the <span className="text-gradient">director</span>
        </h1>
        <p className="text-xs text-white/45">
          Tap anything to put it on {her.name}&apos;s screen. Any order. Skip whatever does not fit.
        </p>
      </div>

      {/* what her phone is actually showing right now */}
      <div className="glass space-y-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-white/40">
            {connected ? (
              <Wifi className="h-3.5 w-3.5 text-emerald-300" />
            ) : (
              <WifiOff className="h-3.5 w-3.5" />
            )}
            On her screen
          </span>
          {currentId && herShowing === currentId && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-300">
              <Check className="h-3.5 w-3.5" />
              Landed
            </span>
          )}
        </div>
        <p className={cn("text-sm font-bold", connected ? "text-white" : "text-white/40")}>
          {showingLabel}
        </p>
        {!connected && (
          <p className="text-[11px] leading-relaxed text-white/35">
            Her app has to be open for anything to land. Knock on her phone below.
          </p>
        )}
        <div className="flex gap-2">
          <button
            onClick={ping}
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-magenta"
          >
            <Bell className="h-3.5 w-3.5" />
            {pinged ? "Knocked" : "Ping her phone"}
          </button>
          <button
            onClick={blank}
            className="glass flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold text-white/60"
          >
            <Square className="h-3.5 w-3.5" />
            Hold screen
          </button>
          <button
            onClick={end}
            className="glass flex flex-1 items-center justify-center rounded-xl py-2.5 text-xs font-bold text-white/60"
          >
            Release
          </button>
        </div>
      </div>

      {/* the running order, built by what he has actually sent */}
      {plan.length > 0 && (
        <div className="glass space-y-2 rounded-2xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-widest text-white/40">
              Today so far
            </span>
            <button
              onClick={() => {
                setPlan([]);
                planRef.current = [];
                try {
                  window.localStorage.removeItem(PLAN_KEY);
                } catch {}
              }}
              className="text-[11px] font-bold text-white/35"
            >
              Reset order
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {plan.map((id, i) => (
              <span
                key={id}
                className="flex items-center gap-1.5 rounded-lg bg-white/5 px-2 py-1 text-[11px] font-semibold text-white/60"
              >
                <span className="text-magenta">{i + 1}</span>
                {moduleById(id)?.label ?? id}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* the whole night, grouped */}
      {GROUP_ORDER.map((group) => {
        const items = modulesInGroup(group);
        if (!items.length) return null;
        return (
          <section key={group} className="space-y-2">
            <h2 className="px-1 text-[11px] font-black uppercase tracking-widest text-white/35">
              {GROUP_LABELS[group]}
            </h2>
            {items.map((m) => {
              const isLive = currentId === m.id;
              const wasSent = sent.has(m.id);
              return (
                <div key={m.id} className="flex items-stretch gap-2">
                  <button
                    onClick={() => show(m.id)}
                    className={cn(
                      "flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3.5 text-left transition active:scale-[0.98]",
                      isLive
                        ? "bg-accent-gradient shadow-glow"
                        : wasSent
                          ? "border border-white/5 bg-white/[0.02]"
                          : "glass"
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        isLive ? "bg-white/20" : "bg-white/5"
                      )}
                    >
                      <ModuleGlyph
                        module={m}
                        className={cn("h-4 w-4", isLive ? "text-white" : "text-magenta")}
                      />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span
                        className={cn(
                          "block truncate text-sm font-bold",
                          wasSent && !isLive && "text-white/45"
                        )}
                      >
                        {m.label}
                      </span>
                      <span className="block text-[11px] text-white/35">
                        {isLive ? "On her screen now" : wasSent ? "Already shown, tap to resend" : m.kind}
                      </span>
                    </span>
                    {isLive && (
                      <span className="text-[10px] font-black uppercase tracking-widest">Live</span>
                    )}
                  </button>
                  <button
                    onClick={() => setPreview(m)}
                    aria-label={`Preview ${m.label}`}
                    className="glass flex w-11 shrink-0 items-center justify-center rounded-2xl text-white/45"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </section>
        );
      })}

      <button
        onClick={() => {
          setMode("solo");
          setSoloIndex(0);
        }}
        className="glass w-full rounded-2xl p-4 text-center text-xs font-bold text-white/55"
      >
        Or walk through it all on this phone
      </button>

      <button
        onClick={() => setConfirmReset(true)}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-center text-xs font-bold text-white/45"
      >
        <RotateCcw className="h-3.5 w-3.5" />
        Clear the rehearsal and start clean
      </button>

      {/* blocking confirm, never a toast (workspace rule) */}
      <AnimatePresence>
        {confirmReset && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="glass-strong w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6">
              <h3 className="text-lg font-black">Clear the rehearsal?</h3>
              <p className="text-sm leading-relaxed text-white/60">
                Forgets the running order, marks everything as unsent, and releases the screen on
                any device still signed in as {her.name}. Nothing in the content changes and
                nothing is deleted from your account.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmReset(false)}
                  className="glass flex-1 rounded-2xl py-3.5 text-sm font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={doReset}
                  className="flex-1 rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold shadow-glow"
                >
                  Clear it
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {resetDone && (
          <motion.div
            className="fixed inset-0 z-[96] flex items-center justify-center bg-black/80 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="glass-strong w-full max-w-sm space-y-4 rounded-3xl bg-surface p-6 text-center">
              <div className="text-4xl">✨</div>
              <h3 className="text-lg font-black">All clean.</h3>
              <p className="text-sm leading-relaxed text-white/60">
                The order is empty and the first thing you send tonight will be step one.
              </p>
              <button
                onClick={() => setResetDone(false)}
                className="w-full rounded-2xl bg-accent-gradient py-3.5 text-sm font-bold shadow-glow"
              >
                OK
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* local preview, so he always knows what he is about to send */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-[95] overflow-y-auto bg-base/95 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="mx-auto min-h-full w-full max-w-md px-6 py-16">
              <ModuleView module={preview} plan={plan} />
              <div className="mt-10 space-y-2">
                <button
                  onClick={() => {
                    show(preview.id);
                    setPreview(null);
                  }}
                  className="w-full rounded-2xl bg-accent-gradient py-4 text-sm font-bold shadow-glow"
                >
                  Send this to {her.name}
                </button>
                <button
                  onClick={() => setPreview(null)}
                  className="w-full rounded-2xl py-3 text-xs font-semibold text-white/50"
                >
                  Close preview
                </button>
              </div>
            </div>
            <button
              onClick={() => setPreview(null)}
              aria-label="Close preview"
              className="glass fixed right-4 top-4 rounded-full p-2 text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
