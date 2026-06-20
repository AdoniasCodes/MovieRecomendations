"use client";

import { useSyncExternalStore } from "react";

let current: string | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function openTitleSheet(id: string) {
  current = id;
  emit();
}
export function closeTitleSheet() {
  current = null;
  emit();
}

export function useOpenTitleId() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
    () => null
  );
}
