import {
  EXCLUDED_COUNTRIES,
  TASTE_AMORE,
  TASTE_PANDA,
  TITLES,
  getTitle,
} from "./mock-data";
import type { QuizAnswers, Scored, Title, Vibe, Vote, Watcher, WatchedRecord } from "./types";

// ---- audience -------------------------------------------------------------
// Who are we recommending for? "me" = Panda (anything goes), "her" = Amore
// (wholesome, no gore), "together" = the couple (Amore's no-gore rule wins).
export type Audience = "me" | "her" | "together";

const CRIMEY = ["Crime", "Mystery", "Detective", "Thriller"];

function buildWeights(taste: { genres: string[]; lovedTitleIds: string[] }) {
  const w = new Map<string, number>();
  for (const g of taste.genres) w.set(g, (w.get(g) ?? 0) + 1);
  for (const id of taste.lovedTitleIds) {
    const tt = getTitle(id);
    if (tt) for (const g of tt.genres) w.set(g, (w.get(g) ?? 0) + 0.5);
  }
  return w;
}
const W_ME = buildWeights(TASTE_PANDA);
const W_HER = buildWeights(TASTE_AMORE);

const SEEDS_ME = TASTE_PANDA.lovedTitleIds.map(getTitle).filter(Boolean) as Title[];
const SEEDS_HER = TASTE_AMORE.lovedTitleIds.map(getTitle).filter(Boolean) as Title[];

function genreAffinity(t: Title, aud: Audience, learned?: LearnedTastes): number {
  // learned per-genre weight for each person (0 when we've learned nothing yet)
  const lme = (g: string) => learned?.me.genreWeights[g] ?? 0;
  const lher = (g: string) => learned?.her.genreWeights[g] ?? 0;
  const both = (g: string) => (lme(g) + lher(g)) / 2; // "together" averages both
  const pick = (w: Map<string, number>, lw: (g: string) => number) => {
    let s = 0;
    for (const g of t.genres) s += (w.get(g) ?? 0) + lw(g);
    return Math.min(s / 4, 1);
  };
  if (aud === "me") return pick(W_ME, lme);
  if (aud === "her") return pick(W_HER, lher);
  return (pick(W_ME, both) + pick(W_HER, both)) / 2;
}

function seedAnchor(t: Title, aud: Audience, learned?: LearnedTastes): Title | undefined {
  // learned recent loves lead the pool so "Because you loved X" can cite a real,
  // recent favorite before falling back to the static seed anchors.
  const resolve = (ids: string[]) => ids.map(getTitle).filter(Boolean) as Title[];
  const learnedMe = learned ? resolve(learned.me.lovedIds) : [];
  const learnedHer = learned ? resolve(learned.her.lovedIds) : [];
  const pool =
    aud === "her"
      ? [...learnedHer, ...SEEDS_HER]
      : aud === "me"
      ? [...learnedMe, ...SEEDS_ME]
      : [...learnedHer, ...learnedMe, ...SEEDS_HER, ...SEEDS_ME];
  return pool.find((s) => s.id !== t.id && s.genres.some((g) => t.genres.includes(g)));
}

// ---- mood/era/etc helpers -------------------------------------------------

const ERA_ADJACENT: Record<string, string[]> = {
  "70s": ["80s"], "80s": ["70s", "90s"], "90s": ["80s", "2000s"],
  "2000s": ["90s", "2010s"], "2010s": ["2000s", "modern"], modern: ["2010s"], any: [],
};

function eraFit(t: Title, era: string): number {
  if (era === "any") return 0.6;
  if (t.era === era) return 1;
  if (ERA_ADJACENT[era]?.includes(t.era)) return 0.5;
  return 0;
}

function vibeMatch(t: Title, vibe?: Vibe): number {
  if (!vibe) return 0.5;
  const idx = t.vibes.indexOf(vibe);
  if (idx === 0) return 1;
  if (idx === 1) return 0.75;
  if (idx > 1) return 0.55;
  return 0;
}

