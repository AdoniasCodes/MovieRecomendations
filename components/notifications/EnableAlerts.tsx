"use client";

import { useAuth } from "@/lib/auth";
import { enablePush, pushPermission, refreshPushSubscription, type PushSetupResult } from "@/lib/push";
import { getSupabase } from "@/lib/supabase";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing } from "lucide-react";
import { useEffect, useState } from "react";

// Profile card: register this device for web push (nudges, matches, notes).
export function EnableAlerts() {
  const auth = useAuth();
  const [state, setState] = useState<"idle" | "busy" | PushSetupResult>("idle");
  const [modal, setModal] = useState<string | null>(null);
  const sb = getSupabase();
  const uid = auth.session?.user?.id;

  // permission already granted on this device: silently keep the stored
  // subscription fresh, and reflect status in the card
  useEffect(() => {
    if (!sb || !uid) return;
    if (pushPermission() === "granted") {
      setState("granted");
      void refreshPushSubscription(sb, uid);
    }
  }, [sb, uid]);

  if (!sb || !uid) return null; // demo mode: nothing to subscribe

  const enable = async () => {
    setState("busy");
    const res = await enablePush(sb, uid);
    setState(res);
    if (res === "denied") {
      setModal(
        "Notifications are blocked for this app in your phone settings. Allow them for Amore Movies, then try again."
      );
    } else if (res === "unsupported") {
      setModal(
        "This browser can't do push here. On iPhone, install the app to your home screen first (Share, then Add to Home Screen), then enable alerts from inside the installed app."
      );
    } else if (res === "error") {
      setModal("Could not register this device. Check your connection and try again.");
    }
  };

  return (
    <>
      <button
        onClick={state === "granted" ? undefined : enable}
        disabled={state === "busy"}
        className="glass flex w-full items-center gap-3 rounded-2xl p-4 text-left text-sm transition hover:bg-white/[0.08] disabled:opacity-60"
      >
        <BellRing className={`h-5 w-5 ${state === "granted" ? "text-accent-glow" : "text-white/50"}`} />
        <span>
          <span className="block font-semibold">
            {state === "granted" ? "Alerts are on for this device" : "Turn on alerts"}
          </span>
          <span className="text-xs text-white/45">
            {state === "granted"
              ? "Nudges & matches will knock even when the app is closed"
              : state === "busy"
                ? "Asking your phone nicely..."
                : "Get nudges & matches even when the app is closed"}
          </span>
        </span>
      </button>

      {/* blocking error modal, house rule: no vanishing toasts for errors */}
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
