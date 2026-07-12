"use client";

import { useAuth } from "@/lib/auth";
import {
  enablePush,
  hasActiveSubscription,
  refreshPushSubscription,
  type PushSetupResult,
} from "@/lib/push";
import { getSupabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

const EXPLAIN: Record<Exclude<PushSetupResult, "granted">, string> = {
  denied:
    "Notifications are blocked for this app in your phone settings. Allow them for Amore Movies, then try again.",
  "ios-install":
    "On iPhone, push only works from the installed app. Share, then Add to Home Screen, then open Amore Movies from your home screen and turn alerts on there.",
  "no-key":
    "The server is missing its push keys, so no device can subscribe right now. Panda needs to check the Netlify VAPID variables.",
  "no-sw":
    "This device has no service worker yet. Close and reopen the app once, then try again.",
  unsupported: "This browser can't do web push. Try the installed app or a different browser.",
  error: "Could not register this device. Check your connection and try again.",
};

// Profile card: register this device for web push (nudges, matches, notes).
// The card reflects the REAL state: a saved subscription row, not just browser
// permission, and it is always tappable so a half-enabled device can retry.
export function EnableAlerts() {
  const auth = useAuth();
  const [active, setActive] = useState<boolean | null>(null); // null = checking
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<string | null>(null);
  const sb = getSupabase();
  const uid = auth.session?.user?.id;

  // on mount: self-heal a granted-but-unsaved device, then report the truth
  useEffect(() => {
    if (!sb || !uid) return;
    let stale = false;
    (async () => {
      await refreshPushSubscription(sb, uid);
      const ok = await hasActiveSubscription(sb);
      if (!stale) setActive(ok);
    })();
    return () => {
      stale = true;
    };
  }, [sb, uid]);

  if (!sb || !uid) return null; // demo mode: nothing to subscribe

  const enable = async () => {
    setBusy(true);
    try {
      const res = await enablePush(sb, uid);
      if (res === "granted") {
        setActive(true);
        setModal("Alerts are on. Nudges and matches will knock even when the app is closed 💞");
      } else {
        setActive(false);
        setModal(EXPLAIN[res]);
      }
    } catch {
      setActive(false);
      setModal(EXPLAIN.error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={enable}
        disabled={busy}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm transition hover:bg-white/[0.08] disabled:opacity-60"
      >
        <BellRing className={`h-5 w-5 ${active ? "text-accent-glow" : "text-white/50"}`} />
        <span>
          <span className="block font-semibold">
            {active ? "Alerts are on for this device" : "Turn on alerts"}
          </span>
          <span className="text-xs text-white/45">
            {busy
              ? "Asking your phone nicely..."
              : active
                ? "Nudges & matches knock even when the app is closed. Tap to re-check."
                : active === null
                  ? "Checking this device..."
                  : "Get nudges & matches even when the app is closed"}
          </span>
        </span>
      </button>

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
