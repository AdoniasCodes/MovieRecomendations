"use client";

import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { openTitleSheet } from "@/lib/title-sheet";
import type { Notification } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, X } from "lucide-react";
import { useState } from "react";

const ICON: Record<string, string> = {
  started: "▶️", favorited: "👍", watchlisted: "🍿", cinema: "🎬",
  matched: "💞", rated: "⭐", nudge: "👋", note: "📝",
};

export function NotificationsBell() {
  const store = useStore();
  const [open, setOpen] = useState(false);
  const { pendingMatch, unreadCount } = store;

  const openPanel = () => {
    setOpen(true);
    // mark incoming as read once seen
    if (unreadCount > 0) setTimeout(() => store.markNotifsRead(), 600);
  };

  const latest = store.notifications[0]?.createdAt ?? 0;

  return (
    <>
      <button
        onClick={openPanel}
        className={`fixed bottom-[10.5rem] right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full glass-strong shadow-card transition active:scale-90 ${
          pendingMatch ? "opacity-0" : "opacity-100"
        }`}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-gradient px-1 text-[10px] font-bold shadow-glow">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              className="glass-strong relative z-10 flex max-h-[80vh] w-full max-w-md flex-col rounded-t-3xl"
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
            >
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div>
                  <p className="text-sm font-bold leading-none">Between us 💞</p>
                  <p className="mt-1 text-[11px] text-white/45">Nudges, matches & little notes</p>
                </div>
                <button onClick={() => setOpen(false)} className="glass flex h-8 w-8 items-center justify-center rounded-full">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto p-4">
                {store.notifications.length === 0 && (
                  <p className="py-10 text-center text-sm text-white/40">Nothing yet — go like something 😉</p>
                )}
                {store.notifications.map((n) => (
                  <Row key={n.id} n={n} latest={latest} mine={n.actorId === store.me.id} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Row({ n, latest, mine }: { n: Notification; latest: number; mine: boolean }) {
  const t = n.titleId ? getTitle(n.titleId) : null;
  return (
    <button
      onClick={() => t && openTitleSheet(t.id)}
      className="flex w-full items-center gap-3 rounded-2xl bg-white/[0.04] p-3 text-left transition hover:bg-white/[0.07]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-base">
        {ICON[n.type] ?? "💬"}
      </span>
      <p className="flex-1 text-sm text-white/85">
        {n.text}
        <span className="ml-1 text-[10px] text-white/35">{mine ? "· you" : ""}</span>
      </p>
      {t && (
        <span
          className="h-9 w-6 shrink-0 rounded-md"
          style={{ background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})` }}
        />
      )}
      <div className="flex shrink-0 flex-col items-end gap-1">
        <span className="text-[10px] text-white/35">{rel(n.createdAt, latest)}</span>
        {!n.read && n.toId !== n.actorId && !mine && <span className="h-2 w-2 rounded-full bg-accent-glow" />}
      </div>
    </button>
  );
}

function rel(ts: number, now: number) {
  const d = Math.max(0, now - ts);
  const m = Math.round(d / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
