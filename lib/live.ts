// Live data layer: translate the local store's "me"/"her" semantic ids to/from
// real Supabase rows (auth uuids), so the existing reducer/UI never change.
// Strategy: optimistic local dispatch + mirror write here; realtime change →
// refetch the couple slice and re-hydrate (idempotent, simple, fine for 2 people).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  ActivityEvent, AiMessage, Match, Note, Notification, Plan, PlanStatus, Reaction, Vote,
  Watcher, WatchPartyRecord, WatchPartyStatus, WatchSession, WatchedRecord, WatchlistItem,
} from "./types";
import { getLastActivity } from "./activity";
import {
  clearOtherCouples, enqueue, readQueue, removeOps, type QueuedKind, type QueuedOp,
} from "./write-queue";

export interface Ids {
  couple: string;
  my: string;
  her: string;
}

export interface CoupleSlice {
  watchlist: WatchlistItem[];
  votes: Vote[];
  matches: Match[];
  watched: WatchedRecord[];
  ratings: Record<string, number>;
  notes: Note[];
  notifications: Notification[];
  session: WatchSession | null;
  aiMessages: AiMessage[];
  activity: ActivityEvent[];
  plans: Plan[];
}

const ts = (s: string | null) => (s ? Date.parse(s) : 0);

// ---- load the whole couple slice -----------------------------------------

export async function loadCoupleState(
  sb: SupabaseClient,
  ids: Ids,
  herOnline: boolean
): Promise<CoupleSlice> {
  const who = (uid: string): Watcher => (uid === ids.my ? "me" : "her");
  const c = ids.couple;

  const [wl, vt, mt, wd, nt, nf, ws, am, ac, pl] = await Promise.all([
    sb.from("watchlist").select("*").eq("couple_id", c),
    sb.from("votes").select("*").eq("couple_id", c),
    sb.from("matches").select("*").eq("couple_id", c),
    sb.from("watched").select("*").eq("couple_id", c),
    sb.from("notes").select("*").eq("couple_id", c),
    sb.from("notifications").select("*").eq("couple_id", c).order("created_at", { ascending: false }).limit(80),
    sb.from("watch_sessions").select("*").eq("couple_id", c).eq("active", true)
      .gte("started_at", new Date(Date.now() - 4 * 3600_000).toISOString())
      .order("started_at", { ascending: false }).limit(1),
    // grab the LAST 100 by fetching newest-first then reversing to chronological
    sb.from("ai_messages").select("*").eq("couple_id", c).order("created_at", { ascending: false }).limit(100),
    // pre-0006 these two error out; `?? []` degrades them gracefully
    sb.from("activity").select("*").eq("couple_id", c).order("created_at", { ascending: false }).limit(100),
    sb.from("watch_plans").select("*").eq("couple_id", c).eq("status", "planned").order("scheduled_at", { ascending: true }),
  ]);

  const watchlist: WatchlistItem[] = (wl.data ?? []).map((r) => ({
    titleId: r.title_id, addedBy: who(r.added_by), status: r.status, createdAt: ts(r.created_at), cinema: r.cinema,
  }));
  const votes: Vote[] = (vt.data ?? []).map((r) => ({
    titleId: r.title_id, userId: who(r.user_id), value: r.value, createdAt: ts(r.created_at),
  }));
  const matches: Match[] = (mt.data ?? []).map((r) => ({ titleId: r.title_id, matchedAt: ts(r.matched_at) }));
  const watched: WatchedRecord[] = (wd.data ?? []).map((r) => ({
    titleId: r.title_id, watcher: who(r.watcher), rating: r.rating ?? undefined, createdAt: ts(r.created_at),
  }));
  const ratings: Record<string, number> = {};
  for (const w of watched) if (w.watcher === "me" && w.rating != null) ratings[w.titleId] = w.rating;
  const notes: Note[] = (nt.data ?? []).map((r) => ({
    id: r.id, titleId: r.title_id, authorId: who(r.author_id), text: r.body, createdAt: ts(r.created_at),
  }));
  const notifications: Notification[] = (nf.data ?? []).map((r) => ({
    id: r.id, type: r.type, actorId: who(r.actor_id), toId: who(r.to_id), titleId: r.title_id ?? undefined,
    text: r.body, read: r.read, createdAt: ts(r.created_at),
  }));
  // fetched newest-first (bounded to 100); reverse to oldest-first for the thread.
  const aiMessages: AiMessage[] = (am.data ?? [])
    .map((r) => ({
      id: r.id, authorId: who(r.author_id), role: r.role, text: r.body,
      picks: r.picks ?? undefined, source: r.source ?? undefined, createdAt: ts(r.created_at),
    }))
    .reverse();

  let session: WatchSession | null = null;
  const s = ws.data?.[0];
  if (s) {
    const { data: rx } = await sb.from("reactions").select("*").eq("session_id", s.id).order("at", { ascending: true });
    const reactions: Reaction[] = (rx ?? []).map((r) => ({
      id: r.id, by: who(r.by_user), kind: r.kind, content: r.content, at: ts(r.at),
    }));
    const parts = new Set<string>(["me", who(s.host_id), ...reactions.map((r) => r.by)]);
    if (herOnline) parts.add("her");
    session = {
      id: s.id, titleId: s.title_id, hostId: who(s.host_id), startedAt: ts(s.started_at),
      participants: [...parts], reactions, active: true,
      status: (s.status as WatchSession["status"]) ?? "in_progress",
    };
  }

  const activity: ActivityEvent[] = (ac.data ?? []).map((r) => ({
    id: r.id,
    actorId: who(r.actor_id),
    type: r.type,
    titleId: r.title_id ?? undefined,
    detail: r.detail ?? undefined,
    createdAt: ts(r.created_at),
  }));

  const plans: Plan[] = (pl.data ?? []).map((r) => ({
    id: r.id,
    titleId: r.title_id,
    plannedBy: who(r.planned_by),
    scheduledAt: ts(r.scheduled_at),
    status: r.status as PlanStatus,
    remindedAt: r.reminded_at ? ts(r.reminded_at) : undefined,
    createdAt: ts(r.created_at),
  }));

  return { watchlist, votes, matches, watched, ratings, notes, notifications, session, aiMessages, activity, plans };
}

