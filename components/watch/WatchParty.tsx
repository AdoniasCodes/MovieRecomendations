"use client";

import { getTitle } from "@/lib/mock-data";
import { acceptParty, collapseParty, usePartyUi } from "@/lib/party-ui";
import { getDismissedSessions } from "@/lib/session-prefs";
import { useStore } from "@/lib/store";
import type { Reaction, User } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, ChevronDown, Flag, Play, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PartyInvite } from "./PartyInvite";

const QUICK = ["❤️", "😂", "😮", "😍", "🍿", "🔥", "🥹", "👀"];

export function WatchParty() {
  const store = useStore();
  const session = store.session;
  const ui = usePartyUi();

  // An active session is never lost by leaving the app: as long as nobody has
  // wrapped it up (completed/dropped), coming back re-offers it as an invite
  // ("resume"), and minimizing keeps a floating chip to hop back in. Only a
  // session I opened THIS mount (started it, joined, resumed, or tapped its
  // notification) renders full-screen.
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedSessions);

  // stable key in both modes: db row id when live, startedAt when demo.
  const key = session?.active ? session.id ?? String(session.startedAt) : null;

  // re-read the end-race dismissal list whenever the active session changes.
  useEffect(() => {
    setDismissedIds(getDismissedSessions());
  }, [key]);

  const handleJoin = useCallback(() => {
    if (!key) return;
    store.joinWatchParty(store.me.id);
    acceptParty(key);
  }, [key, store]);

  const handleLater = useCallback(() => {
    if (key) collapseParty(key); // minimized, not gone: the chip brings it back
  }, [key]);

  if (!session || !key) return null;
  // wrapped-up (or raced-end) sessions stay hidden on this device
  if (dismissedIds.includes(key)) return null;
  const t = getTitle(session.titleId);
  if (!t) return null;

  const mine = session.hostId === store.me.id;
  // minimize always wins, even over "I started this one" auto-open
  const opened = (mine && store.iStarted) || ui.acceptedKey === key;
  const takeover = opened && ui.collapsedKey !== key;

  if (!takeover) {
    if (ui.collapsedKey === key) {
      return <ResumeChip title={t.title} onResume={handleJoin} />;
    }
    return (
      <PartyInvite
        partner={store.partner}
        title={t}
        mine={mine}
        onJoin={handleJoin}
        onLater={handleLater}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${t.colorA}, ${t.colorB})` }}
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col px-4 pb-4 pt-5">
        <Body onMinimize={() => collapseParty(key)} />
      </div>
    </div>
  );
}

// Floating pill for a minimized watch-along: always one tap from rejoining.
function ResumeChip({ title, onResume }: { title: string; onResume: () => void }) {
  return (
    <motion.button
      onClick={onResume}
      // left-anchored so it never sits under the AI/bell FABs on the right
      className="glass-strong fixed bottom-24 left-4 z-30 flex items-center gap-2 rounded-full py-2 pl-3 pr-4 shadow-card"
      initial={{ y: 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-gradient">
        <Play className="h-3.5 w-3.5" />
      </span>
      <span className="max-w-[130px] truncate text-sm font-semibold">{title}</span>
      <span className="text-xs text-white/55">resume 🍿</span>
    </motion.button>
  );
}

function Body({ onMinimize }: { onMinimize: () => void }) {
  const store = useStore();
  const me = store.me;
  const partner = store.partner;
  const session = store.session!;
  const t = getTitle(session.titleId)!;
  const [input, setInput] = useState("");
  const [wrapUp, setWrapUp] = useState(false);
  const herHere = session.participants.includes(partner.id);

  const finish = (status: "completed" | "dropped") => {
    setWrapUp(false);
    store.endWatchParty(status);
  };

  return (
    <>
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/55">Together tonight</p>
          <h2 className="text-2xl font-black leading-tight">{t.title}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWrapUp(true)}
            className="glass flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-semibold"
            aria-label="Wrap up watch-along"
          >
            <Flag className="h-3.5 w-3.5" /> Wrap up
          </button>
          <button
            onClick={onMinimize}
            className="glass flex h-9 w-9 items-center justify-center rounded-full"
            aria-label="Minimize watch-along"
          >
            <ChevronDown className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* presence */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3 backdrop-blur">
        <Avatar user={me} online />
        <Avatar user={partner} online={herHere} />
        <p className="text-sm text-white/80">
          {herHere ? (
            <>You & {partner.name} are watching <span className="font-semibold">together</span> 💞</>
          ) : (
            <>Waiting for {partner.name} to join…</>
          )}
        </p>
      </div>

      {/* poster + reaction stream */}
      <div className="relative mt-4 flex-1 overflow-hidden rounded-3xl ring-1 ring-white/10">
        <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, ${t.colorA}, ${t.colorB})` }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 max-h-[70%] space-y-2 overflow-y-auto p-3">
          <AnimatePresence initial={false}>
            {session.reactions.slice(-30).map((r) => (
              <ReactionRow key={r.id} r={r} me={me} partner={partner} />
            ))}
          </AnimatePresence>
          {session.reactions.length === 0 && (
            <p className="pb-2 text-center text-xs text-white/50">React together! Tap an emoji or say something 👇</p>
          )}
        </div>
      </div>

      {/* quick reactions */}
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {QUICK.map((e) => (
          <button
            key={e}
            onClick={() => store.sendReaction(e, "emoji")}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-white/[0.1] text-xl backdrop-blur transition active:scale-90"
          >
            {e}
          </button>
        ))}
      </div>

      {/* message input */}
      <div className="mt-3 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && input.trim()) {
              store.sendReaction(input.trim(), "text");
              setInput("");
            }
          }}
          placeholder={`Say something to ${partner.name}…`}
          className="flex-1 rounded-full bg-white/[0.12] px-4 py-3 text-sm outline-none backdrop-blur placeholder:text-white/45 focus:bg-white/[0.18]"
        />
        <button
          onClick={() => {
            if (!input.trim()) return;
            store.sendReaction(input.trim(), "text");
            setInput("");
          }}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-accent-gradient active:scale-90"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      {/* wrap-up: blocking modal, explicit choice, no vanishing toast */}
      <AnimatePresence>
        {wrapUp && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm"
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
              <h3 className="text-lg font-bold">Wrap up {t.title}?</h3>
              <p className="mt-1 text-sm text-white/60">
                The night and your messages stay saved in Us · Watchalongs.
              </p>
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => finish("completed")}
                  className="flex w-full items-center gap-2 rounded-2xl bg-accent-gradient px-4 py-3 text-sm font-bold shadow-glow active:scale-95"
                >
                  <CheckCircle2 className="h-4 w-4" /> We finished it 🎉
                </button>
                <button
                  onClick={() => finish("dropped")}
                  className="flex w-full items-center gap-2 rounded-2xl bg-white/[0.08] px-4 py-3 text-sm font-semibold text-white/80 active:scale-95"
                >
                  🫠 We dropped it
                </button>
                <button
                  onClick={() => setWrapUp(false)}
                  className="w-full rounded-2xl px-4 py-3 text-sm text-white/50 active:scale-95"
                >
                  Keep watching
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ReactionRow({ r, me, partner }: { r: Reaction; me: User; partner: User }) {
  const mine = r.by === me.id;
  const user = mine ? me : partner;
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  return (
    <motion.div
      ref={endRef}
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className={mine ? "flex justify-end" : "flex justify-start"}
    >
      <div className="flex max-w-[80%] items-end gap-1.5">
        {!mine && <span className="text-base leading-none">{user.emoji}</span>}
        <div
          className={
            r.kind === "emoji"
              ? "text-3xl"
              : mine
                ? "rounded-2xl rounded-br-md bg-accent-gradient px-3 py-2 text-sm"
                : "rounded-2xl rounded-bl-md bg-white/[0.16] px-3 py-2 text-sm backdrop-blur"
          }
        >
          {r.content}
        </div>
        {mine && <span className="text-base leading-none">{user.emoji}</span>}
      </div>
    </motion.div>
  );
}

function Avatar({ user, online }: { user: User; online: boolean }) {
  return (
    <span className="relative">
      <span
        className="flex h-9 w-9 items-center justify-center rounded-full text-base ring-2 ring-white/20"
        style={{ background: `${user.color}55` }}
      >
        {user.emoji}
      </span>
      <span
        className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-black/40 ${
          online ? "bg-emerald-400" : "bg-white/30"
        }`}
      />
    </span>
  );
}
