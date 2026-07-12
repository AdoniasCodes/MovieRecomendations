"use client";

import { useStore } from "@/lib/store";
import { motion } from "framer-motion";
import { CalendarHeart } from "lucide-react";
import { useState } from "react";

// ---- time math: only ever invoked from inside a click handler, never during
// render, so Date.now()/new Date() here never touches first paint. ----

/** today (or `daysAhead` days from today) at `hour`:00; rolls forward one day
 * if that moment has already passed. */
function nextDayAt(daysAhead: number, hour: number): number {
  const now = new Date();
  const d = new Date(now);
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 1);
  return d.getTime();
}

/** the next occurrence of weekday `targetDow` (0=Sun..6=Sat) at `hour`:00.
 * if today IS that weekday and the hour hasn't passed yet, that's "next". */
function nextWeekdayAt(targetDow: number, hour: number): number {
  const now = new Date();
  const d = new Date(now);
  const daysUntil = (targetDow - now.getDay() + 7) % 7;
  d.setDate(d.getDate() + daysUntil);
  d.setHours(hour, 0, 0, 0);
  if (d.getTime() <= now.getTime()) d.setDate(d.getDate() + 7);
  return d.getTime();
}

const QUICK_PICKS: { label: string; at: () => number }[] = [
  { label: "Tonight 21:00", at: () => nextDayAt(0, 21) },
  { label: "Tomorrow 21:00", at: () => nextDayAt(1, 21) },
  { label: "Friday 21:00", at: () => nextWeekdayAt(5, 21) },
  { label: "Saturday 21:00", at: () => nextWeekdayAt(6, 21) },
];

export function PlanPicker({ titleId, onClose }: { titleId: string; onClose: () => void }) {
  const store = useStore();
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  function pickQuick(at: () => number) {
    store.planWatchNight(titleId, at());
    onClose();
  }

  function submitCustom() {
    const ts = new Date(custom).getTime();
    if (Number.isNaN(ts) || ts <= Date.now()) {
      setError("Pick a time in the future");
      return;
    }
    setError(null);
    store.planWatchNight(titleId, ts);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        className="glass-strong relative z-10 w-full max-w-md rounded-t-3xl p-4 pb-6 sm:rounded-3xl"
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        transition={{ type: "spring", stiffness: 280, damping: 30 }}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-accent-glow">
            <CalendarHeart className="h-4.5 w-4.5" />
          </span>
          <h3 className="text-lg font-bold">Plan a movie night 📅</h3>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {QUICK_PICKS.map((qp) => (
            <button
              key={qp.label}
              onClick={() => pickQuick(qp.at)}
              className="rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-sm font-medium text-white/80 transition hover:bg-white/[0.08] active:scale-95"
            >
              {qp.label}
            </button>
          ))}
        </div>

        <div className="mt-4 border-t border-white/10 pt-4">
          <p className="mb-2 text-xs uppercase tracking-wider text-white/40">Or pick a time</p>
          <div className="flex items-center gap-2">
            <input
              type="datetime-local"
              value={custom}
              onChange={(e) => {
                setCustom(e.target.value);
                if (error) setError(null);
              }}
              style={{ colorScheme: "dark" }}
              className="flex-1 rounded-xl bg-white/[0.08] px-3 py-2 text-sm text-white/90 outline-none focus:bg-white/[0.12]"
            />
            <button
              onClick={submitCustom}
              className="shrink-0 rounded-xl bg-accent-gradient px-4 py-2 text-sm font-bold shadow-glow active:scale-95"
            >
              Plan it
            </button>
          </div>
          {error && <p className="mt-2 text-xs text-rose-400">{error}</p>}
        </div>
      </motion.div>
    </div>
  );
}
