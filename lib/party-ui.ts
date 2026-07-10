"use client";

// Per-mount watch-along UI state, OUTSIDE the store seam on purpose: the store
// re-hydrates wholesale on every realtime refetch, which must never reset
// whether THIS device has the party open or minimized. Same tiny external
// store pattern as title-sheet.ts. Not persisted: a reload should re-offer the
// invite card for any still-active session (that's the resume path).

import { useSyncExternalStore } from "react";

export interface PartyUi {
  /** session key this device opened full-screen (Join / Resume / notification tap) */
  acceptedKey: string | null;
  /** session key this device minimized to the resume chip (Later / minimize) */
  collapsedKey: string | null;
}

let current: PartyUi = { acceptedKey: null, collapsedKey: null };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function acceptParty(key: string) {
  current = { acceptedKey: key, collapsedKey: null };
  emit();
}

export function collapseParty(key: string) {
  current = { acceptedKey: null, collapsedKey: key };
  emit();
}

export function resetPartyUi() {
  current = { acceptedKey: null, collapsedKey: null };
  emit();
}

export function usePartyUi(): PartyUi {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => current
  );
}