function moodFit(t: Title, a: QuizAnswers): number {
  let s = 0.4;
  if (a.feeling && t.moods.includes(a.feeling)) s += 0.4;
  if (a.energy) {
    if (a.energy === t.energy) s += 0.2;
    else if (
      (a.energy === "moderate" && t.energy !== "brain-off") ||
      (a.energy === "full-attention" && t.energy === "moderate")
    )
      s += 0.1;
  }
  return Math.min(s, 1);
}

function commitmentFit(t: Title, a: QuizAnswers): number {
  if (!a.commitment) return 0.6;
  if (a.commitment === t.commitment) return 1;
  const movieish = ["movie", "single-evening"];
  const seriesish = ["full-series", "long-term", "weekend-binge", "mini-series"];
  if (movieish.includes(a.commitment) && t.mediaType === "movie") return 0.85;
  if (seriesish.includes(a.commitment) && t.mediaType === "tv") return 0.7;
  return 0.25;
}

// ---- hard filters ---------------------------------------------------------

export function audienceOf(a: QuizAnswers, opts: RecOptions = {}): Audience {
  if (opts.audience) return opts.audience;
  return a.context === "together" ? "together" : "me";
}

/** would Amore (and therefore "together") refuse this on the gore rule? */
export function tooViolentForHer(t: Title): boolean {
  return t.violence > TASTE_AMORE.maxViolence;
}

// commitment answers that hard-lock the media type (duration-flavored answers
// — single-evening/weekend-binge/long-term — stay a soft nudge via commitmentFit).
const COMMITMENT_MEDIA_LOCK: Partial<Record<NonNullable<QuizAnswers["commitment"]>, Title["mediaType"]>> = {
  movie: "movie",
  "mini-series": "tv",
  "full-series": "tv",
};

/** the hard, non-negotiable filters for an audience */
function passesHardFilters(t: Title, aud: Audience, commitment?: QuizAnswers["commitment"]): boolean {
  if (EXCLUDED_COUNTRIES.includes(t.country)) return false; // no Bollywood, ever
  if (aud !== "me" && tooViolentForHer(t)) return false; // Amore's no-gore rule
  const lockedMedia = commitment ? COMMITMENT_MEDIA_LOCK[commitment] : undefined;
  if (lockedMedia && t.mediaType !== lockedMedia) return false; // "Movie" pick shouldn't surface TV, and vice versa
  return true;
}

// ---- learned taste (light behavioral layer) -------------------------------
// Derives a small per-person genre bias + recent-love anchors from real votes
// and ratings. Pure: no store/React imports; the store feeds it the raw arrays.

/** how far a fully-confident learned genre bias can move the effective weight */
const MAX_LEARNED = 1.5;

export interface LearnedTaste {
  /** genre -> learned bias in roughly [-MAX_LEARNED, MAX_LEARNED] */
  genreWeights: Record<string, number>;
  /** recent real loves (love votes / 9+ ratings), newest first, capped */
  lovedIds: string[];
}
export interface LearnedTastes {
  me: LearnedTaste;
  her: LearnedTaste;
}

export function learnedTaste(
  votes: Vote[],
  watched: WatchedRecord[],
  get: (id: string) => Title | undefined = getTitle
): LearnedTastes {
  const build = (person: Watcher): LearnedTaste => {
    const raw = new Map<string, number>();
    const loved: { id: string; at: number }[] = [];
    let signals = 0;

    const bump = (id: string, delta: number) => {
      const t = get(id);
      if (!t) return; // unresolved title contributes nothing (and isn't a signal)
      signals += 1;
      if (delta !== 0) for (const g of t.genres) raw.set(g, (raw.get(g) ?? 0) + delta);
    };

    for (const v of votes) {
      if (v.userId !== person) continue;
      const delta = v.value === "love" ? 2 : v.value === "like" ? 1 : v.value === "pass" ? -1 : 0;
      bump(v.titleId, delta);
      if (v.value === "love") loved.push({ id: v.titleId, at: v.createdAt });
    }
    for (const w of watched) {
      if (w.watcher !== person) continue;
      const delta = w.rating == null ? 0 : w.rating >= 8 ? 2 : w.rating <= 4 ? -1 : 0;
      bump(w.titleId, delta);
      if (w.rating != null && w.rating >= 9) loved.push({ id: w.titleId, at: w.createdAt });
    }

    const genreWeights: Record<string, number> = {};
    if (signals > 0) {
      let maxAbs = 0;
      for (const val of raw.values()) maxAbs = Math.max(maxAbs, Math.abs(val));
      if (maxAbs > 0) {
        const f = signals / (signals + 20); // confidence damping toward 1
        for (const [g, val] of raw) genreWeights[g] = f * (val / maxAbs) * MAX_LEARNED;
      }
    }

    const lovedIds = loved
      .sort((a, b) => b.at - a.at)
      .map((x) => x.id)
      .filter((id, i, arr) => arr.indexOf(id) === i) // dedupe, keep most recent
      .slice(0, 12);

    return { genreWeights, lovedIds };
  };

  return { me: build("me"), her: build("her") };
}