// Fire-and-forget web push to the partner's registered devices. Failure is
// fine: the notifications row is the source of truth, push is just the knock.
async function sendWebPush(sb: SupabaseClient, toUserId: string, body: string) {
  try {
    const { data } = await sb.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({ toUserId, title: "Amore Movies 💞", body, url: "/" }),
      signal: AbortSignal.timeout(10_000),
    });
    // observable via remote debugging: a 503 or {devices:0} means push is
    // misconfigured or the partner never subscribed — don't fail silently.
    const result = (await res.json().catch(() => null)) as { sent?: number; devices?: number } | null;
    if (!res.ok || (result && result.devices === 0)) {
      console.warn("[push] send degraded:", res.status, result);
    }
  } catch {
    /* best effort */
  }
}

// ---- self-echo suppression -------------------------------------------------
// Realtime echoes our OWN writes back to us. Since every local mutation is
// already dispatched optimistically, refetching the whole couple slice for a
// self-echo is pure waste (8 queries + a full re-render per swipe/save — the
// post-0004 slowdown). High-frequency tables record a local-write stamp here
// and their echoes are dropped while it is fresh. Low-frequency tables (notes,
// ai_messages, sessions, reactions) keep the refetch: it is how locally
// created rows pick up their server-assigned ids.
const SELF_ECHO_MS = 4_000;
const recentLocalWrites = new Map<string, number>();
const markLocalWrite = (table: string) => recentLocalWrites.set(table, Date.now());
const isSelfEcho = (table: string) => {
  const at = recentLocalWrites.get(table);
  return at != null && Date.now() - at < SELF_ECHO_MS;
};

// ---- write mirrors (semantic -> uuid) ------------------------------------

const uid = (ids: Ids, w: Watcher) => (w === "me" ? ids.my : ids.her);

// CRITICAL: supabase-js builders are LAZY — the request is only sent when the
// builder is awaited/then'd. Every mirror below is called fire-and-forget from
// store.tsx, so each must be forced to execute here. run() kicks the builder
// (Promise.resolve subscribes to the thenable) and swallows network errors
// (the optimistic local dispatch already happened; the next refetch reconciles).
function run<T>(builder: PromiseLike<T>): Promise<T | undefined> {
  return Promise.resolve(builder).catch(() => undefined);
}

