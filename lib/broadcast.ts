"use client";

// Thin wrapper over Supabase Realtime BROADCAST, for live couple features that
// are pure presentation and should never touch the database: the anniversary
// stage and the After Dark pulse remote.
//
// Why broadcast and not a table: there is nothing here worth persisting, it
// needs to be instant, and it means no migration for Panda to apply. Broadcast
// channels are also completely separate from the postgres_changes channels in
// lib/live.ts, which matters because one failed table join takes a whole
// channel down with it (learned the hard way in Phase 11 regression testing).
//
// ONE CHANNEL PER TOPIC PER CLIENT. This is the important part and it cost a
// debugging session to find. A single Supabase client cannot hold two
// subscriptions to the same topic: the second phx_join never completes, so that
// consumer's sends queue up forever and it looks like "not connected". On
// Panda's phone exactly that happens, because AnniversaryStage is mounted
// globally in providers.tsx while DirectorPanel wants the same topic. So the
// underlying RealtimeChannel is shared and reference counted here, with a
// wildcard binding fanned out to each consumer's handlers, and it is only torn
// down when the last consumer closes.
//
// Note `self: false`: a client never hears its own message. That is what keeps
// Panda's own stage from taking over his phone when his panel fires a module,
// even though both now sit on the same channel.
//
// RECOVERY (added 2026-08-01, after the day went live and his panel sat on
// "Not connected"). There was previously NO retry here at all: one CHANNEL_ERROR
// or one CLOSED and that topic was dead until the component remounted. That is
// fatal on a phone, which drops its websocket every single time the screen
// locks. Three things now bring it back:
//
//   1. Backoff retry whenever a join errors or closes while consumers remain.
//   2. A kick on `online` and on returning to the foreground.
//   3. A FORCED rejoin when the app was hidden for more than a few seconds,
//      even if the status still claims "joined". iOS suspends JavaScript wholesale
//      when a PWA is backgrounded, so on resume the socket is frequently a zombie:
//      it looks connected, and every send vanishes. Assuming the connection is
//      dead and rebuilding it is far cheaper than a module that never lands.

import type { RealtimeChannel, SupabaseClient } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type BroadcastStatus = "joining" | "joined" | "error" | "closed";

export type BroadcastPayload = Record<string, unknown>;

export interface BroadcastLink {
  send(event: string, payload?: BroadcastPayload): void;
  status(): BroadcastStatus;
  /** force a fresh join now, for a caller that knows the link is stale */
  revive(): void;
  close(): void;
}

interface Consumer {
  handlers: Record<string, (payload: BroadcastPayload) => void>;
  onStatus?: (status: BroadcastStatus) => void;
}

interface Entry {
  topic: string;
  ch: RealtimeChannel | null;
  status: BroadcastStatus;
  consumers: Set<Consumer>;
  queue: { event: string; payload: BroadcastPayload }[];
  attempt: number;
  timer: ReturnType<typeof setTimeout> | null;
}

const MAX_QUEUE = 20;
/** stepped backoff, then steady. Never gives up: the night may last hours. */
const RETRY_MS = [1_500, 3_000, 6_000, 10_000, 15_000];
/** hidden for longer than this and we treat the socket as dead on the way back */
const ZOMBIE_AFTER_MS = 4_000;

const registry = new Map<string, Entry>();

function setStatus(entry: Entry, next: BroadcastStatus) {
  if (entry.status === next) return;
  entry.status = next;
  for (const c of entry.consumers) c.onStatus?.(next);
}

function flush(sb: SupabaseClient, entry: Entry) {
  while (entry.queue.length && entry.ch) {
    const next = entry.queue.shift()!;
    void entry.ch.send({ type: "broadcast", event: next.event, payload: next.payload });
  }
}

function scheduleRejoin(sb: SupabaseClient, entry: Entry) {
  if (entry.timer || entry.consumers.size === 0) return;
  const wait = RETRY_MS[Math.min(entry.attempt, RETRY_MS.length - 1)];
  entry.attempt += 1;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    if (registry.get(entry.topic) !== entry || entry.consumers.size === 0) return;
    join(sb, entry);
  }, wait);
}

