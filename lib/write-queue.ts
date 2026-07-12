"use client";

// Offline write queue: idempotent Supabase mirrors that fail (network drop,
// 5xx) are parked here and replayed in order when connectivity returns.
// Ops store SEMANTIC args (titleId/status/watcher/value) — uuid translation
// happens at replay time in lib/live.ts, and builders are never serialized.

export type QueuedKind = "save" | "unsave" | "status" | "cinema" | "watched" | "unwatch" | "vote";

export interface QueuedOp {
  id: string;
  coupleId: string; // guard: never replay into a different couple
  kind: QueuedKind;
  args: Record<string, unknown>;
  ts: number;
}

const KEY = "amore-movies/write-queue";
const CAP = 200; // oldest dropped first; oldest loss is least harmful under last-write-wins

let seq = 0;

export function readQueue(): QueuedOp[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? (JSON.parse(raw) as QueuedOp[]) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function write(ops: QueuedOp[]) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ops.slice(-CAP)));
  } catch {
    /* storage unavailable: queueing degrades to best-effort */
  }
}

export function enqueue(op: Omit<QueuedOp, "id" | "ts">): void {
  if (typeof window === "undefined") return;
  seq += 1;
  write([...readQueue(), { ...op, id: `${Date.now()}-${seq}`, ts: Date.now() }]);
}

export function removeOps(ids: string[]): void {
  if (typeof window === "undefined" || ids.length === 0) return;
  const drop = new Set(ids);
  write(readQueue().filter((o) => !drop.has(o.id)));
}

/** Prune ops recorded for a different couple (re-pair safety). */
export function clearOtherCouples(coupleId: string): void {
  if (typeof window === "undefined") return;
  const ops = readQueue();
  const kept = ops.filter((o) => o.coupleId === coupleId);
  if (kept.length !== ops.length) write(kept);
}
