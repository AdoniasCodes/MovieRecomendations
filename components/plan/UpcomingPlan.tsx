"use client";

import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Plan } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { PlayCircle, X } from "lucide-react";
import { useEffect, useState } from "react";

const REMINDER_LEAD_MS = 30 * 60_000; // 30 min before
const MISSED_AFTER_MS = 3 * 3600_000; // 3h after

/** current time, re-ticked every 60s; null until mounted so first paint never
 * depends on "now" (no Date.now() during render). */
function useNow(): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const iv = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(iv);
  }, []);
  return now;
}

function coarseCountdown(scheduledAt: number, now: number): string {
  const diff = scheduledAt - now;
  const days = Math.floor(diff / 86_400_000);
  if (days >= 1) return `in ${days}d`;
  const hours = Math.max(1, Math.round(diff / 3_600_000));
  return `in ${hours}h`;
}

export function UpcomingPlans() {
  const store = useStore();
  const now = useNow();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const plans = store.plans.filter((p) => p.status === "planned");

  if (plans.length === 0) return null;

  const confirmPlan = confirmId ? plans.find((p) => p.id === confirmId) ?? null : null;

  return (
    <section>
      <h3 className="mb-3 text-base font-bold">Planned nights 📅</h3>
      <div className="space-y-2">
        {plans.map((p) => (
          <PlanCard key={p.id} plan={p} now={now} onCancel={() => setConfirmId(p.id)} />
        ))}
      </div>

      {/* cancel confirm: blocking modal with explicit buttons */}
      <AnimatePresence>
        {confirmPlan && (
          <motion.div
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="glass-strong w-full max-w-sm rounded-3xl p-5"
              initial={{ scale: 0.92, y: 12 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.92, y: 12 }}
            >
              <h3 className="text-lg font-bold">Cancel this movie night?</h3>
              <p className="mt-1 text-sm text-white/60">
                {getTitle(confirmPlan.titleId)?.title ?? "This plan"} will be un-planned for both of you.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => {
                    store.cancelPlan(confirmPlan.id);
                    setConfirmId(null);
                  }}
                  className="flex-1 rounded-2xl bg-rose-500/80 px-4 py-3 text-sm font-bold active:scale-95"
                >
                  Yes, cancel
                </button>
                <button
                  onClick={() => setConfirmId(null)}
                  className="flex-1 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white/70 active:scale-95"
                >
                  Keep it
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function PlanCard({ plan, now, onCancel }: { plan: Plan; now: number | null; onCancel: () => void }) {
  const store = useStore();
  const t = getTitle(plan.titleId);
  const who = plan.plannedBy === "me" ? store.me : store.partner;
  const when = new Date(plan.scheduledAt).toLocaleString(undefined, {
    weekday: "short", hour: "2-digit", minute: "2-digit",
  });

  const isTonight = now != null && now >= plan.scheduledAt - REMINDER_LEAD_MS && now <= plan.scheduledAt + MISSED_AFTER_MS;
  const isMissed = now != null && now > plan.scheduledAt + MISSED_AFTER_MS;
  const isUpcoming = now != null && now < plan.scheduledAt - REMINDER_LEAD_MS;

  return (
    <div className={`glass rounded-2xl p-3 transition ${isMissed ? "opacity-50" : ""}`}>
      <div className="flex items-center gap-3">
        <span
          className="h-12 w-9 shrink-0 rounded-lg"
          style={{
            background: t
              ? `linear-gradient(150deg, ${t.colorA}, ${t.colorB})`
              : "linear-gradient(150deg, #333, #111)",
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t?.title ?? "A movie night"}</p>
          <p className="mt-0.5 text-[11px] text-white/45">
            {who.emoji} {who.name} planned it · {when}
          </p>
          {isTonight && (
            <p className="mt-1 text-xs font-semibold text-accent-glow">Tonight&apos;s the night 🍿</p>
          )}
          {isUpcoming && <p className="mt-1 text-xs text-white/45">{coarseCountdown(plan.scheduledAt, now!)}</p>}
          {isMissed && <p className="mt-1 text-xs text-white/40">missed it 🥲</p>}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {isTonight && (
            <button
              onClick={() => store.startWatchParty(plan.titleId)}
              className="flex items-center gap-1 rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold shadow-glow active:scale-95"
            >
              <PlayCircle className="h-3.5 w-3.5" /> Start now
            </button>
          )}
          <button
            onClick={onCancel}
            aria-label="Cancel this movie night"
            className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] text-white/40 active:scale-90"
          >
            <X className="h-3 w-3" /> Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
