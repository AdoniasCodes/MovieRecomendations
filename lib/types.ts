export type MediaType = "movie" | "tv";

/** user-facing catalog filter: "both" blends movies + tv, or narrow to one. */
export type MediaFilter = "both" | "movie" | "tv";

export type Vibe =
  | "mind-blowing"
  | "dark"
  | "funny"
  | "romantic"
  | "cozy"
  | "mysterious"
  | "thrilling"
  | "emotional"
  | "thought-provoking"
  | "action-packed"
  | "comfort";

export type Feeling =
  | "bored"
  | "tired"
  | "excited"
  | "curious"
  | "sad"
  | "happy"
  | "stressed"
  | "distraction"
  | "intense"
  | "relaxing";

export type Era = "70s" | "80s" | "90s" | "2000s" | "2010s" | "modern" | "any";

export type Commitment =
  | "movie"
  | "mini-series"
  | "full-series"
  | "single-evening"
  | "weekend-binge"
  | "long-term";

export type Energy = "brain-off" | "moderate" | "full-attention";

export type Context = "alone" | "together";

export interface Title {
  id: string; // "movie:603"
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  year: number;
  era: Era;
  runtime: number; // minutes (avg ep for tv)
  seasons?: number;
  genres: string[];
  vibes: Vibe[];
  moods: Feeling[];
  energy: Energy;
  commitment: Commitment;
  voteAverage: number; // 0-10
  popularity: number; // 0-100
  hiddenGem: boolean;
  classic: boolean;
  overview: string;
  cast: string[];
  // --- taste signals (Phase 2) -------------------------------------------
  /** on-screen blood/gore/brutality, 0 (none) .. 5 (extreme). Drives Amore's hard filter. */
  violence: number;
  /** true for cerebral crime/mystery where the appeal is the mind-game, not the carnage */
  cerebral?: boolean;
  /** "US" | "South Korea" | "Japan" | "Turkey" | "China" | ... */
  country: string;
  /** primary language label, e.g. "English", "Korean", "Turkish" */
  language: string;
  /** true when it's non-US/UK "international" cinema (Amore loves these) */
  international?: boolean;
  // procedural poster
  colorA: string;
  colorB: string;
  posterPath?: string; // optional real TMDB path when wired
}

/** who an action/record belongs to, for the couple */
export type Watcher = "me" | "her";

export interface QuizAnswers {
  feeling?: Feeling;
  context: Context;
  vibe?: Vibe;
  era: Era;
  commitment?: Commitment;
  energy?: Energy;
}

export type VoteValue = "like" | "love" | "pass" | "seen";

export type WatchStatus =
  | "interested"
  | "planning"
  | "watching"
  | "paused"
  | "finished"
  | "dropped";

export interface WatchlistItem {
  titleId: string;
  addedBy: string; // user id
  status: WatchStatus;
  createdAt: number;
  /** specifically wants to see this one in a theater */
  cinema?: boolean;
}

/** a title one of us has watched. Amore rewatches a lot — so this is per-person. */
export interface WatchedRecord {
  titleId: string;
  watcher: Watcher; // "me" | "her"
  rating?: number; // 0-10, optional
  createdAt: number;
}

/** a free-text reminder on a title ("check it out", "rewatch", "this is amazing") */
export interface Note {
  id: string;
  titleId: string;
  authorId: string; // user id
  text: string;
  createdAt: number;
}

export type NotificationType =
  | "started"
  | "favorited"
  | "watchlisted"
  | "cinema"
  | "matched"
  | "rated"
  | "nudge"
  | "note"
  | "ai"
  | "plan"
  | "watched"
  | "party";

export interface Notification {
  id: string;
  type: NotificationType;
  actorId: string; // who triggered it
  toId: string; // who it's for
  titleId?: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface Vote {
  titleId: string;
  userId: string;
  value: VoteValue;
  createdAt: number;
}

/** a shared Amore-AI chat message. The whole thread is couple data: both
 * partners see the same conversation, live. (picks duplicates lib/ai.ts's Pick
 * shape on purpose — types must not import the server-only ai module.) */
export interface AiMessage {
  id: string;
  authorId: string; // "me" | "her" semantic
  role: "user" | "ai";
  text: string;
  picks?: { id?: string; title: string; year?: number; reason: string; inCatalog?: boolean }[];
  source?: "gemini" | "local";
  createdAt: number;
}

export interface Match {
  titleId: string;
  matchedAt: number;
}

export interface ActivityEvent {
  id: string;
  actorId: string;
  type:
    | "saved"
    | "voted"
    | "matched"
    | "rated"
    | "finished"
    | "status"
    | "note"
    | "party"
    | "plan";
  titleId?: string;
  detail?: string;
  createdAt: number;
}

// ---- Watch night plans -----------------------------------------------------

export type PlanStatus = "planned" | "done" | "cancelled";

/** a planned movie night, synced for the couple (watch_plans table). */
export interface Plan {
  id: string;
  titleId: string;
  plannedBy: Watcher;
  scheduledAt: number;
  status: PlanStatus;
  remindedAt?: number;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

// ---- Watch-Along (Phase 3) -----------------------------------------------

/** a live reaction/message dropped during a watch-along session */
export interface Reaction {
  id: string;
  by: string; // user id
  kind: "emoji" | "text";
  content: string;
  at: number;
}

export type WatchPartyStatus = "in_progress" | "completed" | "dropped";

/** a synced "watching together" session. Realtime-ready: swap the simulated
 * partner timers for a Supabase Realtime channel and this shape doesn't change. */
export interface WatchSession {
  id?: string; // Supabase row id when live
  titleId: string;
  hostId: string;
  startedAt: number;
  participants: string[]; // user ids currently "in" the session
  reactions: Reaction[];
  active: boolean;
  status?: WatchPartyStatus;
}

/** a saved watch-along record for the Us tab history (live mode). */
export interface WatchPartyRecord {
  id: string;
  titleId: string;
  hostId: string; // semantic "me" | "her"
  startedAt: number;
  endedAt?: number;
  status: WatchPartyStatus;
  active: boolean;
  reactionCount: number;
}

export interface Scored {
  title: Title;
  score: number;
  why: string;
}