// ---- offline write queue -----------------------------------------------
// supabase-js resolves HTTP failures with {error} and REJECTS on network
// failures; attempt() folds both into one success signal.
async function attempt(builder: PromiseLike<unknown>): Promise<boolean> {
  try {
    const res = (await builder) as { error?: unknown } | null | undefined;
    return !(res && res.error);
  } catch {
    return false;
  }
}

// Builders for the queueable, IDEMPOTENT mirrors only (semantic args in).
// notify/note/aiMessage/reactions/sessions are never queued: replaying an
// insert can duplicate, which is worse than losing one.
type MirrorArgs = {
  titleId?: string;
  status?: string;
  cinema?: boolean;
  watcher?: Watcher;
  rating?: number;
  value?: string;
};
const mirror: Record<QueuedKind, (sb: SupabaseClient, ids: Ids, a: MirrorArgs) => PromiseLike<unknown>> = {
  save: (sb, ids, a) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: a.titleId, added_by: ids.my, status: "interested" },
      { onConflict: "couple_id,title_id", ignoreDuplicates: true }
    ),
  unsave: (sb, ids, a) => sb.from("watchlist").delete().eq("couple_id", ids.couple).eq("title_id", a.titleId),
  status: (sb, ids, a) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: a.titleId, added_by: ids.my, status: a.status },
      { onConflict: "couple_id,title_id" }
    ),
  cinema: (sb, ids, a) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: a.titleId, added_by: ids.my, status: "interested", cinema: a.cinema },
      { onConflict: "couple_id,title_id" }
    ).then(() => sb.from("watchlist").update({ cinema: a.cinema }).eq("couple_id", ids.couple).eq("title_id", a.titleId)),
  watched: (sb, ids, a) =>
    sb.from("watched").upsert(
      {
        couple_id: ids.couple, title_id: a.titleId, watcher: uid(ids, a.watcher!),
        ...(a.rating != null ? { rating: a.rating } : {}),
      },
      { onConflict: "couple_id,title_id,watcher" }
    ),
  unwatch: (sb, ids, a) =>
    sb.from("watched").delete().eq("couple_id", ids.couple).eq("title_id", a.titleId).eq("watcher", uid(ids, a.watcher!)),
  vote: (sb, ids, a) =>
    sb.from("votes").upsert(
      { couple_id: ids.couple, title_id: a.titleId, user_id: ids.my, value: a.value },
      { onConflict: "couple_id,title_id,user_id" }
    ),
};

const echoTable: Record<QueuedKind, string> = {
  save: "watchlist", unsave: "watchlist", status: "watchlist", cinema: "watchlist",
  watched: "watched", unwatch: "watched", vote: "votes",
};

/** fire the mirror; on failure park it in the offline queue for replay. */
function queuedMirror(sb: SupabaseClient, ids: Ids, kind: QueuedKind, args: MirrorArgs) {
  markLocalWrite(echoTable[kind]);
  void attempt(mirror[kind](sb, ids, args)).then((ok) => {
    if (!ok) enqueue({ coupleId: ids.couple, kind, args });
  });
}

/** Replay parked writes in strict FIFO (last-write-wins for 2 users). Stops on
 * the first failure to preserve order. Returns how many ops landed. */
export async function flushWriteQueue(sb: SupabaseClient, ids: Ids): Promise<number> {
  clearOtherCouples(ids.couple);
  const ops: QueuedOp[] = readQueue().filter((o) => o.coupleId === ids.couple);
  const done: string[] = [];
  for (const op of ops) {
    markLocalWrite(echoTable[op.kind]);
    const ok = await attempt(mirror[op.kind](sb, ids, op.args as MirrorArgs));
    if (!ok) break;
    done.push(op.id);
    // a replayed like may quietly complete a match (accepted: no celebration
    // overlay for this edge; the row arrives via the reconcile refetch)
    const a = op.args as MirrorArgs;
    if (op.kind === "vote" && (a.value === "like" || a.value === "love") && a.titleId) {
      await maybeFormMatch(sb, ids, a.titleId).catch(() => null);
    }
  }
  removeOps(done);
  return done.length;
}

