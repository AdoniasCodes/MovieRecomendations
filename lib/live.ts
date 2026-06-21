// Live data layer: translate the local store's "me"/"her" semantic ids to/from
// real Supabase rows (auth uuids), so the existing reducer/UI never change.
// Strategy: optimistic local dispatch + mirror write here; realtime change →
// refetch the couple slice and re-hydrate (idempotent, simple, fine for 2 people).

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Match, Note, Notification, Reaction, Vote, Watcher, WatchSession,
  WatchedRecord, WatchlistItem,
} from "./types";

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

  const [wl, vt, mt, wd, nt, nf, ws] = await Promise.all([
    sb.from("watchlist").select("*").eq("couple_id", c),
    sb.from("votes").select("*").eq("couple_id", c),
    sb.from("matches").select("*").eq("couple_id", c),
    sb.from("watched").select("*").eq("couple_id", c),
    sb.from("notes").select("*").eq("couple_id", c),
    sb.from("notifications").select("*").eq("couple_id", c).order("created_at", { ascending: false }).limit(80),
    sb.from("watch_sessions").select("*").eq("couple_id", c).eq("active", true).order("started_at", { ascending: false }).limit(1),
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
    };
  }

  return { watchlist, votes, matches, watched, ratings, notes, notifications, session };
}

// ---- write mirrors (semantic -> uuid) ------------------------------------

const uid = (ids: Ids, w: Watcher) => (w === "me" ? ids.my : ids.her);

export const push = {
  save: (sb: SupabaseClient, ids: Ids, titleId: string) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: titleId, added_by: ids.my, status: "interested" },
      { onConflict: "couple_id,title_id", ignoreDuplicates: true }
    ),
  unsave: (sb: SupabaseClient, ids: Ids, titleId: string) =>
    sb.from("watchlist").delete().eq("couple_id", ids.couple).eq("title_id", titleId),
  status: (sb: SupabaseClient, ids: Ids, titleId: string, status: string) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: titleId, added_by: ids.my, status },
      { onConflict: "couple_id,title_id" }
    ),
  cinema: (sb: SupabaseClient, ids: Ids, titleId: string, cinema: boolean) =>
    sb.from("watchlist").upsert(
      { couple_id: ids.couple, title_id: titleId, added_by: ids.my, status: "interested", cinema },
      { onConflict: "couple_id,title_id" }
    ).then(() => sb.from("watchlist").update({ cinema }).eq("couple_id", ids.couple).eq("title_id", titleId)),
  watched: (sb: SupabaseClient, ids: Ids, titleId: string, w: Watcher, rating?: number) =>
    sb.from("watched").upsert(
      { couple_id: ids.couple, title_id: titleId, watcher: uid(ids, w), ...(rating != null ? { rating } : {}) },
      { onConflict: "couple_id,title_id,watcher" }
    ),
  unwatch: (sb: SupabaseClient, ids: Ids, titleId: string, w: Watcher) =>
    sb.from("watched").delete().eq("couple_id", ids.couple).eq("title_id", titleId).eq("watcher", uid(ids, w)),
  note: (sb: SupabaseClient, ids: Ids, titleId: string, body: string) =>
    sb.from("notes").insert({ couple_id: ids.couple, title_id: titleId, author_id: ids.my, body }),
  deleteNote: (sb: SupabaseClient, ids: Ids, noteId: string) =>
    sb.from("notes").delete().eq("id", noteId),
  notify: (sb: SupabaseClient, ids: Ids, type: string, body: string, titleId?: string) =>
    sb.from("notifications").insert({
      couple_id: ids.couple, type, actor_id: ids.my, to_id: ids.her, title_id: titleId ?? null, body, read: false,
    }),
  readNotifs: (sb: SupabaseClient, ids: Ids) =>
    sb.from("notifications").update({ read: true }).eq("couple_id", ids.couple).eq("to_id", ids.my),
  startSession: async (sb: SupabaseClient, ids: Ids, titleId: string): Promise<string | null> => {
    const { data } = await sb
      .from("watch_sessions")
      .insert({ couple_id: ids.couple, title_id: titleId, host_id: ids.my, active: true })
      .select("id")
      .single();
    return data?.id ?? null;
  },
  endSession: (sb: SupabaseClient, ids: Ids, sessionId?: string) =>
    sessionId
      ? sb.from("watch_sessions").update({ active: false }).eq("id", sessionId)
      : sb.from("watch_sessions").update({ active: false }).eq("couple_id", ids.couple).eq("active", true),
  react: (sb: SupabaseClient, ids: Ids, sessionId: string, kind: string, content: string) =>
    sb.from("reactions").insert({ session_id: sessionId, by_user: ids.my, kind, content }),
};

/** after my "like" vote, form a match if my partner already liked it. returns titleId if matched. */
export async function pushVoteAndMaybeMatch(
  sb: SupabaseClient,
  ids: Ids,
  titleId: string,
  value: string
): Promise<string | null> {
  await sb.from("votes").upsert(
    { couple_id: ids.couple, title_id: titleId, user_id: ids.my, value },
    { onConflict: "couple_id,title_id,user_id" }
  );
  if (value !== "like" && value !== "love") return null;
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

// ---- realtime + presence -------------------------------------------------

const COUPLE_TABLES = ["watchlist", "votes", "matches", "watched", "notes", "notifications", "watch_sessions"];

export function subscribeCoupleChanges(sb: SupabaseClient, ids: Ids, onChange: () => void): () => void {
  const ch = sb.channel(`couple-changes:${ids.couple}`);
  for (const table of COUPLE_TABLES) {
    ch.on("postgres_changes", { event: "*", schema: "public", table, filter: `couple_id=eq.${ids.couple}` }, onChange);
  }
  // reactions has no couple_id column — listen broadly, RLS still guards reads on refetch
  ch.on("postgres_changes", { event: "*", schema: "public", table: "reactions" }, onChange);
  ch.subscribe();
  return () => {
    sb.removeChannel(ch);
  };
}

/** track my presence on the couple channel; call onPartner(true/false) when the other's presence changes. */
export function trackPresence(
  sb: SupabaseClient,
  ids: Ids,
  onPartner: (online: boolean) => void
): () => void {
  const ch = sb.channel(`presence:${ids.couple}`, { config: { presence: { key: ids.my } } });
  ch.on("presence", { event: "sync" }, () => {
    const state = ch.presenceState();
    onPartner(Object.keys(state).some((k) => k !== ids.my));
  });
  ch.subscribe(async (status) => {
    if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
  });
  return () => {
    sb.removeChannel(ch);
  };
}
