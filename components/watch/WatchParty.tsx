"use client";

import { ME, PARTNER, getTitle } from "@/lib/mock-data";
import { useStore } from "@/lib/store";
import type { Reaction } from "@/lib/types";
import { AnimatePresence, motion } from "framer-motion";
import { Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const QUICK = ["❤️", "😂", "😮", "😍", "🍿", "🔥", "🥹", "👀"];

// in-character wholesome reactions Amore drops during the watch-along
const HER_EMOJI = ["😍", "🥹", "❤️", "😂", "🥰", "😮", "🍿"];
const HER_TEXT = [
  "this is so good 🥹",
  "I love this scene",
  "awww",
  "didn't see that coming!",
  "we should've watched this sooner",
  "okay this is my new favourite",
  "you have the best taste 💞",
];

export function WatchParty() {
  const store = useStore();
  const session = store.session;
  const active = !!session?.active;

  // drive the simulated partner (DEMO only — in live mode the real Hermi reacts)
  const startedAt = session?.startedAt;
  useEffect(() => {
    if (!active || store.live) return;
    const join = setTimeout(() => store.joinWatchParty(PARTNER.id), 1600);
    let n = 0;
    const tick = setInterval(() => {
      n += 1;
      // alternate emoji / text, pick deterministically-ish by counter
      if (n % 3 === 0) {
        const text = HER_TEXT[(n + (startedAt ?? 0)) % HER_TEXT.length];
        store.sendReaction(text, "text", PARTNER.id);
      } else {
        const e = HER_EMOJI[(n * 3 + (startedAt ?? 0)) % HER_EMOJI.length];
        store.sendReaction(e, "emoji", PARTNER.id);
      }
    }, 7000);
    return () => {
      clearTimeout(join);
      clearInterval(tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, startedAt]);

  if (!session || !active) return null;
  const t = getTitle(session.titleId);
  if (!t) return null;

  return (
    <div className="fixed inset-0 z-[60] flex justify-center">
      <div
        className="absolute inset-0"
        style={{ background: `linear-gradient(160deg, ${t.colorA}, ${t.colorB})` }}
      />
      <div className="absolute inset-0 bg-black/55 backdrop-blur-md" />
      <div className="relative z-10 flex h-full w-full max-w-md flex-col px-4 pb-4 pt-5">
        <Body />
      </div>
    </div>
  );
}

function Body() {
  const store = useStore();
  const session = store.session!;
  const t = getTitle(session.titleId)!;
  const [input, setInput] = useState("");
  const herHere = session.participants.includes(PARTNER.id);

  return (
    <>
      {/* header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-white/55">Together tonight</p>
          <h2 className="text-2xl font-black leading-tight">{t.title}</h2>
        </div>
        <button
          onClick={() => store.endWatchParty()}
          className="glass flex h-9 w-9 items-center justify-center rounded-full"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* presence */}
      <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.08] p-3 backdrop-blur">
        <Avatar user={ME} online />
        <Avatar user={PARTNER} online={herHere} />
        <p className="text-sm text-white/80">
          {herHere ? (
            <>You & {PARTNER.name} are watching <span className="font-semibold">together</span> 💞</>
          ) : (
            <>Waiting for {PARTNER.name} to join…</>
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
              <ReactionRow key={r.id} r={r} />
            ))}
          </AnimatePresence>
          {session.reactions.length === 0 && (
            <p className="pb-2 text-center text-xs text-white/50">React together — tap an emoji or say something 👇</p>
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
          placeholder={`Say something to ${PARTNER.name}…`}
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

function ReactionRow({ r }: { r: Reaction }) {
  const mine = r.by === ME.id;
  const user = mine ? ME : PARTNER;
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

function Avatar({ user, online }: { user: typeof ME; online: boolean }) {
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
