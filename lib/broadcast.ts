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

import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type BroadcastStatus = "joining" | "joined" | "error" | "closed";

export type BroadcastPayload = Record<string, unknown>;

export interface BroadcastLink {
  send(event: string, payload?: BroadcastPayload): void;
  status(): BroadcastStatus;
  close(): void;
}

interface Consumer {
  handlers: Record<string, (payload: BroadcastPayload) => void>;
  onStatus?: (status: BroadcastStatus) => void;
}

interface Entry {
  ch: RealtimeChannel;
  status: BroadcastStatus;
  consumers: Set<Consumer>;
  queue: { event: string; payload: BroadcastPayload }[];
}

const MAX_QUEUE = 20;
const registry = new Map<string, Entry>();

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

  const consumer: Consumer = { handlers, onStatus };
  let entry = registry.get(topic);

  if (!entry) {
    const ch = sb.channel(topic, { config: { broadcast: { self: false } } });
    const fresh: Entry = { ch, status: "joining", consumers: new Set(), queue: [] };
    entry = fresh;
    registry.set(topic, fresh);

    // one wildcard binding, fanned out to whoever cares about that event
    ch.on("broadcast", { event: "*" }, (msg) => {
      const event = (msg as { event?: string }).event ?? "";
      const payload = (msg as { payload?: BroadcastPayload }).payload ?? {};
      for (const c of fresh.consumers) {
        const fn = c.handlers[event];
        if (!fn) continue;
        try {
          fn(payload);
        } catch {
          /* a bad handler must never kill the channel for everyone else */
        }
      }
    });

    const setStatus = (next: BroadcastStatus) => {
      if (fresh.status === next) return;
      fresh.status = next;
      for (const c of fresh.consumers) c.onStatus?.(next);
    };

    ch.subscribe((s) => {
      if (registry.get(topic) !== fresh) return; // torn down while joining
      if (s === "SUBSCRIBED") {
        setStatus("joined");
        while (fresh.queue.length) {
          const next = fresh.queue.shift()!;
          void ch.send({ type: "broadcast", event: next.event, payload: next.payload });
        }
      } else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") {
        setStatus("error");
      } else if (s === "CLOSED") {
        setStatus("closed");
      }
    });
  }

  const mine = entry;
  mine.consumers.add(consumer);
  // a consumer joining an already-live channel has to be told so, or it would
  // sit there queueing sends against a status it never sees change
  if (mine.status !== "joining") onStatus?.(mine.status);

  let closed = false;
  return {
    send(event, payload = {}) {
      if (closed) return;
      if (mine.status === "joined") {
        void mine.ch.send({ type: "broadcast", event, payload });
      } else {
        if (mine.queue.length >= MAX_QUEUE) mine.queue.shift();
        mine.queue.push({ event, payload });
      }
    },
    status: () => mine.status,
    close() {
      if (closed) return;
      closed = true;
      mine.consumers.delete(consumer);
      if (mine.consumers.size === 0) {
        registry.delete(topic);
        mine.queue.length = 0;
        void sb.removeChannel(mine.ch);
      }
    },
  };
}
