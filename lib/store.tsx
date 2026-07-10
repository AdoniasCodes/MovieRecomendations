"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { useAuth } from "./auth";
import {
  type Ids,
  fetchSessionReactions,
  listWatchSessions,
  loadCoupleState,
  push,
  pushVoteAndMaybeMatch,
  subscribeCoupleChanges,
  trackPresence,
} from "./live";
import { getWhoami, meUser, partnerUser, useWhoami } from "./identity";
import { dismissSession } from "./session-prefs";
import { ME, PARTNER, getTitle, pinTitles } from "./mock-data";
import { getSupabase } from "./supabase";
import type {
  ActivityEvent,
  AiMessage,
  Context,
  Match,
  Note,
  Notification,
  NotificationType,
  Reaction,
  Title,
  Vote,
  VoteValue,
  Watcher,
  WatchPartyRecord,
  WatchPartyStatus,
  WatchSession,
  WatchStatus,
  WatchedRecord,
  WatchlistItem,
} from "./types";

// ---- state ---------------------------------------------------------------

interface State {
  watchlist: WatchlistItem[];
  votes: Vote[];
  matches: Match[];
  activity: ActivityEvent[];
  ratings: Record<string, number>; // titleId -> my (Panda's) score; mirror of watched[me].rating
  watched: WatchedRecord[];
  notes: Note[];
  notifications: Notification[];
  session: WatchSession | null;
  aiMessages: AiMessage[]; // shared Amore-AI chat thread (couple data)
  herOnline: boolean; // real Supabase presence in live mode; false otherwise
}

const STORAGE_KEY = "amore-movies/v2";

function now() {
  return 1718900000000; // stable base; client increments via counter
}

// No seeded/dummy partner data. Hermi's activity, notes, matches, watched and
// online status are ALL real — they only appear once she actually uses the app
// (live mode via Supabase). Solo/demo starts genuinely empty.
const initialState: State = {
  watchlist: [], votes: [], matches: [], activity: [], ratings: {},
  watched: [], notes: [], notifications: [], session: null, aiMessages: [], herOnline: false,
};

// same clean base for LIVE mode
const emptyState: State = { ...initialState };

type Action =
  | { type: "hydrate"; state: State }
  | { type: "save"; titleId: string; userId: string; at: number; notifs: Notification[] }
  | { type: "unsave"; titleId: string }
  | { type: "status"; titleId: string; status: WatchStatus; at: number; notifs: Notification[] }
  | { type: "vote"; vote: Vote; partnerVote?: Vote; match?: Match; activity: ActivityEvent[]; notifs: Notification[] }
  | { type: "rate"; titleId: string; score: number; at: number }
  | { type: "watched"; rec: WatchedRecord }
  | { type: "unwatch"; titleId: string; watcher: Watcher }
  | { type: "cinema"; titleId: string; cinema: boolean; at: number; notifs: Notification[] }
  | { type: "note"; note: Note; notifs: Notification[] }
  | { type: "deleteNote"; noteId: string }
  | { type: "nudge"; notif: Notification }
  | { type: "readNotifs" }
  | { type: "startParty"; titleId: string; at: number; notifs: Notification[] }
  | { type: "joinParty"; userId: string }
  | { type: "endParty" }
  | { type: "react"; reaction: Reaction }
  | { type: "presence"; herOnline: boolean }
  | { type: "setSessionId"; id: string }
  | { type: "aiMessage"; msg: AiMessage }
  | { type: "activity"; event: ActivityEvent };

