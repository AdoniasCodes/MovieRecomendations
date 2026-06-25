// Server-only TMDB client. Turns live TMDB results into our `Title` shape so the
// whole app (rec engine display, title sheet, swipe, watchlist) works unchanged.
// The taste fields TMDB doesn't have (violence/cerebral/international) are inferred
// from genres + language per the couple's taste brief (see context.md §2).
import "server-only";
import type { Era, Energy, Commitment, MediaType, Title, Vibe, Feeling } from "./types";

const BASE = "https://api.themoviedb.org/3";

function token() {
  const t = process.env.TMDB_READ_TOKEN;
  if (!t) throw new Error("TMDB_READ_TOKEN not set");
  return t;
}

async function tmdb(path: string, params: Record<string, string> = {}) {
  const url = new URL(BASE + path);
  url.searchParams.set("include_adult", "false");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token()}`, Accept: "application/json" },
    // cache trending/browse a bit; search is fresh enough at the edge
    next: { revalidate: 60 * 30 },
  });
  if (!res.ok) throw new Error(`TMDB ${res.status} ${path}`);
  return res.json();
}

// ---- lookup tables --------------------------------------------------------
const MOVIE_GENRES: Record<number, string> = {
  28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy", 80: "Crime",
  99: "Documentary", 18: "Drama", 10751: "Family", 14: "Fantasy", 36: "History",
  27: "Horror", 10402: "Music", 9648: "Mystery", 10749: "Romance",
  878: "Science Fiction", 10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western",
};
const TV_GENRES: Record<number, string> = {
  10759: "Action", 16: "Animation", 35: "Comedy", 80: "Crime", 99: "Documentary",
  18: "Drama", 10751: "Family", 10762: "Kids", 9648: "Mystery", 10763: "News",
  10764: "Reality", 10765: "Science Fiction", 10766: "Soap", 10767: "Talk",
  10768: "War", 37: "Western",
};
const LANGS: Record<string, string> = {
  en: "English", ko: "Korean", ja: "Japanese", zh: "Mandarin", cn: "Mandarin",
  tr: "Turkish", fr: "French", es: "Spanish", de: "German", it: "Italian",
  pt: "Portuguese", ru: "Russian", th: "Thai", hi: "Hindi", ta: "Tamil",
  sv: "Swedish", da: "Danish", no: "Norwegian", nl: "Dutch", pl: "Polish",
  ar: "Arabic", he: "Hebrew", fa: "Persian", id: "Indonesian", vi: "Vietnamese",
};
const COUNTRIES: Record<string, string> = {
  US: "US", GB: "UK", KR: "South Korea", JP: "Japan", CN: "China", TR: "Turkey",
  FR: "France", ES: "Spain", DE: "Germany", IT: "Italy", IN: "India", TH: "Thailand",
  SE: "Sweden", DK: "Denmark", NO: "Norway", NL: "Netherlands", RU: "Russia",
  BR: "Brazil", MX: "Mexico", CA: "Canada", AU: "Australia", HK: "Hong Kong", TW: "Taiwan",
};

const PALETTE = [
  ["#2a3a44", "#0a0a0a"], ["#3a2a4a", "#0a0a0a"], ["#4a3a2a", "#0a0a0a"],
  ["#1a4a5a", "#0a0a0a"], ["#5a2a3a", "#1a0a14"], ["#2a4a3a", "#0a0a0a"],
  ["#3a3424", "#0a0a0a"], ["#24344a", "#0a0a0a"],
];

function eraOf(year: number): Era {
  if (!year) return "any";
  if (year >= 2020) return "modern";
  if (year >= 2010) return "2010s";
  if (year >= 2000) return "2000s";
  if (year >= 1990) return "90s";
  if (year >= 1980) return "80s";
  if (year >= 1970) return "70s";
  return "any";
}

// rough on-screen violence estimate (0..5) from genres — Amore's hard filter.
function violenceOf(genres: string[]): number {
  const g = new Set(genres);
  let v = 1;
  if (g.has("War")) v = Math.max(v, 4);
  if (g.has("Horror")) v = Math.max(v, 5);
  if (g.has("Action")) v = Math.max(v, 3);
  if (g.has("Thriller")) v = Math.max(v, 3);
  if (g.has("Crime")) v = Math.max(v, 3);
  if (g.has("Western")) v = Math.max(v, 3);
  if (g.has("Mystery")) v = Math.max(v, 2);
  if (g.has("Animation") || g.has("Family") || g.has("Comedy") || g.has("Romance") || g.has("Music")) {
    v = Math.min(v, 1);
  }
  return v;
}

function cerebralOf(genres: string[]): boolean {
  const g = new Set(genres);
  return g.has("Mystery") || (g.has("Crime") && g.has("Drama")) || (g.has("Science Fiction") && !g.has("Action"));
}

function vibesOf(genres: string[]): Vibe[] {
  const g = new Set(genres);
  const out = new Set<Vibe>();
  if (g.has("Mystery")) out.add("mysterious");
  if (g.has("Thriller") || g.has("Crime")) out.add("thrilling");
  if (g.has("Horror")) out.add("dark");
  if (g.has("Comedy")) out.add("funny");
  if (g.has("Romance")) out.add("romantic");
  if (g.has("Family") || g.has("Animation")) out.add("cozy");
  if (g.has("Drama")) out.add("emotional");
  if (g.has("Science Fiction") || g.has("Fantasy")) out.add("mind-blowing");
  if (g.has("Action") || g.has("Adventure")) out.add("action-packed");
  if (out.size === 0) out.add("thought-provoking");
  return [...out].slice(0, 4);
}

function moodsOf(genres: string[]): Feeling[] {
  const g = new Set(genres);
  const out = new Set<Feeling>();
  if (g.has("Comedy") || g.has("Family")) out.add("happy");
  if (g.has("Drama")) out.add("sad");
  if (g.has("Mystery") || g.has("Science Fiction")) out.add("curious");
  if (g.has("Action") || g.has("Thriller")) out.add("excited");
  if (g.has("Romance") || g.has("Animation")) out.add("relaxing");
  if (out.size === 0) out.add("curious");
  return [...out];
}

function energyOf(genres: string[]): Energy {
  const g = new Set(genres);
  if (g.has("Action") || g.has("Thriller") || g.has("Horror")) return "full-attention";
  if (g.has("Mystery") || g.has("Science Fiction") || g.has("Crime")) return "full-attention";
  if (g.has("Comedy") || g.has("Family") || g.has("Animation")) return "brain-off";
  return "moderate";
}

interface RawTmdb {
  id: number;
  media_type?: string;
  title?: string;
  name?: string;
  overview?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  genre_ids?: number[];
  original_language?: string;
  origin_country?: string[];
  popularity?: number;
  vote_average?: number;
  release_date?: string;
  first_air_date?: string;
}

/** True for titles we exclude per the taste brief (Bollywood / Indian cinema). */
function excluded(raw: RawTmdb): boolean {
  if (raw.original_language === "hi" || raw.original_language === "ta") return true;
  if (raw.origin_country?.includes("IN")) return true;
  return false;
}

export function mapTmdbToTitle(raw: RawTmdb, forceType?: MediaType): Title | null {
  const mediaType: MediaType =
    forceType ?? (raw.media_type === "tv" || (!raw.title && !!raw.name) ? "tv" : "movie");
  if (raw.media_type === "person") return null;
  if (!raw.poster_path) return null; // skip art-less junk
  if (excluded(raw)) return null;

  const name = raw.title || raw.name || "Untitled";
  const dateStr = raw.release_date || raw.first_air_date || "";
  const year = dateStr ? parseInt(dateStr.slice(0, 4), 10) : 0;
  const gmap = mediaType === "tv" ? TV_GENRES : MOVIE_GENRES;
  const genres = (raw.genre_ids ?? []).map((id) => gmap[id]).filter(Boolean);
  if (genres.length === 0) genres.push(mediaType === "tv" ? "Drama" : "Drama");

  const lang = raw.original_language ?? "en";
  const language = LANGS[lang] ?? lang.toUpperCase();
  const country = raw.origin_country?.[0] ? COUNTRIES[raw.origin_country[0]] ?? raw.origin_country[0] : (lang === "en" ? "US" : language);
  const international = lang !== "en";
  const vote = raw.vote_average ?? 0;
  const pop = Math.min(100, Math.round(raw.popularity ?? 0));
  const [colorA, colorB] = PALETTE[raw.id % PALETTE.length];

  return {
    id: `${mediaType}:${raw.id}`,
    tmdbId: raw.id,
    mediaType,
    title: name,
    year,
    era: eraOf(year),
    runtime: mediaType === "tv" ? 45 : 120,
    genres,
    vibes: vibesOf(genres),
    moods: moodsOf(genres),
    energy: energyOf(genres),
    commitment: mediaType === "tv" ? "full-series" : "movie",
    voteAverage: vote,
    popularity: pop,
    hiddenGem: vote >= 7.5 && pop < 25,
    classic: year > 0 && year < 2000 && vote >= 7.3,
    overview: raw.overview || "No description yet.",
    cast: [],
    violence: violenceOf(genres),
    cerebral: cerebralOf(genres),
    country,
    language,
    international,
    colorA,
    colorB,
    posterPath: raw.poster_path ?? undefined,
  };
}

function mapList(results: RawTmdb[], forceType?: MediaType): Title[] {
  const out: Title[] = [];
  const seen = new Set<string>();
  for (const r of results ?? []) {
    const t = mapTmdbToTitle(r, forceType);
    if (t && !seen.has(t.id)) {
      seen.add(t.id);
      out.push(t);
    }
  }
  return out;
}

// ---- public API -----------------------------------------------------------
export async function searchTmdb(query: string, page = 1): Promise<Title[]> {
  if (!query.trim()) return [];
  const data = await tmdb("/search/multi", { query, page: String(page) });
  return mapList(data.results);
}

export async function trendingTmdb(page = 1): Promise<Title[]> {
  const data = await tmdb("/trending/all/week", { page: String(page) });
  return mapList(data.results);
}

/** Browse by our genre label (movies + tv blended), newest/most-popular first. */
export async function browseTmdb(genre: string, page = 1): Promise<Title[]> {
  const movieId = Object.entries(MOVIE_GENRES).find(([, n]) => n === genre)?.[0];
  const tvId = Object.entries(TV_GENRES).find(([, n]) => n === genre)?.[0];
  const [movies, tv] = await Promise.all([
    movieId
      ? tmdb("/discover/movie", { with_genres: movieId, sort_by: "popularity.desc", page: String(page) })
      : Promise.resolve({ results: [] }),
    tvId
      ? tmdb("/discover/tv", { with_genres: tvId, sort_by: "popularity.desc", page: String(page) })
      : Promise.resolve({ results: [] }),
  ]);
  const blended = [...mapList(movies.results, "movie"), ...mapList(tv.results, "tv")]
    .sort((a, b) => b.popularity - a.popularity);
  return blended;
}

function blend(movies: { results?: RawTmdb[] }, tv: { results?: RawTmdb[] }): Title[] {
  return [...mapList(movies.results ?? [], "movie"), ...mapList(tv.results ?? [], "tv")]
    .sort((a, b) => b.popularity - a.popularity);
}

/** Highest-rated movies + shows (deep catalog, paginated). */
export async function topRatedTmdb(page = 1): Promise<Title[]> {
  const [m, t] = await Promise.all([
    tmdb("/movie/top_rated", { page: String(page) }),
    tmdb("/tv/top_rated", { page: String(page) }),
  ]);
  return blend(m, t);
}

/** Freshly released / currently airing (the "latest" surface), paginated. */
export async function latestTmdb(page = 1): Promise<Title[]> {
  const [m, t] = await Promise.all([
    tmdb("/movie/now_playing", { page: String(page) }),
    tmdb("/tv/on_the_air", { page: String(page) }),
  ]);
  return blend(m, t);
}

// Genres that blend both tastes (Panda's crime/thriller/mystery + Amore's
// wholesome/romance/animation/international cerebral picks).
const TONIGHT_GENRES = ["Mystery", "Crime", "Thriller", "Drama", "Romance", "Comedy", "Animation"];

/** A large (~100), taste-filtered pool for the "Tonight's Pick" carousel.
 * Excludes gore (Amore's no-gore rule for "together") and low-rated titles. */
export async function tonightPoolTmdb(): Promise<Title[]> {
  const lists = await Promise.all([
    trendingTmdb().catch(() => []),
    ...TONIGHT_GENRES.map((g) => browseTmdb(g).catch(() => [])),
  ]);
  const seen = new Set<string>();
  const out: Title[] = [];
  for (const t of lists.flat()) {
    if (seen.has(t.id)) continue;
    if (t.violence >= 4) continue; // Amore's hard no-gore filter for together
    if (t.voteAverage < 6.2) continue; // keep the bar high
    if (!t.posterPath) continue; // hero needs real art
    seen.add(t.id);
    out.push(t);
  }
  return out.slice(0, 150);
}