export const push = {
  save: (sb: SupabaseClient, ids: Ids, titleId: string) => queuedMirror(sb, ids, "save", { titleId }),
  unsave: (sb: SupabaseClient, ids: Ids, titleId: string) => queuedMirror(sb, ids, "unsave", { titleId }),
  status: (sb: SupabaseClient, ids: Ids, titleId: string, status: string) =>
    queuedMirror(sb, ids, "status", { titleId, status }),
  cinema: (sb: SupabaseClient, ids: Ids, titleId: string, cinema: boolean) =>
    queuedMirror(sb, ids, "cinema", { titleId, cinema }),
  watched: (sb: SupabaseClient, ids: Ids, titleId: string, w: Watcher, rating?: number) =>
    queuedMirror(sb, ids, "watched", { titleId, watcher: w, ...(rating != null ? { rating } : {}) }),
  unwatch: (sb: SupabaseClient, ids: Ids, titleId: string, w: Watcher) =>
    queuedMirror(sb, ids, "unwatch", { titleId, watcher: w }),
  /** couple activity feed row (Us tab). High-frequency: self-echo suppressed. */
  activity: (sb: SupabaseClient, ids: Ids, type: string, detail: string, titleId?: string) => {
    markLocalWrite("activity");
    return run(sb.from("activity").insert({
      couple_id: ids.couple, actor_id: ids.my, type, title_id: titleId ?? null, detail,
    }));
  },
  /** plan a movie night. Low-frequency: refetch delivers the server id. */
  plan: (sb: SupabaseClient, ids: Ids, titleId: string, scheduledAtISO: string) =>
    run(sb.from("watch_plans").insert({
      couple_id: ids.couple, title_id: titleId, planned_by: ids.my, scheduled_at: scheduledAtISO,
    })),
  cancelPlan: (sb: SupabaseClient, planId: string) =>
    run(sb.from("watch_plans").update({ status: "cancelled" }).eq("id", planId)),
  setPlanStatus: (sb: SupabaseClient, planId: string, status: PlanStatus) =>
    run(sb.from("watch_plans").update({ status }).eq("id", planId)),
  /** atomic single-flight reminder claim: true only for the one device that
   * flips reminded_at from null. */
  claimReminder: async (sb: SupabaseClient, planId: string): Promise<boolean> => {
    try {
      const { data, error } = await sb
        .from("watch_plans")
        .update({ reminded_at: new Date().toISOString() })
        .eq("id", planId)
        .is("reminded_at", null)
        .select("id");
      return !error && (data?.length ?? 0) > 0;
    } catch {
      return false;
    }
  },
  note: (sb: SupabaseClient, ids: Ids, titleId: string, body: string) =>
    run(sb.from("notes").insert({ couple_id: ids.couple, title_id: titleId, author_id: ids.my, body })),
  deleteNote: (sb: SupabaseClient, ids: Ids, noteId: string) =>
    run(sb.from("notes").delete().eq("id", noteId)),
  notify: (sb: SupabaseClient, ids: Ids, type: string, body: string, titleId?: string) => {
    // best-effort web push so the partner is alerted even with the app closed
    void sendWebPush(sb, ids.her, body);
    markLocalWrite("notifications");
    return run(sb.from("notifications").insert({
      couple_id: ids.couple, type, actor_id: ids.my, to_id: ids.her, title_id: titleId ?? null, body, read: false,
    }));
  },
  readNotifs: (sb: SupabaseClient, ids: Ids) => {
    markLocalWrite("notifications");
    return run(sb.from("notifications").update({ read: true }).eq("couple_id", ids.couple).eq("to_id", ids.my));
  },
  startSession: async (sb: SupabaseClient, ids: Ids, titleId: string): Promise<string | null> => {
    // never leave two active rows: retire any existing active session first.
    // An auto-retired session was never wrapped up on purpose, so it reads as
    // dropped. Falls back without the column until migration 0005 is applied.
    const retired = await sb
      .from("watch_sessions")
      .update({ active: false, ended_at: new Date().toISOString(), status: "dropped" })
      .eq("couple_id", ids.couple)
      .eq("active", true);
    if (retired.error) {
      await sb
        .from("watch_sessions")
        .update({ active: false, ended_at: new Date().toISOString() })
        .eq("couple_id", ids.couple)
        .eq("active", true);
    }
    const { data } = await sb
      .from("watch_sessions")
      .insert({ couple_id: ids.couple, title_id: titleId, host_id: ids.my, active: true })
      .select("id")
      .single();
    return data?.id ?? null;
  },
  // close ALL active rows for the couple (a duplicate/raced row can never linger
  // and auto-open the overlay on next load).
  // wrap up the current session with a final status (falls back to a plain
  // close until migration 0005 lands). Ends by id so a raced new session is safe.
  setSessionStatus: async (sb: SupabaseClient, sessionId: string, status: WatchPartyStatus) => {
    const res = await sb
      .from("watch_sessions")
      .update({ active: false, ended_at: new Date().toISOString(), status })
      .eq("id", sessionId);
    if (res.error) {
      await run(
        sb.from("watch_sessions").update({ active: false, ended_at: new Date().toISOString() }).eq("id", sessionId)
      );
    }
  },
  // delete a watch-along record; its reactions cascade with it (FK on delete cascade).
  deleteSession: (sb: SupabaseClient, sessionId: string) =>
    run(sb.from("watch_sessions").delete().eq("id", sessionId)),
  endSession: (sb: SupabaseClient, ids: Ids) =>
    run(sb.from("watch_sessions")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("couple_id", ids.couple)
      .eq("active", true)),
  react: (sb: SupabaseClient, ids: Ids, sessionId: string, kind: string, content: string) =>
    run(sb.from("reactions").insert({ session_id: sessionId, couple_id: ids.couple, by_user: ids.my, kind, content })),
  aiMessage: (
    sb: SupabaseClient,
    ids: Ids,
    msg: {
      role: "user" | "ai";
      body: string;
      picks?: { id?: string; title: string; year?: number; reason: string; inCatalog?: boolean }[];
      source?: string;
    }
  ) =>
    run(sb.from("ai_messages").insert({
      couple_id: ids.couple, author_id: ids.my, role: msg.role, body: msg.body,
      picks: msg.picks ?? null, source: msg.source ?? null,
    })),
};

