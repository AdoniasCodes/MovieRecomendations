"use client";

// The demo switch for the anniversary experience.
//
// Deliberately DEVICE-LOCAL (localStorage), not a database row and not tied to
// an account. Two reasons, both important:
//
//   1. Panda turns it on as himself, then switches identity to Hermi ON THE
//      SAME PHONE to watch her side, then switches back and turns it off. A
//      device-scoped flag survives that identity switch, which is exactly the
//      flow he asked for. An account-scoped flag would not.
//   2. Her actual phone can never be put into demo mode from here. There is no
//      code path that writes this flag anywhere except the device you are
//      holding, so the real experience on her phone cannot be disturbed by
//      testing on his.
//
// While demo is on, the stage ignores the date gate and the once-per-device
// flag, and never writes that flag, so testing cannot consume her real first
// open. Same tiny external-store pattern as lib/identity.ts.

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "amore-movies/anniv-demo";

let on = false;
let hydrated = false;
const listeners = new Set<() => void>();

const emit = () => listeners.forEach((l) => l());

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    on = window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    /* storage unavailable: stays off, which is the safe default */
  }
}

export function getAnniversaryDemo(): boolean {
  hydrate();
  return on;
}

export function setAnniversaryDemo(next: boolean): void {
  hydrated = true;
  on = next;
  if (typeof window !== "undefined") {
    try {
      if (next) window.localStorage.setItem(STORAGE_KEY, "1");
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* still works in memory for this session */
    }
  }
  emit();
}

export function useAnniversaryDemo(): boolean {
  return useSyncExternalStore(
    (cb) => {
      hydrate();
      listeners.add(cb);
      emit();
      return () => listeners.delete(cb);
    },
    () => on,
    () => false // server render is never in demo mode
  );
}
