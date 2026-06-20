"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useState,
} from "react";
import { ME, PARTNER, getTitle } from "./mock-data";
import { scoreTitle, tooViolentForHer } from "./recommend";
import type {
  ActivityEvent,
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
  WatchSession,
  WatchStatus,
  WatchedRecord,
  WatchlistItem,
} from "./types";

// ---- partner simulation ---------------------------------------------------
// Amore's reaction reuses the SAME taste engine the recs use (audience "her"),
// so the simulated partner and the recommendations agree on her taste:
// wholesome / cerebral / international = yes, gore = hard no.
function partnerAffinity(t: Title): number {
  if (tooViolentForHer(t)) return 0.03; // her no-gore rule
  const s = scoreTitle(t, { context: "together", era: "any" }, { audience: "her" }).score;
  return Math.min(Math.max(s * 1.15 + 0.12, 0), 0.97);
}

let rng = 99173;
function rand() {
  rng = (rng * 16807) % 2147483647;
  return rng / 2147483647;
}

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
  herOnline: boolean; // simulated presence (Phase 3); real channel later
}

const STORAGE_KEY = "amore-movies/v2";

function now() {
  return 1718900000000; // stable base; client increments via counter
}

const initialActivity: ActivityEvent[] = [
  { id: "a1", actorId: PARTNER.id, type: "saved", titleId: "tv:95396", detail: "saved Severance", createdAt: now() - 1000 * 60 * 60 * 5 },
  { id: "a2", actorId: PARTNER.id, type: "rated", titleId: "movie:11324", detail: "rated Shutter Island ★★★★½", createdAt: now() - 1000 * 60 * 60 * 26 },
];

// Amore has rewatched a few cozy favourites — seeds the Rewatch list.
const initialWatched: WatchedRecord[] = [
  { titleId: "tv:64349", watcher: "her", rating: 10, createdAt: now() - 1000 * 60 * 60 * 80 },
  { titleId: "movie:129", watcher: "her", rating: 9, createdAt: now() - 1000 * 60 * 60 * 50 },
  { titleId: "movie:619264", watcher: "her", rating: 9, createdAt: now() - 1000 * 60 * 60 * 30 },
];

const initialNotes: Note[] = [
  { id: "n0", titleId: "movie:705996", authorId: PARTNER.id, text: "We HAVE to watch this one — it's so my type 💞", createdAt: now() - 1000 * 60 * 60 * 12 },
];

const initialNotifications: Notification[] = [
  { id: "ni1", type: "nudge", actorId: PARTNER.id, toId: ME.id, text: "Movie night tonight? 🍿", createdAt: now() - 1000 * 60 * 60 * 3, read: false },
  { id: "ni2", type: "note", actorId: PARTNER.id, toId: ME.id, titleId: "movie:705996", text: "Left you a note on Decision to Leave 💞", createdAt: now() - 1000 * 60 * 60 * 12, read: false },
];

const initialState: State = {
  watchlist: [],
  votes: [],
  matches: [],
  activity: initialActivity,
  ratings: {},
  watched: initialWatched,
  notes: initialNotes,
  notifications: initialNotifications,
  session: null,
  herOnline: true,
};

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
      const watchlist = state.watchlist.map((w) =>
        w.titleId === action.titleId ? { ...w, status: action.status } : w
      );
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
    case "readNotifs":
      return { ...state, notifications: state.notifications.map((n) => (n.toId === ME.id ? { ...n, read: true } : n)) };
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

// occasionally Amore replies, so the bell gets real incoming traffic
function maybeReply(at: number, kind: NotificationType, title?: Title): Notification[] {
  if (rand() > 0.55) return [];
  const name = title?.title ?? "that";
  const lines: Partial<Record<NotificationType, string>> = {
    started: `Ooh start ${name}, I'm watching too! 👀`,
    favorited: `Added ${name} to my list too 💞`,
    cinema: `Yes!! ${name} on the big screen — date 🍿`,
    watchlisted: `Saved ${name} for us 💛`,
  };
  const text = lines[kind];
  if (!text) return [];
  return [mkNotif(at + 1, kind, text, title?.id, false)];
}

// ---- context -------------------------------------------------------------

interface StoreCtx extends State {
  me: typeof ME;
  partner: typeof PARTNER;
  ready: boolean;
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
  endWatchParty: () => void;
  sendReaction: (content: string, kind?: "emoji" | "text", by?: string) => void;
  setHerPresence: (online: boolean) => void;
  /** returns true if a match fired */
  vote: (id: string, value: VoteValue, context: Context) => boolean;
}