// ---- scoring -------------------------------------------------------------

export interface RecOptions {
  excludeIds?: Set<string>;
  preferHiddenGems?: boolean;
  preferClassics?: boolean;
  /** boosts titles similar (shared genres) to this one */
  similarTo?: string;
  /** override the audience (otherwise derived from QuizAnswers.context) */
  audience?: Audience;
  /** learned per-person taste from real votes/ratings (optional; off by default) */
  learned?: LearnedTastes;
}

export function scoreTitle(t: Title, a: QuizAnswers, opts: RecOptions = {}): Scored {
  const aud = audienceOf(a, opts);
  const genre = genreAffinity(t, aud, opts.learned);
  const vibe = vibeMatch(t, a.vibe);
  const mood = moodFit(t, a);
  const era = eraFit(t, a.era);
  const commit = commitmentFit(t, a);
  const quality = t.voteAverage / 10;
  const pop = t.popularity / 100;

  let score =
    0.26 * genre +
    0.2 * vibe +
    0.16 * mood +
    0.1 * era +
    0.1 * commit +
    0.12 * quality +
    0.06 * (opts.preferHiddenGems ? 1 - pop : pop);

  if (opts.preferHiddenGems && t.hiddenGem) score += 0.12;
  if (opts.preferClassics && t.classic) score += 0.14;

  // ---- audience taste nudges (soft) ----
  if (aud === "her" || aud === "together") {
    if (t.international) score += 0.06; // Amore loves international cinema
    if (t.violence <= 1) score += 0.05; // wholesome bonus
    if (t.cerebral && t.genres.some((g) => CRIMEY.includes(g))) score += 0.05; // smart, low-blood crime
    if (t.violence === 3) score -= 0.05; // near the ceiling — softly down-weight
  }
  if (aud === "her") {
    if (t.violence >= 2) score -= 0.05; // she leans gentler still
    if (["Animation", "Comedy", "Family", "Romance"].some((g) => t.genres.includes(g))) score += 0.04;
  }
  if (aud === "me") {
    if (t.genres.some((g) => CRIMEY.includes(g))) score += 0.03; // Panda's lane
  }

  if (opts.similarTo) {
    const ref = getTitle(opts.similarTo);
    if (ref && ref.id !== t.id) {
      const shared = t.genres.filter((g) => ref.genres.includes(g)).length;
      const sharedVibe = t.vibes.filter((v) => ref.vibes.includes(v)).length;
      score += 0.08 * Math.min(shared, 3) + 0.05 * Math.min(sharedVibe, 2);
    }
  }

  // penalties
  if (TASTE_PANDA.doNotWant.includes("bad-romance") && t.vibes[0] === "romantic" && quality < 0.78)
    score -= 0.1;

  return { title: t, score, why: explain(t, a, aud, { genre, vibe, era }, opts) };
}