/** if my partner already liked this title, form the match. returns titleId if matched. */
async function maybeFormMatch(sb: SupabaseClient, ids: Ids, titleId: string): Promise<string | null> {
  const { data: hers } = await sb
    .from("votes").select("value").eq("couple_id", ids.couple).eq("title_id", titleId).eq("user_id", ids.her).maybeSingle();
  if (hers && (hers.value === "like" || hers.value === "love")) {
    await sb.from("matches").upsert(
      { couple_id: ids.couple, title_id: titleId },
      { onConflict: "couple_id,title_id", ignoreDuplicates: true }
    );
    return titleId;
  }
  return null;
}

/** after my "like" vote, form a match if my partner already liked it. returns titleId if matched. */
export async function pushVoteAndMaybeMatch(
  sb: SupabaseClient,
  ids: Ids,
  titleId: string,
  value: string
): Promise<string | null> {
  markLocalWrite("votes");
  const ok = await attempt(mirror.vote(sb, ids, { titleId, value }));
  if (!ok) {
    // offline: park the vote for replay; a completed match lands silently later
    enqueue({ coupleId: ids.couple, kind: "vote", args: { titleId, value } });
    return null;
  }
  if (value !== "like" && value !== "love") return null;
  return maybeFormMatch(sb, ids, titleId);
}

// ---- watch-along history (Us tab) ------------------------------------------

/** every saved watch-along, newest first, with its message count. */
export async function listWatchSessions(sb: SupabaseClient, ids: Ids): Promise<WatchPartyRecord[]> {
  const who = (uid: string): Watcher => (uid === ids.my ? "me" : "her");
  const { data } = await sb
    .from("watch_sessions")
    .select("*, reactions(count)")
    .eq("couple_id", ids.couple)
    .order("started_at", { ascending: false })
    .limit(60);
  return (data ?? []).map((r) => ({
    id: r.id,
    titleId: r.title_id,
    hostId: who(r.host_id),
    startedAt: ts(r.started_at),
    endedAt: r.ended_at ? ts(r.ended_at) : undefined,
    status: (r.status as WatchPartyStatus) ?? (r.active ? "in_progress" : "dropped"),
    active: r.active,
    reactionCount: r.reactions?.[0]?.count ?? 0,
  }));
}

/** the full saved conversation of one watch-along, oldest first. */
export async function fetchSessionReactions(
  sb: SupabaseClient,
  ids: Ids,
  sessionId: string
): Promise<Reaction[]> {
  const who = (uid: string): Watcher => (uid === ids.my ? "me" : "her");
  const { data } = await sb
    .from("reactions")
    .select("*")
    .eq("session_id", sessionId)
    .order("at", { ascending: true });
  return (data ?? []).map((r) => ({
    id: r.id, by: who(r.by_user), kind: r.kind, content: r.content, at: ts(r.at),
  }));
}

