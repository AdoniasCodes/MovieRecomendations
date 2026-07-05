// Per-device dismissed watch-along session ids. This is a preference of the
// device holding the phone (a UI decision to hide an invite), NOT couple data —
// so it lives outside the store seam and never syncs to Supabase.

const STORAGE_KEY = "amore-movies/dismissed-sessions";
const MAX = 20; // keep only the most recent ids so the list can't grow forever

/** the session ids this device has dismissed (newest last). SSR-safe: []. */
export function getDismissedSessions(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** permanently hide this session id on this device (keeps the last 20 ids). */
export function dismissSession(id: string): void {
  if (typeof window === "undefined" || !id) return;
  try {
    const next = [...getDismissedSessions().filter((x) => x !== id), id].slice(-MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* storage full/unavailable — dismissal just won't persist, no crash */
  }
}

export function isDismissed(id: string): boolean {
  return getDismissedSessions().includes(id);
}
