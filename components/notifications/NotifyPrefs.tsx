"use client";

import { useAuth } from "@/lib/auth";
import { sendTestPush } from "@/lib/live";
import { getSupabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

// Which partner actions knock on THIS person's lock screen. Saved per person in
// notify_prefs (migration 0008) and enforced on the server in claim_push(), so
// it holds on every device. The in-app bell still lists everything.
const KINDS: { types: string[]; label: string; hint: string }[] = [
  { types: ["matched"], label: "Matches", hint: "You both liked the same title" },
  { types: ["favorited"], label: "Likes & loves", hint: "They liked or loved a title" },
  { types: ["plan"], label: "Movie nights", hint: "Planned, moved or cancelled" },
  { types: ["party"], label: "Watch-alongs", hint: "Started or wrapped up" },
  { types: ["note"], label: "Notes", hint: "A note on a title" },
  { types: ["nudge"], label: "Nudges", hint: "They're thinking about something" },
  { types: ["rated"], label: "Ratings", hint: "They rated something" },
  { types: ["cinema"], label: "Cinema picks", hint: "They want to see it in cinemas" },
  { types: ["watchlisted"], label: "List changes", hint: "Saved or removed from your list" },
  { types: ["started", "watched"], label: "Watching progress", hint: "Started, paused, finished, dropped" },
  { types: ["ai"], label: "AI questions", hint: "They asked Amore AI something" },
];
// must match the default in 0008 and claim_push()
const DEFAULT_MUTED = ["watchlisted", "started", "watched", "ai"];

export function NotifyPrefs() {
  const auth = useAuth();
  const sb = getSupabase();
  const uid = auth.session?.user?.id;
  const [muted, setMuted] = useState<string[] | null>(null); // null = loading
  const [missing, setMissing] = useState(false); // 0008 not applied yet
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<string | null>(null);

  useEffect(() => {
    if (!sb || !uid) return;
    let stale = false;
    (async () => {
      const { data, error } = await sb.from("notify_prefs").select("muted").eq("user_id", uid).maybeSingle();
      if (stale) return;
      if (error) {
        setMissing(true);
        setMuted(DEFAULT_MUTED);
        return;
      }
      setMuted((data?.muted as string[] | undefined) ?? DEFAULT_MUTED);
    })();
    return () => {
      stale = true;
    };
  }, [sb, uid]);

  if (!sb || !uid) return null;

  const toggle = async (types: string[]) => {
    if (!muted || missing) return;
    const isOn = !types.some((t) => muted.includes(t));
    const next = isOn ? [...muted, ...types] : muted.filter((t) => !types.includes(t));
    const prev = muted;
    setMuted(next);
    const { error } = await sb
      .from("notify_prefs")
      .upsert({ user_id: uid, muted: next, updated_at: new Date().toISOString() });
    if (error) {
      setMuted(prev);
      setModal("Couldn't save that. Check your connection and try again.");
    }
  };

  const test = async () => {
    setBusy(true);
    try {
      const r = await sendTestPush(sb, uid);
      if (r.failed) setModal("Couldn't reach the server to send the test. Check your connection and try again.");
      else if (r.devices === 0)
        setModal("This account has no phone signed up for alerts yet. Tap \"Turn on alerts\" above first.");
      else
        setModal(
          `Sent to ${r.sent} of ${r.devices} device${r.devices === 1 ? "" : "s"}. Lock your phone now: the test should pop up within a few seconds. If it doesn't, see the phone settings guide.`
        );
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="glass space-y-3 rounded-2xl p-4">
        <div>
          <h3 className="text-base font-bold">What knocks on your phone</h3>
          <p className="text-xs text-white/45">
            {missing
              ? "Waiting for a one-time database update. Until then you get everything."
              : "Only these reach your lock screen. Everything still shows in the bell."}
          </p>
        </div>
        <div className="divide-y divide-white/5">
          {KINDS.map((k) => {
            const on = muted ? !k.types.some((t) => muted.includes(t)) : false;
            return (
              <button
                key={k.label}
                onClick={() => toggle(k.types)}
                disabled={!muted || missing}
                role="switch"
                aria-checked={on}
                className="flex w-full items-center gap-3 py-2.5 text-left disabled:opacity-50"
              >
                <span className="flex-1">
                  <span className="block text-sm font-semibold">{k.label}</span>
                  <span className="text-xs text-white/45">{k.hint}</span>
                </span>
                <span
                  className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-accent-gradient" : "bg-white/15"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[22px]" : "left-0.5"}`}
                  />
                </span>
              </button>
            );
          })}
        </div>
        <button
          onClick={test}
          disabled={busy}
          className="w-full rounded-xl bg-white/10 py-3 text-sm font-semibold transition hover:bg-white/15 disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send me a test notification"}
        </button>
      </section>

      {/* blocking modal, house rule: no vanishing toasts */}
      <AnimatePresence>
        {modal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.92, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              className="glass-strong w-full max-w-sm space-y-4 rounded-3xl p-6 text-center"
            >
              <div className="text-2xl">🔔</div>
              <p className="text-sm text-white/80">{modal}</p>
              <button
                onClick={() => setModal(null)}
                className="w-full rounded-xl bg-accent-gradient py-3 text-sm font-bold"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
