"use client";

import { useAuth } from "@/lib/auth";
import { Check, Copy, Heart, LogOut, Mail } from "lucide-react";
import { useState } from "react";

export function GoLive() {
  const auth = useAuth();
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!auth.configured) return null;

  const wrap = async (fn: () => Promise<{ error?: string } | void>) => {
    setBusy(true);
    setMsg(null);
    const r = await fn();
    if (r && "error" in r && r.error) setMsg(r.error);
    setBusy(false);
  };

  return (
    <section className="glass rounded-2xl p-4">
      <div className="flex items-center gap-2">
        <Heart className="h-4 w-4 text-accent-glow" />
        <h3 className="text-sm font-bold">Go live with {auth.partner?.name ?? "Hermi"} 💞</h3>
        {auth.live && <span className="ml-auto rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">LIVE</span>}
      </div>

      {auth.loading ? (
        <p className="mt-2 text-xs text-white/45">Checking session…</p>
      ) : !auth.session ? (
        // ---- signed out: email OTP ----
        !sent ? (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-white/45">Sign in to sync across devices and pair with each other for real.</p>
            <div className="flex gap-2">
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                type="email"
                className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2.5 text-sm outline-none placeholder:text-white/35"
              />
              <button
                disabled={busy || !email.includes("@")}
                onClick={() => wrap(async () => {
                  const r = await auth.signInWithOtp(email);
                  if (!r.error) { setSent(true); setMsg("Code sent — check your email."); }
                  return r;
                })}
                className="flex items-center gap-1.5 rounded-xl bg-accent-gradient px-3 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-50"
              >
                <Mail className="h-4 w-4" /> Send code
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-2">
            <p className="text-xs text-white/45">Enter the 6-digit code we emailed to {email}.</p>
            <div className="flex gap-2">
              <input
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2.5 text-center font-mono text-lg tracking-widest outline-none placeholder:text-white/25"
              />
              <button
                disabled={busy || token.trim().length < 6}
                onClick={() => wrap(() => auth.verifyOtp(email, token))}
                className="rounded-xl bg-accent-gradient px-4 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-50"
              >
                Verify
              </button>
            </div>
            <button onClick={() => { setSent(false); setToken(""); setMsg(null); }} className="text-[11px] text-white/40">
              ← use a different email
            </button>
          </div>
        )
      ) : !auth.couple ? (
        // ---- signed in, not paired ----
        <div className="mt-3 space-y-3">
          <p className="text-xs text-white/45">You&apos;re signed in as {auth.user?.email}. Now pair up:</p>
          {code ? (
            <button
              onClick={() => { navigator.clipboard?.writeText(code).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="flex w-full items-center justify-between rounded-xl bg-white/[0.06] px-4 py-3"
            >
              <span className="font-mono text-lg tracking-widest">{code}</span>
              {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-white/50" />}
            </button>
          ) : (
            <button
              disabled={busy}
              onClick={() => wrap(async () => {
                const r = await auth.createCouple();
                if (r.code) { setCode(r.code); setMsg(`Share ${r.code} with Hermi.`); }
                return r;
              })}
              className="w-full rounded-xl bg-accent-gradient py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-50"
            >
              Create our couple & get a code
            </button>
          )}
          <div className="flex items-center gap-2 text-[11px] text-white/30">
            <span className="h-px flex-1 bg-white/10" /> or join theirs <span className="h-px flex-1 bg-white/10" />
          </div>
          <div className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="AM-XXXXX"
              className="flex-1 rounded-xl bg-white/[0.06] px-3 py-2.5 font-mono text-sm uppercase tracking-widest outline-none placeholder:text-white/25"
            />
            <button
              disabled={busy || joinCode.trim().length < 4}
              onClick={() => wrap(() => auth.joinCouple(joinCode))}
              className="rounded-xl bg-white/[0.1] px-4 py-2.5 text-sm font-semibold active:scale-95 disabled:opacity-50"
            >
              Join
            </button>
          </div>
        </div>
      ) : (
        // ---- signed in + paired ----
        <div className="mt-3 space-y-2">
          <p className="text-sm text-white/85">
            {auth.partner ? (
              <>Paired with <span className="font-semibold">{auth.partner.name}</span> {auth.partner.emoji} — you&apos;re live 🎉</>
            ) : (
              <>Couple code <span className="font-mono font-semibold">{auth.couple.code}</span> — share it so Hermi can join.</>
            )}
          </p>
          <p className="text-[11px] text-white/40">Signed in as {auth.user?.email}</p>
          <button onClick={() => auth.signOut()} className="mt-1 flex items-center gap-2 text-xs text-white/50">
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}

      {msg && <p className="mt-2 text-[11px] text-accent-glow">{msg}</p>}
    </section>
  );
}