function upsertWatched(list: WatchedRecord[], rec: WatchedRecord): WatchedRecord[] {
  const i = list.findIndex((w) => w.titleId === rec.titleId && w.watcher === rec.watcher);
  if (i === -1) return [rec, ...list];
  const next = [...list];
  next[i] = { ...next[i], ...rec };
  return next;
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "hydrate":
      return action.state;
    case "save": {
      if (state.watchlist.some((w) => w.titleId === action.titleId)) return state;
      const item: WatchlistItem = {
        titleId: action.titleId, addedBy: action.userId, status: "interested", createdAt: action.at,
      };
      const ev: ActivityEvent = {
        id: "ev" + action.at, actorId: action.userId, type: "saved", titleId: action.titleId,
        detail: `saved ${getTitle(action.titleId)?.title}`, createdAt: action.at,
      };
      return {
        ...state,
        watchlist: [item, ...state.watchlist],
        activity: [ev, ...state.activity],
        notifications: [...action.notifs, ...state.notifications],
      };
    }
    case "unsave":
      return { ...state, watchlist: state.watchlist.filter((w) => w.titleId !== action.titleId) };
    case "status": {
      // insert-or-update (like "cinema"): setting a status on a title that was
      // never saved must create the row, not silently no-op.
      const inList = state.watchlist.some((w) => w.titleId === action.titleId);
      const watchlist = inList
        ? state.watchlist.map((w) =>
            w.titleId === action.titleId ? { ...w, status: action.status } : w
          )
        : [
            { titleId: action.titleId, addedBy: ME.id, status: action.status, createdAt: action.at },
            ...state.watchlist,
          ];
      const ev: ActivityEvent = {
        id: "ev" + action.at, actorId: ME.id, type: action.status === "finished" ? "finished" : "status",
        titleId: action.titleId, detail: `${action.status} ${getTitle(action.titleId)?.title}`, createdAt: action.at,
      };
      // finishing implies I watched it
      const watched =
        action.status === "finished"
          ? upsertWatched(state.watched, { titleId: action.titleId, watcher: "me", createdAt: action.at })
          : state.watched;
      return {
        ...state,
        watchlist,
        watched,
        activity: [ev, ...state.activity],
        notifications: [...action.notifs, ...state.notifications],
      };
    }
    case "vote": {
      const votes = [
        action.vote,
        ...(action.partnerVote ? [action.partnerVote] : []),
        ...state.votes.filter(
          (v) =>
            !(v.titleId === action.vote.titleId && (v.userId === ME.id || (action.partnerVote && v.userId === PARTNER.id)))
        ),
      ];
      const matches = action.match ? [action.match, ...state.matches] : state.matches;
      let watchlist = state.watchlist;
      if (action.match && !watchlist.some((w) => w.titleId === action.match!.titleId)) {
        watchlist = [
          { titleId: action.match.titleId, addedBy: ME.id, status: "planning", createdAt: action.match.matchedAt },
          ...watchlist,
        ];
      }
      return {
        ...state,
        votes,
        matches,
        watchlist,
        activity: [...action.activity, ...state.activity],
        notifications: [...action.notifs, ...state.notifications],
      };
    }
    case "rate": {
      const ev: ActivityEvent = {
        id: "ev" + action.at, actorId: ME.id, type: "rated", titleId: action.titleId,
        detail: `rated ${getTitle(action.titleId)?.title} ${"★".repeat(Math.round(action.score / 2))}`, createdAt: action.at,
      };
      // rating implies I watched it
      const watched = upsertWatched(state.watched, {
        titleId: action.titleId, watcher: "me", rating: action.score, createdAt: action.at,
      });
      return {
        ...state,
        ratings: { ...state.ratings, [action.titleId]: action.score },
        watched,
        activity: [ev, ...state.activity],
      };
    }
    case "watched":
      return { ...state, watched: upsertWatched(state.watched, action.rec) };
    case "unwatch": {
      const watched = state.watched.filter(
        (w) => !(w.titleId === action.titleId && w.watcher === action.watcher)
      );
      const ratings = { ...state.ratings };
      if (action.watcher === "me") delete ratings[action.titleId];
      return { ...state, watched, ratings };
    }
    case "cinema": {
      const exists = state.watchlist.some((w) => w.titleId === action.titleId);
      let watchlist: WatchlistItem[];
      if (exists) {
        watchlist = state.watchlist.map((w) =>
          w.titleId === action.titleId ? { ...w, cinema: action.cinema } : w
        );
      } else {
        watchlist = [
          { titleId: action.titleId, addedBy: ME.id, status: "interested", createdAt: action.at, cinema: action.cinema },
          ...state.watchlist,
        ];
      }
      return { ...state, watchlist, notifications: [...action.notifs, ...state.notifications] };
    }
    case "note":
      return {
        ...state,
        notes: [action.note, ...state.notes],
        notifications: [...action.notifs, ...state.notifications],
      };
    case "deleteNote":
      return { ...state, notes: state.notes.filter((n) => n.id !== action.noteId) };
    case "nudge":
      return { ...state, notifications: [action.notif, ...state.notifications] };
    case "startParty": {
      const session: WatchSession = {
        titleId: action.titleId,
        hostId: ME.id,
        startedAt: action.at,
        participants: [ME.id],
        reactions: [],
        active: true,
      };
      return { ...state, session, notifications: [...action.notifs, ...state.notifications] };
    }
    case "joinParty": {
      if (!state.session?.active) return state;
      if (state.session.participants.includes(action.userId)) return state;
      return {
        ...state,
        session: { ...state.session, participants: [...state.session.participants, action.userId] },
      };
    }
    case "endParty":
      return state.session ? { ...state, session: { ...state.session, active: false } } : state;
    case "react": {
      if (!state.session?.active) return state;
      return { ...state, session: { ...state.session, reactions: [...state.session.reactions, action.reaction] } };
    }
    case "presence":
      return { ...state, herOnline: action.herOnline };
    case "setSessionId":
      return state.session ? { ...state, session: { ...state.session, id: action.id } } : state;
    case "readNotifs":
      return { ...state, notifications: state.notifications.map((n) => (n.toId === ME.id ? { ...n, read: true } : n)) };
    case "aiMessage": {
      // thread is oldest-first; append, dedupe by id, keep the most recent 100.
      if (state.aiMessages.some((m) => m.id === action.msg.id)) return state;
      const next = [...state.aiMessages, action.msg];
      return { ...state, aiMessages: next.length > 100 ? next.slice(next.length - 100) : next };
    }
    case "activity":
      return { ...state, activity: [action.event, ...state.activity] };
    default:
      return state;
  }
}

