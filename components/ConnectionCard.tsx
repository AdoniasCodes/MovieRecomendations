"use client";

// Profile > Connection. The self-service maintenance panel for the sync bug.
//
// Everything here exists because the failure only ever happened on a phone that
// was nowhere near a computer. It answers, on the device, in this order:
//   is it working right now, which leg is broken, can I repair it without
//   force-quitting, and can I hand the evidence over afterwards.

import { useAuth } from "@/lib/auth";
import { diag } from "@/lib/diag";
import { runHealthCheck, type HealthReport, type LegState } from "@/lib/health";
import { identityFromEmail } from "@/lib/identity";
import { getSupabase } from "@/lib/supabase";
import { Activity, ClipboardCopy, RotateCw, Send, Wrench } from "lucide-react";
import { useState } from "react";

const LEG_LABEL: Record<string, string> = {
  auth: "Sign-in",
  data: "Database",
  realtime: "Live updates",
  host: "App server",
};

const LEG_WHY: Record<string, string> = {
  auth: "Refreshes your login. This is the one that used to jam.",
  data: "Watchlist, votes, everything saved.",
  realtime: "How you see what she does the moment she does it.",
  host: "Netlify: the app itself, Discover and the AI. Needs the VPN on a bad route.",
};

const DOT: Record<LegState, string> = {
  ok: "bg-emerald-400",
  slow: "bg-amber-400",
  fail: "bg-red-500",
};

export function ConnectionCard() {
  const auth = useAuth();
  const [report, setReport] = useState<HealthReport | null>(null);
  const [testing, setTesting] = useState(false);
  const [repairing, setRepairing] = useState(false);
  const [sending, setSending] = useState(false);
  const me = identityFromEmail(auth.session?.user.email) ?? undefined;

  const liveNow = auth.live && !!auth.partner;

  const test = async () => {
    if (testing) return;
    setTesting(true);
    try {
      setReport(await runHealthCheck(getSupabase()));
    } finally {
      setTesting(false);
    }
  };

  const repair = async () => {
    if (repairing) return;
    setRepairing(true);
    try {
      const ok = await auth.reconnect();
      // blocking confirmation with an OK button, never a toast that vanishes
      // before it is read (workspace rule)
      alert(
        ok
          ? "Reconnected. You are synced again."
          : "Could not reconnect. Run the connection test to see which part is down, then use Restart the app."
      );
      if (ok) await test();
    } finally {
      setRepairing(false);
    }
  };

  const send = async () => {
    if (sending) return;
    setSending(true);
    try {
      const ok = await diag.upload("manual", me);
      alert(
        ok
          ? "Log sent. It is in the database now and can be read from there."
          : "Could not send the log. Copy it instead and paste it into a chat."
      );
    } finally {
      setSending(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(diag.asText());
      alert("Log copied. Paste it wherever it needs to go.");
    } catch {
      alert("Could not copy. Your browser blocked clipboard access.");
    }
  };

  return (
    <section className="glass space-y-3 rounded-2xl p-4">
      <div className="flex items-center gap-3">
        <Activity className="h-5 w-5 text-white/50" />
        <div className="flex-1">
          <h3 className="text-base font-bold">Connection</h3>
          <p className="text-xs text-white/45">
            {liveNow ? "Synced. Everything you do reaches her." : "Not synced right now."}
          </p>
        </div>
        <span className={`h-2.5 w-2.5 rounded-full ${liveNow ? "bg-emerald-400" : "bg-red-500"}`} />
      </div>

      {report && (
        <ul className="space-y-2 rounded-xl bg-black/25 p-3">
          {report.legs.map((leg) => (
            <li key={leg.name} className="flex items-start gap-2.5 text-xs">
              <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[leg.state]}`} />
              <span className="flex-1">
                <span className="flex items-baseline gap-2">
                  <span className="font-semibold">{LEG_LABEL[leg.name]}</span>
                  <span className="text-white/40">
                    {leg.detail} · {leg.ms}ms
                  </span>
                </span>
                <span className="block text-[11px] leading-snug text-white/35">{LEG_WHY[leg.name]}</span>
              </span>
            </li>
          ))}
          <li className="pt-1 text-[11px] leading-snug text-white/40">
            {report.healthy
              ? "The couple sync is healthy. If the app server is red, only Discover, the AI and push need the VPN."
              : "Something the sync needs is down. Try Repair, then Restart the app."}
          </li>
        </ul>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={test}
          disabled={testing}
          className="rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold transition hover:bg-white/15 disabled:opacity-50"
        >
          {testing ? "Testing..." : "Test connection"}
        </button>
        <button
          onClick={repair}
          disabled={repairing}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold transition hover:bg-white/15 disabled:opacity-50"
        >
          <Wrench className="h-3.5 w-3.5" />
          {repairing ? "Repairing..." : "Repair now"}
        </button>
        <button
          onClick={send}
          disabled={sending}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold transition hover:bg-white/15 disabled:opacity-50"
        >
          <Send className="h-3.5 w-3.5" />
          {sending ? "Sending..." : "Send log"}
        </button>
        <button
          onClick={copy}
          className="flex items-center justify-center gap-1.5 rounded-xl bg-white/10 px-3 py-2.5 text-xs font-bold transition hover:bg-white/15"
        >
          <ClipboardCopy className="h-3.5 w-3.5" />
          Copy log
        </button>
        <button
          onClick={() => window.location.reload()}
          className="col-span-2 flex items-center justify-center gap-1.5 rounded-xl bg-white/5 px-3 py-2.5 text-xs font-bold text-white/70 transition hover:bg-white/10"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Restart the app
        </button>
      </div>
    </section>
  );
}
