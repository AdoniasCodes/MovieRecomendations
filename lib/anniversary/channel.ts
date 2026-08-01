// Shared vocabulary for the anniversary stage, so the director panel and the
// stage overlay can never drift apart. Transport is lib/broadcast.ts (Supabase
// broadcast, no tables, no migration).

export const stageTopic = (coupleId: string) => `stage:${coupleId}`;

export const STAGE_EVENTS = {
  /** presenter -> follower: put this module on screen */
  show: "show",
  /** presenter -> follower: go back to the ambient holding screen */
  blank: "blank",
  /** presenter -> follower: we are done, release the takeover */
  end: "end",
  /** follower -> presenter: I just joined, what should I be showing? */
  hello: "hello",
  /** presenter -> follower: here is the current state (answer to hello) */
  state: "state",
  /** follower -> presenter: this is what I have on screen right now */
  ack: "ack",
} as const;

// The three keys below are suffixed with the day the celebration actually runs.
// The day slipped from the 31st to the 1st, and any of these left over from the
// 31st would quietly break today: a consumed one-shot flag means her morning
// takeover never fires, and a stale cache or plan means yesterday's leftovers
// turn up in the middle of tonight. Changing the suffix orphans all of it.

/** her device remembers the last thing it was shown, so a reload repaints
 * instantly instead of flashing the holding screen while hello round-trips */
export const STAGE_CACHE_KEY = "amore-movies/anniv-stage-0801";
/** fires the morning takeover exactly once, per device */
export const STAGE_OPENED_KEY = "amore-movies/anniv-2026-opened-0801";

export interface StageCache {
  moduleId: string | null;
  blanked: boolean;
  /** ordered itinerary ids sent so far, so a reload keeps the step numbers */
  plan?: string[];
  at: number;
}

/** where the director's running order lives between reloads of his panel */
export const PLAN_KEY = "amore-movies/anniv-plan-0801";

export function readStageCache(): StageCache | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STAGE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StageCache;
    // anything older than a day is stale: the night is over
    if (!parsed || Date.now() - parsed.at > 86_400_000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeStageCache(moduleId: string | null, blanked: boolean, plan?: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      STAGE_CACHE_KEY,
      JSON.stringify({ moduleId, blanked, plan, at: Date.now() } satisfies StageCache)
    );
  } catch {
    /* storage full or blocked: the hello round-trip still covers us */
  }
}

export function clearStageCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STAGE_CACHE_KEY);
  } catch {
    /* ignore */
  }
}