// ---- notification helpers (Panda's actions → Amore) ----------------------

function mkNotif(
  at: number,
  type: NotificationType,
  text: string,
  titleId?: string,
  fromMe = true
): Notification {
  return {
    id: "no" + at + type,
    type,
    actorId: fromMe ? ME.id : PARTNER.id,
    toId: fromMe ? PARTNER.id : ME.id,
    titleId,
    text,
    createdAt: at,
    read: fromMe, // my own outgoing notes are "read" for me; her incoming start unread
  };
}

// ---- context -------------------------------------------------------------

interface StoreCtx extends State {
  me: typeof ME;
  partner: typeof PARTNER;
  ready: boolean;
  /** true when signed in AND paired — data is synced via Supabase, not simulated */
  live: boolean;
  pendingMatch: Title | null;
  unreadCount: number;
  clearMatch: () => void;
  isSaved: (id: string) => boolean;
  myVote: (id: string) => VoteValue | undefined;
  isMatched: (id: string) => boolean;
  isCinema: (id: string) => boolean;
  watchersOf: (id: string) => Watcher[];
  watchedRecord: (id: string, w: Watcher) => WatchedRecord | undefined;
  notesFor: (id: string) => Note[];
  save: (id: string) => void;
  unsave: (id: string) => void;
  toggleSave: (id: string) => void;
  setStatus: (id: string, s: WatchStatus) => void;
  rate: (id: string, score: number) => void;
  markWatched: (id: string, w: Watcher) => void;
  unwatch: (id: string, w: Watcher) => void;
  rateAs: (id: string, w: Watcher, score: number) => void;
  toggleCinema: (id: string) => void;
  addNote: (id: string, text: string) => void;
  deleteNote: (noteId: string) => void;
  nudge: (text: string, titleId?: string) => void;
  markNotifsRead: () => void;
  // watch-along
  startWatchParty: (id: string) => void;
  joinWatchParty: (userId: string) => void;
  /** wrap up the active party with its final status (completed | dropped) */
  endWatchParty: (status: WatchPartyStatus) => void;
  /** saved watch-alongs, newest first (live mode; [] in demo) */
  listPartyHistory: () => Promise<WatchPartyRecord[]>;
  /** the saved conversation of one watch-along */
  partyConversation: (sessionId: string) => Promise<Reaction[]>;
  /** delete a watch-along record and its conversation forever */
  deleteParty: (sessionId: string) => Promise<void>;
  /** true when the active session was started by me during this mount (open it
   * full-screen); false for partner-started or rehydrated sessions (invite). */
  iStarted: boolean;
  sendReaction: (content: string, kind?: "emoji" | "text", by?: string) => void;
  /** returns true if a match fired */
  vote: (id: string, value: VoteValue, context: Context) => boolean;
  // shared Amore-AI chat
  askAi: (text: string) => Promise<void>;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const clock = useClock();
  const who = useWhoami(); // re-render + recompute me/partner when identity changes

