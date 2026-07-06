"use client";

import { getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import { dismissSession, getDismissedSessions } from "@/lib/session-prefs";
import type { Reaction, User } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { PartyInvite } from "./PartyInvite";

const QUICK = ["❤️", "😂", "😮", "😍", "🍿", "🔥", "🥹", "👀"];

export function WatchParty() {
  const store = useStore();
  const session = store.session;

  // A partner-started (or reload-rehydrated own) session must never take over
  // the screen. It shows an invite card until I explicitly Join. Only a session
  // I accepted this mount — by starting it (store.iStarted) or by tapping Join —
  // renders full-screen. Dismissal (Later / end) always wins over both.
  const [accepted, setAccepted] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>(getDismissedSessions);

  // stable key in both modes: db row id when live, startedAt when demo.
  const key = session?.active ? session.id ?? String(session.startedAt) : null;

  // re-read this device's dismissed list whenever the active session changes.
  useEffect(() => {
    setDismissedIds(getDismissedSessions());
  }, [key]);

  const handleJoin = useCallback(() => {
    if (!key) return;
    store.joinWatchParty(store.me.id);
    setAccepted(key);
  }, [key, store]);

  const handleLater = useCallback(() => {
    if (!key) return;
    dismissSession(key);
    setDismissedIds((d) => (d.includes(key) ? d : [...d, key]));
  }, [key]);

  const handleEnd = useCallback(() => {
    if (key) setDismissedIds((d) => (d.includes(key) ? d : [...d, key]));
    setAccepted(null);
    store.endWatchParty(); // also persists dismissal + closes every active row
  }, [key, store]);

  if (!session || !key) return null;
  if (dismissedIds.includes(key)) return null; // Later / ended → hidden, stays hidden
  const t = getTitle(session.titleId);
  if (!t) return null;

  const takeover = (session.hostId === "me" && store.iStarted) || accepted === key;
  if (!takeover) {
    return <PartyInvite partner={store.partner} title={t} onJoin={handleJoin} onLater={handleLater} />;
  }

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${t.colorA}, ${t.colorB})` }}
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col px-4 pb-4 pt-5">
        <Body onEnd={handleEnd} />
      </div>
    </div>
  );
}

function Body({ onEnd }: { onEnd: () => void }) {
  const store = useStore();
  const me = store.me;
  const partner = store.partner;
  const session = store.session!;
  const t = getTitle(session.titleId)!;
  const [input, setInput] = useState("");
  const herHere = session.participants.includes(partner.id);

  return (
    <>
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/55">Together tonight</p>
          <h2 className="text-2xl font-black leading-tight">{t.title}</h2>
        </div>
        <button
          onClick={onEnd}
          className="glass flex h-9 w-9 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
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
