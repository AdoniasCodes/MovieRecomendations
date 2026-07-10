"use client";

import { cn } from "@/lib/cn";
import { getTitle } from "@/lib/mock-data";
import { acceptParty } from "@/lib/party-ui";
import { useStore } from "@/lib/store";
import type { Reaction, WatchPartyRecord } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, MessageCircle, Play, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const STATUS_UI: Record<WatchPartyRecord["status"], { label: string; cls: string }> = {
  in_progress: { label: "In progress", cls: "bg-amber-400/20 text-amber-300" },
  completed: { label: "Completed", cls: "bg-emerald-500/20 text-emerald-300" },
  dropped: { label: "Dropped", cls: "bg-white/[0.08] text-white/50" },
};

// Every watch-along you two ever had: status, the saved conversation, and a
// delete that removes the night (and its messages) forever.
export function Watchalongs() {
  const store = useStore();
  const [records, setRecords] = useState<WatchPartyRecord[] | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WatchPartyRecord | null>(null);

  const refresh = useCallback(() => {
    store.listPartyHistory().then(setRecords);
    // listPartyHistory never rejects (returns [] on failure)
  }, [store.listPartyHistory]); // eslint-disable-line react-hooks/exhaustive-deps

  // reload when the active session changes (start/join/wrap-up all reflect here)
  useEffect(refresh, [refresh, store.live, store.session?.id, store.session?.active]);

  const doDelete = async () => {
    if (!confirmDelete) return;
    await store.deleteParty(confirmDelete.id);
    setConfirmDelete(null);
    refresh();
  };

  return (
    <section>
      <h3 className="mb-3 text-base font-bold">Watchalongs 🍿</h3>

      {!store.live && (
        <p className="glass rounded-2xl p-4 text-sm text-white/50">
          Sign in together and your watch-along nights (and everything you said) get saved here.
        </p>
      )}

      {store.live && records && records.length === 0 && (
        <p className="glass rounded-2xl p-4 text-sm text-white/50">
          No watch-alongs yet. Open a title and start one together 💞
        </p>
      )}

      <div className="space-y-2">
        {(records ?? []).map((rec) => (
          <PartyRow key={rec.id} rec={rec} onDelete={() => setConfirmDelete(rec)} />
        ))}
      </div>

      {/* delete confirm: blocking modal with explicit buttons */}
      <AnimatePresence>
        {confirmDelete && (
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
              <h3 className="text-lg font-bold">Delete this watch-along?</h3>
              <p className="mt-1 text-sm text-white/60">
                {getTitle(confirmDelete.titleId)?.title ?? "This night"} and its whole
                conversation will be gone forever, for both of you.
              </p>
              <div className="mt-4 flex gap-2">
                <button
                  onClick={doDelete}
                  className="flex-1 rounded-2xl bg-rose-500/80 px-4 py-3 text-sm font-bold active:scale-95"
                >
                  Delete forever
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
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

function PartyRow({ rec, onDelete }: { rec: WatchPartyRecord; onDelete: () => void }) {
  const store = useStore();
  const t = getTitle(rec.titleId);
  const [open, setOpen] = useState(false);
  const [chat, setChat] = useState<Reaction[] | null>(null);
  const status = STATUS_UI[rec.status];
  const host = rec.hostId === store.me.id ? store.me : store.partner;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next && chat === null) store.partyConversation(rec.id).then(setChat);
  };

  const resume = () => {
    store.joinWatchParty(store.me.id);
    acceptParty(rec.id);
  };

  return (
    <div className="glass rounded-2xl p-3">
      <div className="flex items-center gap-3">
        <span
          className="h-11 w-8 shrink-0 rounded-lg"
          style={{
            background: t
              ? `linear-gradient(150deg, ${t.colorA}, ${t.colorB})`
              : "linear-gradient(150deg, #333, #111)",
          }}
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t?.title ?? "A night together"}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[11px] text-white/45">
            <span>{host.emoji} {fmtDate(rec.startedAt)}</span>
            <span className="flex items-center gap-0.5">
              <MessageCircle className="h-3 w-3" /> {rec.reactionCount}
            </span>
          </p>
        </div>
        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", status.cls)}>
          {rec.active ? "LIVE" : status.label}
        </span>
        {rec.active ? (
          <button
            onClick={resume}
            className="flex shrink-0 items-center gap-1 rounded-full bg-accent-gradient px-3 py-1.5 text-xs font-bold shadow-glow active:scale-95"
          >
            <Play className="h-3 w-3" /> Resume
          </button>
        ) : (
          <button
            onClick={onDelete}
            aria-label="Delete watch-along"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/45 active:scale-90"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
        <button
          onClick={toggle}
          aria-label="Show conversation"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/45 active:scale-90"
        >
          <ChevronDown className={cn("h-4 w-4 transition", open && "rotate-180")} />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-3 max-h-64 space-y-1.5 overflow-y-auto border-t border-white/10 pt-3">
              {chat === null && <p className="text-center text-xs text-white/40">Loading your night…</p>}
              {chat?.length === 0 && (
                <p className="text-center text-xs text-white/40">No messages this time. Just vibes 🍿</p>
              )}
              {(chat ?? []).map((r) => {
                const mine = r.by === store.me.id;
                const u = mine ? store.me : store.partner;
                return (
                  <div key={r.id} className={mine ? "flex justify-end" : "flex justify-start"}>
                    <div className="flex max-w-[85%] items-end gap-1.5">
                      {!mine && <span className="text-sm leading-none">{u.emoji}</span>}
                      <span
                        className={
                          r.kind === "emoji"
                            ? "text-2xl"
                            : mine
                              ? "rounded-2xl rounded-br-md bg-accent-gradient px-3 py-1.5 text-xs"
                              : "rounded-2xl rounded-bl-md bg-white/[0.12] px-3 py-1.5 text-xs"
                        }
                      >
                        {r.content}
                      </span>
                      {mine && <span className="text-sm leading-none">{u.emoji}</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function fmtDate(ts: number) {
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