const Ctx = createContext<StoreCtx | null>(null);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [ready, setReady] = useState(false);
  const [pendingMatchId, setPendingMatchId] = useState<string | null>(null);
  const clock = useClock();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "hydrate", state: { ...initialState, ...JSON.parse(raw) } });
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {}
  }, [state, ready]);

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
      dispatch({
        type: "save", titleId: id, userId: ME.id, at,
        notifs: [
          mkNotif(at, "watchlisted", `Panda saved ${title?.title} for you both`, id),
          ...maybeReply(at, "watchlisted", title ?? undefined),
        ],
      });
    },
    [clock]
  );
  const unsave = useCallback((id: string) => dispatch({ type: "unsave", titleId: id }), []);
  const toggleSave = useCallback(
    (id: string) => (isSaved(id) ? unsave(id) : save(id)),
    [isSaved, save, unsave]
  );
  const setStatus = useCallback(
    (id: string, s: WatchStatus) => {
      const at = clock();
      const title = getTitle(id);
      const notifs: Notification[] =
        s === "watching"
          ? [mkNotif(at, "started", `Panda just started ${title?.title}`, id), ...maybeReply(at, "started", title ?? undefined)]
          : [];
      dispatch({ type: "status", titleId: id, status: s, at, notifs });
    },
    [clock]
  );
  const rate = useCallback(
    (id: string, score: number) => dispatch({ type: "rate", titleId: id, score, at: clock() }),
    [clock]
  );
  const markWatched = useCallback(
    (id: string, w: Watcher) => dispatch({ type: "watched", rec: { titleId: id, watcher: w, createdAt: clock() } }),
    [clock]
  );
  const unwatch = useCallback((id: string, w: Watcher) => dispatch({ type: "unwatch", titleId: id, watcher: w }), []);
  const rateAs = useCallback(
    (id: string, w: Watcher, score: number) => {
      if (w === "me") dispatch({ type: "rate", titleId: id, score, at: clock() });
      else dispatch({ type: "watched", rec: { titleId: id, watcher: w, rating: score, createdAt: clock() } });
    },
    [clock]
  );
  const toggleCinema = useCallback(
    (id: string) => {
      const at = clock();
      const next = !isCinema(id);
      const title = getTitle(id);
      const notifs = next
        ? [mkNotif(at, "cinema", `Panda wants to see ${title?.title} in cinemas 🎬`, id), ...maybeReply(at, "cinema", title ?? undefined)]
        : [];
      dispatch({ type: "cinema", titleId: id, cinema: next, at, notifs });
    },
    [clock, isCinema]
  );
  const addNote = useCallback(
    (id: string, text: string) => {
      const at = clock();
      const title = getTitle(id);
      const note: Note = { id: "note" + at, titleId: id, authorId: ME.id, text, createdAt: at };
      dispatch({
        type: "note", note,
        notifs: [mkNotif(at, "note", `Panda left a note on ${title?.title}`, id)],
      });
    },
    [clock]
  );
  const deleteNote = useCallback((noteId: string) => dispatch({ type: "deleteNote", noteId }), []);
  const startWatchParty = useCallback(
    (id: string) => {
      const at = clock();
      const title = getTitle(id);
      dispatch({
        type: "startParty", titleId: id, at,
        notifs: [mkNotif(at, "started", `Panda started a watch-along of ${title?.title} 🍿`, id)],
      });
    },
    [clock]
  );
  const joinWatchParty = useCallback((userId: string) => dispatch({ type: "joinParty", userId }), []);
  const endWatchParty = useCallback(() => dispatch({ type: "endParty" }), []);
  const sendReaction = useCallback(
    (content: string, kind: "emoji" | "text" = "emoji", by?: string) => {
      const at = clock();
      dispatch({ type: "react", reaction: { id: "rx" + at + (by ?? ME.id), by: by ?? ME.id, kind, content, at } });
    },
    [clock]
  );
  const setHerPresence = useCallback((online: boolean) => dispatch({ type: "presence", herOnline: online }), []);
  const nudge = useCallback(
    (text: string, titleId?: string) => {
      const at = clock();
      dispatch({ type: "nudge", notif: mkNotif(at, "nudge", text, titleId) });
    },
    [clock]
  );
  const markNotifsRead = useCallback(() => dispatch({ type: "readNotifs" }), []);

  const vote = useCallback(
    (id: string, value: VoteValue, context: Context): boolean => {
      const at = clock();
      const myVoteObj: Vote = { titleId: id, userId: ME.id, value, createdAt: at };
      const activity: ActivityEvent[] = [];
      const notifs: Notification[] = [];
      let partnerVote: Vote | undefined;
      let match: Match | undefined;

      const positive = value === "like" || value === "love";
      const title = getTitle(id);

      if (positive && title) {
        notifs.push(mkNotif(at, "favorited", `Panda liked ${title.title}`, id));
        notifs.push(...maybeReply(at, "favorited", title));
      }

      if (context === "together" && positive && title) {
        const p = partnerAffinity(title);
        const partnerLikes = rand() < p;
        partnerVote = {
          titleId: id, userId: PARTNER.id, value: partnerLikes ? "like" : "pass", createdAt: at + 1,
        };
        if (partnerLikes) {
          match = { titleId: id, matchedAt: at + 2 };
          activity.push({
            id: "evm" + at, actorId: PARTNER.id, type: "matched", titleId: id,
            detail: `matched on ${title.title}`, createdAt: at + 2,
          });
          notifs.push(mkNotif(at + 2, "matched", `It's a match on ${title.title}! 💞`, id, false));
          setPendingMatchId(id);
        }
      }
      activity.push({
        id: "evv" + at, actorId: ME.id, type: "voted", titleId: id,
        detail: `${value === "pass" ? "passed on" : value === "seen" ? "has seen" : "liked"} ${title?.title}`,
        createdAt: at,
      });

      dispatch({ type: "vote", vote: myVoteObj, partnerVote, match, activity, notifs });
      return !!match;
    },
    [clock]
  );

  const value = useMemo<StoreCtx>(
    () => ({
      ...state,
      me: ME,
      partner: PARTNER,
      ready,
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
      sendReaction,
      setHerPresence,
      vote,
    }),
    [
      state, ready, pendingMatchId, unreadCount, isSaved, myVote, isMatched, isCinema, watchersOf,
      watchedRecord, notesFor, save, unsave, toggleSave, setStatus, rate, markWatched, unwatch,
      rateAs, toggleCinema, addNote, deleteNote, nudge, markNotifsRead, startWatchParty,
      joinWatchParty, endWatchParty, sendReaction, setHerPresence, vote,
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
