"use client";

// Loud "not synced" strip. A signed-in app whose couple slice never loaded
// looks perfectly normal while writing nothing to Supabase (everything stays
// local). This strip makes that state impossible to miss and tappable to
// repair. It never shows in true demo mode (Supabase not configured) or while
// the WelcomeGate (z-100) is covering the app.
//
// 2026-08-16: it now ESCALATES instead of pretending. The old strip called
// auth.refresh(), which re-ran the same queries with the same stale token and
// could not fix the failure it was reporting, so tapping it did nothing while
// force-quitting the app worked, the single most infuriating part of this bug.
// Now: tap runs the full repair (fresh token, reload, rebuilt sockets), and if
// that genuinely fails the strip says so and offers the restart that is known
// to work, rather than leaving a spinner going. It also uploads the device log
// once per app-open so the failure can be read from the database afterwards.
import { useAuth } from "@/lib/auth";
import { diag } from "@/lib/diag";
import { identityFromEmail } from "@/lib/identity";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, RefreshCw, RotateCw, WifiOff } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Phase = "idle" | "repairing" | "failed";

export function SyncStatus() {
  const auth = useAuth();
  const store = useStore();
  // the SESSION identity, never the display toggle: a log labelled with the
  // wrong person is worse than an unlabelled one (see instructions.md 8e)
  const me = identityFromEmail(auth.session?.user.email) ?? undefined;
  const bad = auth.configured && !auth.loading && !!auth.session && (!auth.couple || !auth.partner);

  // only surface once the state persists; boot wobble must not flash it
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [offline, setOffline] = useState(false);
  const uploaded = useRef(false);

  useEffect(() => {
    if (!bad) {
      setShow(false);
      setPhase("idle");
      return;
    }
    const t = setTimeout(() => {
      setShow(true);
      diag.log("sync.bad", auth.couple ? "no partner" : "no couple");
      // One automatic upload per app-open. This is the whole reason the log
      // exists: the phone that fails is never the phone in front of me.
      if (!uploaded.current) {
        uploaded.current = true;
        void diag.upload("not-synced", me);
      }
    }, 6_000);
    return () => clearTimeout(t);
  }, [bad, auth.couple, me]);

  // honest about the obvious cause before blaming anything cleverer
  useEffect(() => {
    const sync = () => setOffline(typeof navigator !== "undefined" && !navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  const repair = async () => {
    if (phase === "repairing") return;
    setPhase("repairing");
    const ok = await auth.reconnect();
    // `bad` flipping false unmounts the strip on success; only failure needs a
    // state change here.
    setPhase(ok ? "idle" : "failed");
    if (!ok) void diag.upload("repair-failed", me);
  };

  const restart = () => {
    diag.log("sync.restart");
    // A reload destroys the JS context and builds a fresh Supabase client,
    // which is exactly what force-quitting the app was doing by hand.
    window.location.reload();
  };

  const failed = phase === "failed";
  const busy = phase === "repairing";

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          className={`fixed inset-x-0 top-0 z-[45] flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white shadow-card ${
            failed ? "bg-amber-600/95" : "bg-red-600/95"
          }`}
        >
          {offline ? (
            <>
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>No connection. {store.partner.name} can&apos;t see what you do.</span>
            </>
          ) : failed ? (
            <>
              <CloudOff className="h-4 w-4 shrink-0" />
              <span>Still not syncing.</span>
              <button
                onClick={restart}
                className="ml-1 flex shrink-0 items-center gap-1 rounded-full bg-white/25 px-2.5 py-1 font-bold"
              >
                <RotateCw className="h-3.5 w-3.5" />
                Restart the app
              </button>
              <button onClick={repair} className="shrink-0 rounded-full bg-white/15 px-2.5 py-1">
                Retry
              </button>
            </>
          ) : (
            <button onClick={repair} className="flex items-center gap-2" disabled={busy}>
              <CloudOff className="h-4 w-4 shrink-0" />
              <span>
                {busy
                  ? "Reconnecting..."
                  : `Not synced: ${store.partner.name} can't see what you do. Tap to reconnect.`}
              </span>
              <RefreshCw className={`h-4 w-4 shrink-0 ${busy ? "animate-spin" : ""}`} />
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
