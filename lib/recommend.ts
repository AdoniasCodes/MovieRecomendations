import {
  EXCLUDED_COUNTRIES,
  TASTE_AMORE,
  TASTE_PANDA,
  TITLES,
  getTitle,
} from "./mock-data";
import type { QuizAnswers, Scored, Title, Vibe } from "./types";

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

function genreAffinity(t: Title, aud: Audience): number {
  const pick = (w: Map<string, number>) => {
    let s = 0;
    for (const g of t.genres) s += w.get(g) ?? 0;
    return Math.min(s / 4, 1);
  };
  if (aud === "me") return pick(W_ME);
  if (aud === "her") return pick(W_HER);
  return (pick(W_ME) + pick(W_HER)) / 2;
}

function seedAnchor(t: Title, aud: Audience): Title | undefined {
  const pool = aud === "her" ? SEEDS_HER : aud === "me" ? SEEDS_ME : [...SEEDS_HER, ...SEEDS_ME];
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

/** the hard, non-negotiable filters for an audience */
function passesHardFilters(t: Title, aud: Audience): boolean {
  if (EXCLUDED_COUNTRIES.includes(t.country)) return false; // no Bollywood, ever
  if (aud !== "me" && tooViolentForHer(t)) return false; // Amore's no-gore rule
  return true;
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
}

export function scoreTitle(t: Title, a: QuizAnswers, opts: RecOptions = {}): Scored {
  const aud = audienceOf(a, opts);
  const genre = genreAffinity(t, aud);
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
    bits.push(`${t.language} cinema from ${t.country} — exactly Amore's kind of pick.`);
  } else if (aud === "together" && t.violence <= 2 && t.cerebral) {
    bits.push("Low on blood, high on brains — a clean fit for you both.");
  } else {
    const anchor = seedAnchor(t, aud);
    if (parts.genre > 0.45 && anchor) {
      bits.push(`Because you loved ${anchor.title}, this ${t.genres[0].toLowerCase()} pick is right in your lane.`);
    } else if (opts.similarTo) {
      const ref = getTitle(opts.similarTo);
      if (ref) bits.push(`More like ${ref.title} — shared ${t.genres[0].toLowerCase()} DNA.`);
    } else if (parts.vibe > 0.7 && a.vibe) {
      bits.push(`It nails the ${a.vibe.replace("-", " ")} vibe you're after.`);
    }
  }

  if (t.hiddenGem && opts.preferHiddenGems) bits.push("A hidden gem most people miss.");
  if (t.classic && opts.preferClassics) bits.push("A must-watch classic you shouldn't skip.");
  if (t.voteAverage >= 8.4 && bits.length < 2) bits.push(`Critically loved — ${t.voteAverage.toFixed(1)}/10.`);

  return bits.slice(0, 2).join(" ") || `A strong match for tonight's mood.`;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// ---- public API ----------------------------------------------------------

export function recommend(a: QuizAnswers, opts: RecOptions = {}, limit = 20): Scored[] {
  const aud = audienceOf(a, opts);
  const pool = TITLES.filter(
    (t) => !opts.excludeIds?.has(t.id) && passesHardFilters(t, aud)
  );
  return pool
    .map((t) => scoreTitle(t, a, opts))
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
}

const DEFAULT_ANSWERS: QuizAnswers = { context: "together", era: "any" };

export function tonightsPick(excludeIds?: Set<string>): Scored {
  // couple pick: no forced vibe, let the audience-aware blend surface a shared winner
  return recommend({ ...DEFAULT_ANSWERS, energy: "full-attention" }, { excludeIds })[0];
}

export function surpriseMe(excludeIds?: Set<string>): Scored {
  const list = recommend(DEFAULT_ANSWERS, { excludeIds }, 12);
  const i = Math.floor(Math.pow(pseudo(), 1.6) * list.length);
  return list[Math.min(i, list.length - 1)];
}

export function hiddenGems(limit = 8): Scored[] {
  return recommend(DEFAULT_ANSWERS, { preferHiddenGems: true }, 40)
    .filter((s) => s.title.hiddenGem || s.title.popularity < 72)
    .slice(0, limit);
}

export function classics(limit = 8): Scored[] {
  return recommend(DEFAULT_ANSWERS, { preferClassics: true }, 40)
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
