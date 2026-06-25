"use client";

import { useAuth } from "@/lib/auth";
import { PIN_IDENTITIES, type PinIdentity } from "@/lib/pin-accounts";
import { motion } from "framer-motion";
import { Delete, Heart, LogOut } from "lucide-react";
import { useEffect, useState } from "react";

const PIN_LEN = 4;

export function PinLogin() {
  const auth = useAuth();
  const [who, setWho] = useState<PinIdentity | null>(null);
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // auto-submit once the PIN is complete
  useEffect(() => {
    if (!who || pin.length !== PIN_LEN || busy) return;
    setBusy(true);
    setErr(null);
    auth.signInWithPin(who.email, pin).then((r) => {
      if (r.error) {
        setErr(r.error);
        setPin("");
      }
      setBusy(false);
    });
  }, [pin, who, busy, auth]);

  if (!auth.configured) return null;

  // ---- signed in + live ----------------------------------------------------
  if (auth.session) {
    const meName = auth.profile?.name ?? "You";
    return (
      <section className="glass rounded-2xl p-4">
        <div className="flex items-center gap-2">
          <Heart className="h-4 w-4 text-accent-glow" />
          <h3 className="text-sm font-bold">Together mode</h3>
          {auth.live && (
            <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
              LIVE
            </span>
          )}
        </div>
        <p className="mt-2 text-sm text-white/85">
          You&apos;re {meName}
          {auth.partner ? (
            <>
              {" "}— live with <span className="font-semibold">{auth.partner.name}</span> {auth.partner.emoji} 🎉
            </>
          ) : (
            <> — waiting for your partner to hop on…</>
          )}
        </p>
        <button
          onClick={() => auth.signOut()}
          className="mt-3 flex items-center gap-2 text-xs text-white/50 hover:text-white/80"
        >
          <LogOut className="h-4 w-4" /> Switch user
        </button>
      </section>
    );
  }

  // ---- pick who you are ----------------------------------------------------
  if (!who) {
    return (
      <section className="glass rounded-2xl p-4">
        <h3 className="text-sm font-bold">Who&apos;s watching?</h3>
        <p className="mt-1 text-xs text-white/45">Tap your name, then enter our PIN to go live together.</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {PIN_IDENTITIES.map((id) => (
            <button
              key={id.key}
              onClick={() => { setWho(id); setErr(null); }}
              className="flex flex-col items-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-5 transition active:scale-95 hover:border-accent/40"
            >
              <span
                className="flex h-14 w-14 items-center justify-center rounded-full text-2xl"
                style={{ background: `${id.color}33`, border: `1px solid ${id.color}66` }}
              >
                {id.emoji}
              </span>
              <span className="text-sm font-semibold">{id.name}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  // ---- enter PIN -----------------------------------------------------------
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "del"];
  return (
    <section className="glass rounded-2xl p-4">
      <button
        onClick={() => { setWho(null); setPin(""); setErr(null); }}
        className="text-[11px] text-white/40 hover:text-white/70"
      >
        ← not {who.name}?
      </button>
      <div className="mt-2 flex flex-col items-center">
        <span className="text-3xl">{who.emoji}</span>
        <p className="mt-1 text-sm font-semibold">Hi {who.name} — enter our PIN</p>

        {/* dots */}
        <div className="mt-4 flex gap-3">
          {Array.from({ length: PIN_LEN }).map((_, i) => (
            <motion.span
              key={i}
              animate={err ? { x: [0, -4, 4, -2, 0] } : {}}
              className={`h-3.5 w-3.5 rounded-full border ${
                i < pin.length ? "border-accent bg-accent-gradient" : "border-white/25"
              }`}
            />
          ))}
        </div>
        {err && <p className="mt-2 text-[11px] text-rose-300">{err}</p>}

        {/* keypad */}
        <div className="mt-5 grid w-full max-w-[240px] grid-cols-3 gap-2.5">
          {keys.map((k, i) =>
            k === "" ? (
              <span key={i} />
            ) : k === "del" ? (
              <button
                key={i}
                onClick={() => { setPin((p) => p.slice(0, -1)); setErr(null); }}
                disabled={busy}
                className="flex h-14 items-center justify-center rounded-2xl bg-white/[0.04] text-white/60 active:scale-95 disabled:opacity-40"
              >
                <Delete className="h-5 w-5" />
              </button>
            ) : (
              <button
                key={i}
                onClick={() => setPin((p) => (p.length < PIN_LEN ? p + k : p))}
                disabled={busy}
                className="h-14 rounded-2xl bg-white/[0.06] text-xl font-semibold transition active:scale-95 hover:bg-white/[0.1] disabled:opacity-40"
              >
                {k}
              </button>
            )
          )}
        </div>
        {busy && <p className="mt-3 text-[11px] text-white/45">Signing in…</p>}
      </div>
    </section>
  );
}