  // ---- live mode (signed in + paired) ----
  const auth = useAuth();
  const sb = getSupabase();
  const liveIds: Ids | null =
    auth.live && auth.couple && auth.user && auth.partner
      ? { couple: auth.couple.id, my: auth.user.id, her: auth.partner.id }
      : null;
  const live = !!liveIds;
  const liveRef = useRef<Ids | null>(null);
  liveRef.current = liveIds;
  const sessionIdRef = useRef<string | undefined>(undefined);
  sessionIdRef.current = state.session?.id;
  // stable key for the current session in BOTH modes (demo rows have no db id).
  const sessionKeyRef = useRef<string | undefined>(undefined);
  sessionKeyRef.current = state.session
    ? state.session.id ?? String(state.session.startedAt)
    : undefined;
  // true only when *I* started the currently-active session during THIS mount.
  // Resets on reload (fresh ref) so a rehydrated own session reads as an invite,
  // and on endParty so a re-fetched/raced row can't re-open as a takeover.
  const startedThisMountRef = useRef(false);

  // demo hydrate (once)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initialState, ...JSON.parse(raw) } });
    } catch {}
    setReady(true);
  }, []);

  // persist — DEMO only (never clobber demo data while live). Never persist the
  // watch-along session: a demo watch-along must not survive a reload (its
  // active=true would auto-open the overlay). Live sessions live in Supabase.
  useEffect(() => {
    if (!ready || liveRef.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, session: null }));
    } catch {}
  }, [state, ready]);

  // pin any title the user has acted on so it always resolves, even after
  // browsing thousands of others (the browsed cache is a capped LRU).
  useEffect(() => {
    if (!ready) return;
    const ids = new Set<string>();
    state.watchlist.forEach((w) => ids.add(w.titleId));
    state.votes.forEach((v) => ids.add(v.titleId));
    state.matches.forEach((m) => ids.add(m.titleId));
    state.watched.forEach((w) => ids.add(w.titleId));
    state.notes.forEach((n) => n.titleId && ids.add(n.titleId));
    pinTitles(ids);
  }, [state.watchlist, state.votes, state.matches, state.watched, state.notes, ready]);

  // LIVE: load couple slice from Supabase, then keep it fresh via realtime + presence
  useEffect(() => {
    if (!live || !sb || !liveIds) return;
    const ids = liveIds;
    let cancelled = false;
    let herOnline = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const reload = async () => {
      try {
        const slice = await loadCoupleState(sb, ids, herOnline);
        if (!cancelled) dispatch({ type: "hydrate", state: { ...emptyState, ...slice, herOnline } });
      } catch {
        /* transient network failure: realtime/visibility will trigger the next reload */
      }
    };
    reload();
    const unsub = subscribeCoupleChanges(sb, ids, () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(reload, 250);
    });
    const unpres = trackPresence(sb, ids, (online) => {
      herOnline = online;
      dispatch({ type: "presence", herOnline: online });
    });
    // reconcile on foreground: self-echo suppression can skip a partner event
    // that lands inside our own write window, so refresh whenever the app
    // comes back into view.
    const onVisible = () => {
      if (document.visibilityState === "visible") reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      unsub();
      unpres();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live, sb, liveIds?.couple, liveIds?.my, liveIds?.her]);

  // back to DEMO on logout / unpair
  useEffect(() => {
    if (live || !ready) return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      dispatch({ type: "hydrate", state: raw ? { ...initialState, ...JSON.parse(raw) } : initialState });
    } catch {}
  }, [live, ready]);

  const isSaved = useCallback((id: string) => state.watchlist.some((w) => w.titleId === id), [state.watchlist]);
  const isMatched = useCallback((id: string) => state.matches.some((m) => m.titleId === id), [state.matches]);
  const isCinema = useCallback(
    (id: string) => state.watchlist.some((w) => w.titleId === id && w.cinema),
    [state.watchlist]
  );
  const myVote = useCallback(
    (id: string) => state.votes.find((v) => v.titleId === id && v.userId === ME.id)?.value,
    [state.votes]
  );
  const watchersOf = useCallback(
    (id: string) => state.watched.filter((w) => w.titleId === id).map((w) => w.watcher),
    [state.watched]
  );
  const watchedRecord = useCallback(
    (id: string, w: Watcher) => state.watched.find((r) => r.titleId === id && r.watcher === w),
    [state.watched]
  );
  const notesFor = useCallback(
    (id: string) => state.notes.filter((n) => n.titleId === id),
    [state.notes]
  );
  const unreadCount = useMemo(
    () => state.notifications.filter((n) => n.toId === ME.id && !n.read).length,
    [state.notifications]
  );

  const save = useCallback(
    (id: string) => {
      const at = clock();
      const title = getTitle(id);
      const ids = liveRef.current;
      dispatch({ type: "save", titleId: id, userId: ME.id, at, notifs: [] });
      if (ids && sb) {
        push.save(sb, ids, id);
        push.notify(sb, ids, "watchlisted", `${meUser().name} saved ${title?.title} for you both`, id);
      }
    },
    [clock, sb]
  );
  const unsave = useCallback(
    (id: string) => {
      dispatch({ type: "unsave", titleId: id });
      const ids = liveRef.current;
      if (ids && sb) push.unsave(sb, ids, id);
    },
    [sb]
  );
  const toggleSave = useCallback(
    (id: string) => (isSaved(id) ? unsave(id) : save(id)),
    [isSaved, save, unsave]
  );
  const setStatus = useCallback(
    (id: string, s: WatchStatus) => {
      const at = clock();
      const title = getTitle(id);
      const ids = liveRef.current;
      dispatch({ type: "status", titleId: id, status: s, at, notifs: [] });
      if (ids && sb) {
        push.status(sb, ids, id, s);
        if (s === "watching") push.notify(sb, ids, "started", `${meUser().name} just started ${title?.title}`, id);
      }
    },
    [clock, sb]
  );
  const rate = useCallback(
    (id: string, score: number) => {
      dispatch({ type: "rate", titleId: id, score, at: clock() });
      const ids = liveRef.current;
      if (ids && sb) push.watched(sb, ids, id, "me", score);
    },
    [clock, sb]
  );
  const markWatched = useCallback(
    (id: string, w: Watcher) => {
      dispatch({ type: "watched", rec: { titleId: id, watcher: w, createdAt: clock() } });
      const ids = liveRef.current;
      if (ids && sb) push.watched(sb, ids, id, w);
    },
    [clock, sb]
  );
  const unwatch = useCallback(
    (id: string, w: Watcher) => {
      dispatch({ type: "unwatch", titleId: id, watcher: w });
      const ids = liveRef.current;
      if (ids && sb) push.unwatch(sb, ids, id, w);
    },
    [sb]
  );
  const rateAs = useCallback(
    (id: string, w: Watcher, score: number) => {
      if (w === "me") dispatch({ type: "rate", titleId: id, score, at: clock() });
      else dispatch({ type: "watched", rec: { titleId: id, watcher: w, rating: score, createdAt: clock() } });
      const ids = liveRef.current;
      if (ids && sb) push.watched(sb, ids, id, w, score);
    },
    [clock, sb]
  );
  const toggleCinema = useCallback(
    (id: string) => {
      const at = clock();
      const next = !isCinema(id);
      const title = getTitle(id);
      const ids = liveRef.current;
      dispatch({ type: "cinema", titleId: id, cinema: next, at, notifs: [] });
      if (ids && sb) {
        push.cinema(sb, ids, id, next);
        if (next) push.notify(sb, ids, "cinema", `${meUser().name} wants to see ${title?.title} in cinemas 🎬`, id);
      }
    },
    [clock, isCinema, sb]
  );
  const addNote = useCallback(
    (id: string, text: string) => {
      const at = clock();
      const title = getTitle(id);
      const ids = liveRef.current;
      const note: Note = { id: "note" + at, titleId: id, authorId: ME.id, text, createdAt: at };
      dispatch({
        type: "note", note,
        notifs: ids ? [] : [mkNotif(at, "note", `${meUser().name} left a note on ${title?.title}`, id)],
      });
      if (ids && sb) {
        push.note(sb, ids, id, text);
        push.notify(sb, ids, "note", `${meUser().name} left a note on ${title?.title}`, id);
      }
    },
    [clock, sb]
  );
  const deleteNote = useCallback(
    (noteId: string) => {
      dispatch({ type: "deleteNote", noteId });
      const ids = liveRef.current;
      if (ids && sb) push.deleteNote(sb, ids, noteId);
    },
    [sb]
  );
  const startWatchParty = useCallback(
    (id: string) => {
      const at = clock();
      const title = getTitle(id);
      const ids = liveRef.current;
      startedThisMountRef.current = true; // I initiated this one → open it directly
      dispatch({
        type: "startParty", titleId: id, at,
        notifs: ids ? [] : [mkNotif(at, "started", `${meUser().name} started a watch-along of ${title?.title} 🍿`, id)],
      });
      if (ids && sb) {
        push.notify(sb, ids, "started", `${meUser().name} started a watch-along of ${title?.title} 🍿`, id);
        push.startSession(sb, ids, id).then((sid) => {
          if (!sid) return;
          // if the session was already cancelled before its id landed, close the
          // stray row now so it can't linger active and resurrect the overlay.
          if (sessionKeyRef.current) dispatch({ type: "setSessionId", id: sid });
          else void push.setSessionStatus(sb, sid, "dropped");
        }).catch(() => {});
      }
    },
    [clock, sb]
  );
  const joinWatchParty = useCallback((userId: string) => dispatch({ type: "joinParty", userId }), []);
  const endWatchParty = useCallback((status: WatchPartyStatus) => {
    const ids = liveRef.current;
    // record dismissal of the current session id so the realtime race window (a
    // refetch landing before the DB update commits) cannot re-open it.
    const key = sessionKeyRef.current;
    const sid = sessionIdRef.current;
    if (key) dismissSession(key);
    startedThisMountRef.current = false;
    dispatch({ type: "endParty" });
    if (ids && sb) {
      // prefer the id-scoped status write; fall back to close-all when the
      // session id hasn't landed yet (raced start).
      if (sid) void push.setSessionStatus(sb, sid, status);
      else push.endSession(sb, ids);
    }
  }, [sb]);
  const listPartyHistory = useCallback(async (): Promise<WatchPartyRecord[]> => {
    const ids = liveRef.current;
    if (!ids || !sb) return [];
    try {
      return await listWatchSessions(sb, ids);
    } catch {
      return [];
    }
  }, [sb]);
  const partyConversation = useCallback(async (sessionId: string): Promise<Reaction[]> => {
    const ids = liveRef.current;
    if (!ids || !sb) return [];
    try {
      return await fetchSessionReactions(sb, ids, sessionId);
    } catch {
      return [];
    }
  }, [sb]);
  const deleteParty = useCallback(async (sessionId: string) => {
    const ids = liveRef.current;
    if (!ids || !sb) return;
    // deleting the active party also closes it locally on this device
    if (sessionIdRef.current === sessionId) {
      const key = sessionKeyRef.current;
      if (key) dismissSession(key);
      startedThisMountRef.current = false;
      dispatch({ type: "endParty" });
    }
    await push.deleteSession(sb, sessionId);
  }, [sb]);
  const sendReaction = useCallback(
    (content: string, kind: "emoji" | "text" = "emoji", by?: string) => {
      const at = clock();
      const author = by ?? ME.id;
      dispatch({ type: "react", reaction: { id: "rx" + at + author, by: author, kind, content, at } });
      const ids = liveRef.current;
      const sid = sessionIdRef.current;
      if (ids && sb && sid && author === ME.id) push.react(sb, ids, sid, kind, content);
    },
    [clock, sb]
  );
  const nudge = useCallback(
    (text: string, titleId?: string) => {
      const at = clock();
      const ids = liveRef.current;
      // optimistic local echo so the sender sees it instantly; in live mode
      // the realtime refetch reconciles with the DB row.
      dispatch({ type: "nudge", notif: mkNotif(at, "nudge", text, titleId) });
      if (ids && sb) push.notify(sb, ids, "nudge", text, titleId);
    },
    [clock, sb]
  );
  const markNotifsRead = useCallback(() => {
    dispatch({ type: "readNotifs" });
    const ids = liveRef.current;
    if (ids && sb) push.readNotifs(sb, ids);
  }, [sb]);

  const vote = useCallback(
    (id: string, value: VoteValue, context: Context): boolean => {
      const at = clock();
      const myVoteObj: Vote = { titleId: id, userId: ME.id, value, createdAt: at };
      const positive = value === "like" || value === "love";
      const title = getTitle(id);
      const liveIdsNow = liveRef.current;

      // ---- LIVE: write my real vote; form a match only if Hermi already liked it ----
      if (liveIdsNow && sb) {
        dispatch({ type: "vote", vote: myVoteObj, activity: [], notifs: [] });
        if (positive && title) push.notify(sb, liveIdsNow, "favorited", `${meUser().name} liked ${title.title}`, id);
        pushVoteAndMaybeMatch(sb, liveIdsNow, id, value).then((matched) => {
          if (matched) {
            setPendingMatchId(matched);
            push.notify(sb, liveIdsNow, "matched", `It's a match on ${title?.title}! 💞`, id);
          }
        }).catch(() => {});
        return false;
      }

      // ---- SOLO/DEMO: record only my own vote. No simulated partner, no fake
      // matches. Real matches form only in live mode when Hermi actually likes
      // the same title (see the LIVE branch above). ----
      const activity: ActivityEvent[] = [
        {
          id: "evv" + at, actorId: ME.id, type: "voted", titleId: id,
          detail: `${value === "pass" ? "passed on" : value === "seen" ? "has seen" : "liked"} ${title?.title}`,
          createdAt: at,
        },
      ];
      dispatch({ type: "vote", vote: myVoteObj, activity, notifs: [] });
      return false;
    },
    [clock, sb]
  );

  const askAi = useCallback(
    async (text: string): Promise<void> => {
      const t = text.trim();
      if (!t) return;
      const ids = liveRef.current;

      // 1) my question → optimistic local dispatch (+ mirror to Supabase if live)
      const at = clock();
      const userMsg: AiMessage = { id: "aiu" + at, authorId: ME.id, role: "user", text: t, createdAt: at };
      dispatch({ type: "aiMessage", msg: userMsg });
      if (ids && sb) push.aiMessage(sb, ids, { role: "user", body: t });

      // 2) ask the assistant (same route/shape AssistantButton has always used)
      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: t, audience: "together", asker: getWhoami() }),
          signal: AbortSignal.timeout(30_000),
        });
        const data = (await res.json()) as {
          intro: string;
          picks?: AiMessage["picks"];
          source?: "gemini" | "local";
        };
        const aiAt = clock();
        const aiMsg: AiMessage = {
          id: "aia" + aiAt, authorId: ME.id, role: "ai",
          text: data.intro, picks: data.picks, source: data.source, createdAt: aiAt,
        };
        dispatch({ type: "aiMessage", msg: aiMsg });
        if (ids && sb) {
          push.aiMessage(sb, ids, { role: "ai", body: data.intro, picks: data.picks, source: data.source });
          // 3) let my partner know I poked Amore AI (one notification, no titleId)
          const snip = t.length > 40 ? `${t.slice(0, 40)}…` : t;
          push.notify(sb, ids, "ai", `${meUser().name} asked Amore AI about "${snip}"`);
        }
      } catch {
        // 4) never let the sheet break — surface a friendly local error bubble
        const errAt = clock();
        dispatch({
          type: "aiMessage",
          msg: {
            id: "aie" + errAt, authorId: ME.id, role: "ai",
            text: "Hmm, I couldn't think straight just now. Try again?",
            source: "local", createdAt: errAt,
          },
        });
      }
    },
    [clock, sb]
  );

  const value = useMemo<StoreCtx>(
    () => ({
      ...state,
      me: meUser(),
      partner: partnerUser(),
      ready,
      live,
      pendingMatch: pendingMatchId ? getTitle(pendingMatchId) ?? null : null,
      unreadCount,
      clearMatch: () => setPendingMatchId(null),
      isSaved,
      myVote,
      isMatched,
      isCinema,
      watchersOf,
      watchedRecord,
      notesFor,
      save,
      unsave,
      toggleSave,
      setStatus,
      rate,
      markWatched,
      unwatch,
      rateAs,
      toggleCinema,
      addNote,
      deleteNote,
      nudge,
      markNotifsRead,
      startWatchParty,
      joinWatchParty,
      endWatchParty,
      listPartyHistory,
      partyConversation,
      deleteParty,
      iStarted: startedThisMountRef.current,
      sendReaction,
      vote,
      askAi,
    }),
    [
      who, state, ready, live, pendingMatchId, unreadCount, isSaved, myVote, isMatched, isCinema, watchersOf,
      watchedRecord, notesFor, save, unsave, toggleSave, setStatus, rate, markWatched, unwatch,
      rateAs, toggleCinema, addNote, deleteNote, nudge, markNotifsRead, startWatchParty,
      joinWatchParty, endWatchParty, listPartyHistory, partyConversation, deleteParty,
      sendReaction, vote, askAi,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useStore must be used within StoreProvider");
  return ctx;
}

// monotonic clock that avoids Date.now SSR mismatch by starting from a base + counter
function useClock() {
  const ref = useState(() => ({ n: now() }))[0];
  return useCallback(() => {
    ref.n += 1000;
    return ref.n;
  }, [ref]);
}