function explain(
  t: Title,
  a: QuizAnswers,
  aud: Audience,
  parts: { genre: number; vibe: number; era: number },
  opts: RecOptions
): string {
  const bits: string[] = [];
  const chosen: string[] = [];
  if (a.vibe) chosen.push(cap(a.vibe.replace("-", " ")));
  if (a.energy === "full-attention") chosen.push("Full Attention");
  if (a.context === "together") chosen.push("Together");
  if (chosen.length) bits.push(`You picked ${chosen.join(" + ")}.`);

  // together / her get a couple-aware reason first
  if ((aud === "her" || aud === "together") && t.international) {
    bits.push(`${t.language} cinema from ${t.country}, exactly Amore's kind of pick.`);
  } else if (aud === "together" && t.violence <= 2 && t.cerebral) {
    bits.push("Low on blood, high on brains. A clean fit for you both.");
  } else {
    const anchor = seedAnchor(t, aud, opts.learned);
    if (parts.genre > 0.45 && anchor) {
      bits.push(`Because you loved ${anchor.title}, this ${t.genres[0].toLowerCase()} pick is right in your lane.`);
    } else if (opts.similarTo) {
      const ref = getTitle(opts.similarTo);
      if (ref) bits.push(`More like ${ref.title}: shared ${t.genres[0].toLowerCase()} DNA.`);
    } else if (parts.vibe > 0.7 && a.vibe) {
      bits.push(`It nails the ${a.vibe.replace("-", " ")} vibe you're after.`);
    }
  }

  if (t.hiddenGem && opts.preferHiddenGems) bits.push("A hidden gem most people miss.");
  if (t.classic && opts.preferClassics) bits.push("A must-watch classic you shouldn't skip.");
  if (t.voteAverage >= 8.4 && bits.length < 2) bits.push(`Critically loved: ${t.voteAverage.toFixed(1)}/10.`);

  return bits.slice(0, 2).join(" ") || `A strong match for tonight's mood.`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- public API ----------------------------------------------------------

export function recommend(a: QuizAnswers, opts: RecOptions = {}, limit = 20): Scored[] {
  const aud = audienceOf(a, opts);
  const pool = TITLES.filter(
    (t) => !opts.excludeIds?.has(t.id) && passesHardFilters(t, aud, a.commitment)
  );
  return pool
    .map((t) => scoreTitle(t, a, opts))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

const DEFAULT_ANSWERS: QuizAnswers = { context: "together", era: "any" };

export function tonightsPick(excludeIds?: Set<string>, learned?: LearnedTastes): Scored {
  // couple pick: no forced vibe, let the audience-aware blend surface a shared winner
  return recommend({ ...DEFAULT_ANSWERS, energy: "full-attention" }, { excludeIds, learned })[0];
}

export function surpriseMe(excludeIds?: Set<string>, learned?: LearnedTastes): Scored {
  const list = recommend(DEFAULT_ANSWERS, { excludeIds, learned }, 12);
  const i = Math.floor(Math.pow(pseudo(), 1.6) * list.length);
  return list[Math.min(i, list.length - 1)];
}

export function hiddenGems(limit = 8, learned?: LearnedTastes): Scored[] {
  return recommend(DEFAULT_ANSWERS, { preferHiddenGems: true, learned }, 40)
    .filter((s) => s.title.hiddenGem || s.title.popularity < 72)
    .slice(0, limit);
}

export function classics(limit = 8, learned?: LearnedTastes): Scored[] {
  return recommend(DEFAULT_ANSWERS, { preferClassics: true, learned }, 40)
    .filter((s) => s.title.classic)
    .slice(0, limit);
}

/** titles similar to a given one — used by the local fallback for "Similar movies". */
export function similarTitles(titleId: string, audience: Audience = "together", limit = 6): Scored[] {
  const ref = getTitle(titleId);
  const a: QuizAnswers = { context: audience === "me" ? "alone" : "together", era: "any" };
  return recommend(a, { similarTo: titleId, audience, excludeIds: new Set([titleId]) }, limit + 4)
    .filter((s) => !ref || s.title.id !== ref.id)
    .slice(0, limit);
}

// deterministic-ish pseudo random so SSR/CSR don't diverge wildly; reseeds per call site
let _seed = 1337;
function pseudo() {
  _seed = (_seed * 16807) % 2147483647;
  return _seed / 2147483647;
}
export function reseed(n: number) {
  _seed = n % 2147483647 || 1337;
}
