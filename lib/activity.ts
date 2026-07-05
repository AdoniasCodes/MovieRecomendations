"use client";

// Idle tracking for the welcome gate's re-lock. We stamp "last activity" into
// localStorage (throttled) whenever the user touches the app; the gate compares
// it against now() to decide whether to re-lock after a long idle.

import { useEffect } from "react";

const KEY = "amore-movies/last-activity";
const THROTTLE = 30_000; // at most one write per 30s

let lastWrite = 0;

/** Record activity now, throttled to one write per 30s. Safe on the server. */
export function touchActivity() {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - lastWrite < THROTTLE) return;
  lastWrite = now;
  try {
    window.localStorage.setItem(KEY, String(now));
  } catch {
    /* storage unavailable — idle re-lock just won't fire */
  }
}

/** Epoch ms of the last recorded activity, or 0 if never. */
export function getLastActivity(): number {
  if (typeof window === "undefined") return 0;
  try {
    return Number(window.localStorage.getItem(KEY)) || 0;
  } catch {
    return 0;
  }
}

/** Mount once (app root): passive listeners that keep last-activity fresh. */
export function useActivityTracker() {
  useEffect(() => {
    const onActive = () => touchActivity();
    const onVisible = () => {
      if (document.visibilityState === "visible") touchActivity();
    };
    touchActivity(); // stamp on mount
    window.addEventListener("pointerdown", onActive, { passive: true });
    window.addEventListener("keydown", onActive, { passive: true });
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("pointerdown", onActive);
      window.removeEventListener("keydown", onActive);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
}
