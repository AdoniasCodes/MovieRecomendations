"use client";

// Loud "not synced" strip. A signed-in app whose couple slice never loaded
// looks perfectly normal while writing nothing to Supabase (everything stays
// local). This strip makes that state impossible to miss and tappable to
// repair. It never shows in true demo mode (Supabase not configured) or while
// the WelcomeGate (z-100) is covering the app.
import { useAuth } from "@/lib/auth";
import { useStore } from "@/lib/store";
import { AnimatePresence, motion } from "framer-motion";
import { CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";

export function SyncStatus() {
  const auth = useAuth();
  const store = useStore();
  const bad = auth.configured && !auth.loading && !!auth.session && (!auth.couple || !auth.partner);

  // only surface once the state persists; boot wobble must not flash it
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!bad) {
      setShow(false);
      return;
    }
    const t = setTimeout(() => setShow(true), 6_000);
    return () => clearTimeout(t);
  }, [bad]);

  const retry = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await auth.refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -60, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          onClick={retry}
          className="fixed inset-x-0 top-0 z-[45] flex items-center justify-center gap-2 bg-red-600/95 px-4 py-2.5 text-xs font-bold text-white shadow-card"
        >
          <CloudOff className="h-4 w-4 shrink-0" />
          <span>
            Not synced: {store.partner.name} can&apos;t see what you do. Tap to reconnect.
          </span>
          <RefreshCw className={`h-4 w-4 shrink-0 ${busy ? "animate-spin" : ""}`} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