function join(sb: SupabaseClient, entry: Entry) {
  if (entry.timer) {
    clearTimeout(entry.timer);
    entry.timer = null;
  }

  // Tear the old channel down FIRST. A half-joined zombie holds the topic and
  // the replacement's phx_join would never complete behind it.
  if (entry.ch) {
    const old = entry.ch;
    entry.ch = null;
    void sb.removeChannel(old);
  }

  const ch = sb.channel(entry.topic, { config: { broadcast: { self: false } } });
  entry.ch = ch;
  if (entry.status !== "joined") setStatus(entry, "joining");

  // one wildcard binding, fanned out to whoever cares about that event
  ch.on("broadcast", { event: "*" }, (msg) => {
    const event = (msg as { event?: string }).event ?? "";
    const payload = (msg as { payload?: BroadcastPayload }).payload ?? {};
    for (const c of entry.consumers) {
      const fn = c.handlers[event];
      if (!fn) continue;
      try {
        fn(payload);
      } catch {
        /* a bad handler must never kill the channel for everyone else */
      }
    }
  });

  ch.subscribe((s) => {
    // stale callback from a channel we have already replaced or removed
    if (registry.get(entry.topic) !== entry || entry.ch !== ch) return;
    if (s === "SUBSCRIBED") {
      entry.attempt = 0;
      setStatus(entry, "joined");
      flush(sb, entry);
    } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
      setStatus(entry, "error");
      scheduleRejoin(sb, entry);
    } else if (s === "CLOSED") {
      setStatus(entry, "closed");
      scheduleRejoin(sb, entry);
    }
  });
}

/* -------------------------------------------------- foreground / net recovery */

let wired = false;
let hiddenAt = 0;

function wireRecovery(sb: SupabaseClient) {
  if (wired || typeof window === "undefined") return;
  wired = true;

  const rejoinAll = (force: boolean) => {
    for (const entry of registry.values()) {
      if (entry.consumers.size === 0) continue;
      if (force || entry.status !== "joined") {
        entry.attempt = 0;
        join(sb, entry);
      }
    }
  };

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      hiddenAt = Date.now();
      return;
    }
    // Back in the foreground. If the phone was away long enough for iOS to
    // suspend us, do not trust a "joined" status: rebuild everything.
    const away = hiddenAt ? Date.now() - hiddenAt : 0;
    hiddenAt = 0;
    rejoinAll(away > ZOMBIE_AFTER_MS);
  });

  window.addEventListener("online", () => rejoinAll(true));
  window.addEventListener("focus", () => rejoinAll(false));
}

/* ------------------------------------------------------------------- public */

/**
 * Join a broadcast topic. Returns null when Supabase is not configured (demo
 * mode), so callers can fall back to a local-only experience instead of
 * crashing.
 *
 * Event names are matched case-insensitively by realtime-js, so keep them
 * lowercase (see lib/anniversary/channel.ts).
 */
export function openBroadcast(
  topic: string,
  handlers: Record<string, (payload: BroadcastPayload) => void>,
  onStatus?: (status: BroadcastStatus) => void
): BroadcastLink | null {
  const sb = getSupabase();
  if (!sb) return null;
  wireRecovery(sb);

  const consumer: Consumer = { handlers, onStatus };
  let entry = registry.get(topic);

  if (!entry) {
    entry = {
      topic,
      ch: null,
      status: "joining",
      consumers: new Set(),
      queue: [],
      attempt: 0,
      timer: null,
    };
    registry.set(topic, entry);
    entry.consumers.add(consumer);
    join(sb, entry);
  } else {
    entry.consumers.add(consumer);
    // A consumer joining an already-live channel has to be told so, or it would
    // sit there queueing sends against a status it never sees change.
    if (entry.status !== "joining") onStatus?.(entry.status);
    // ...and one joining a BROKEN channel should kick a retry rather than
    // inherit the failure and wait for a timer that may be minutes away.
    if (entry.status === "error" || entry.status === "closed") {
      entry.attempt = 0;
      join(sb, entry);
    }
  }

  const mine = entry;
  let closed = false;
  return {
    send(event, payload = {}) {
      if (closed) return;
      if (mine.status === "joined" && mine.ch) {
        void mine.ch.send({ type: "broadcast", event, payload });
      } else {
        if (mine.queue.length >= MAX_QUEUE) mine.queue.shift();
        mine.queue.push({ event, payload });
      }
    },
    status: () => mine.status,
    revive() {
      if (closed || mine.consumers.size === 0) return;
      mine.attempt = 0;
      join(sb, mine);
    },
    close() {
      if (closed) return;
      closed = true;
      mine.consumers.delete(consumer);
      if (mine.consumers.size === 0) {
        registry.delete(mine.topic);
        mine.queue.length = 0;
        if (mine.timer) clearTimeout(mine.timer);
        if (mine.ch) void sb.removeChannel(mine.ch);
        mine.ch = null;
      }
    },
  };
}