// ---- realtime + presence -------------------------------------------------

const COUPLE_TABLES = [
  "watchlist", "votes", "matches", "watched", "notes", "notifications",
  "watch_sessions", "reactions", "ai_messages",
];
// Newer tables ride a SEPARATE channel: if migration 0006 is not applied yet,
// their postgres_changes join fails and would otherwise take the WHOLE core
// channel down with it (learned the hard way in regression testing).
const EXTRA_TABLES = ["activity", "watch_plans"];

export function subscribeCoupleChanges(sb: SupabaseClient, ids: Ids, onChange: () => void): () => void {
  // every couple-scoped table (reactions now carries couple_id too) is filtered
  // to this couple, so another couple's activity never triggers a refetch storm.
  const wire = (name: string, tables: string[]) => {
    const ch = sb.channel(`${name}:${ids.couple}`);
    for (const table of tables) {
      ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `couple_id=eq.${ids.couple}` }, () => {
        if (isSelfEcho(table)) return;
        onChange();
      });
    }
    ch.subscribe();
    return ch;
  };
  const core = wire("couple-changes", COUPLE_TABLES);
  const extras = wire("couple-extras", EXTRA_TABLES); // may fail pre-0006; core unaffected
  return () => {
    sb.removeChannel(core);
    sb.removeChannel(extras);
  };
}

const HEARTBEAT_MS = 60_000; // how often we re-stamp our own presence + re-check hers
const IDLE_LIMIT_MS = 60 * 60_000; // stop heartbeating after this long with no user activity
const STALE_MS = 2.5 * 60_000; // a presence stamp older than this reads as "offline"

/**
 * Track my presence on the couple channel; call onPartner(true/false) when the
 * other's online-ness changes. "Online" isn't just "has a presence entry" —
 * Supabase presence only clears on a clean unmount/removeChannel, so a killed
 * tab or backgrounded phone would otherwise look online forever. Instead each
 * tracked entry carries a timestamp, and we treat it as stale (partner
 * offline) once it's more than STALE_MS old, aging it out on a timer even if
 * no join/leave/sync event ever fires for it.
 */
export function trackPresence(
  sb: SupabaseClient,
  ids: Ids,
  onPartner: (online: boolean) => void
): () => void {
  const ch = sb.channel(`presence:${ids.couple}`, { config: { presence: { key: ids.my } } });

  let lastReported: boolean | null = null;
  const evaluate = () => {
    const state = ch.presenceState() as Record<string, Array<{ at?: number }>>;
    let newestAt = 0;
    for (const key of Object.keys(state)) {
      if (key === ids.my) continue;
      for (const entry of state[key]) {
        const at = typeof entry.at === "number" ? entry.at : 0; // missing meta -> treat as stale
        if (at > newestAt) newestAt = at;
      }
    }
    const online = newestAt > 0 && Date.now() - newestAt < STALE_MS;
    if (online !== lastReported) {
      lastReported = online;
      onPartner(online);
    }
  };

  ch.on("presence", { event: "sync" }, evaluate);
  ch.on("presence", { event: "join" }, evaluate);
  ch.on("presence", { event: "leave" }, evaluate);

  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await ch.track({ at: Date.now() });
      evaluate();
    }
  });

  // heartbeat: keep my stamp fresh while the tab is actually visible and I'm
  // not idle for over an hour — this is what makes ME go "offline" to my
  // partner after a long idle stretch even with the tab still open.
  const heartbeat = setInterval(() => {
    if (document.visibilityState === "visible" && Date.now() - getLastActivity() < IDLE_LIMIT_MS) {
      ch.track({ at: Date.now() });
    }
  }, HEARTBEAT_MS);

  // local re-evaluation: ages out a zombie presence entry (killed tab, force-
  // quit app) even when no presence event ever tells us it's gone.
  const freshness = setInterval(evaluate, HEARTBEAT_MS);

  const onVisibility = () => {
    if (document.visibilityState === "hidden") {
      ch.untrack();
    } else {
      ch.track({ at: Date.now() });
      evaluate();
    }
  };
  document.addEventListener("visibilitychange", onVisibility);

  const onPageHide = () => {
    ch.untrack();
  };
  window.addEventListener("pagehide", onPageHide);

  return () => {
    clearInterval(heartbeat);
    clearInterval(freshness);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", onPageHide);
    sb.removeChannel(ch);
  };
}
