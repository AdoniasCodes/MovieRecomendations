"use client";

// Client-side wrappers around /api/catalog. Every fetch registers its results
// into the title registry so getTitle() resolves them in the sheet, watchlist, etc.
import { registerTitles } from "./mock-data";
import type { MediaFilter, Title } from "./types";

async function fetchCatalog(params: Record<string, string>): Promise<Title[]> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`/api/catalog?${qs}`, { signal: AbortSignal.timeout(15_000) });
    const data = (await res.json()) as { results?: Title[] };
    const results = data.results ?? [];
    registerTitles(results);
    return results;
  } catch {
    return [];
  }
}

const p = (n: number) => String(n);
const withMedia = (params: Record<string, string>, media: MediaFilter) =>
  media === "both" ? params : { ...params, media };

export const searchCatalog = (q: string, page = 1, media: MediaFilter = "both") =>
  fetchCatalog(withMedia({ type: "search", q, page: p(page) }, media));
export const trendingCatalog = (page = 1, media: MediaFilter = "both") =>
  fetchCatalog(withMedia({ type: "trending", page: p(page) }, media));
export const browseCatalog = (genre: string, page = 1, media: MediaFilter = "both") =>
  fetchCatalog(withMedia({ type: "browse", genre, page: p(page) }, media));
export const topRatedCatalog = (page = 1, media: MediaFilter = "both") =>
  fetchCatalog(withMedia({ type: "toprated", page: p(page) }, media));
export const latestCatalog = (page = 1, media: MediaFilter = "both") =>
  fetchCatalog(withMedia({ type: "latest", page: p(page) }, media));
/** ~100+ taste-filtered titles for the Tonight's Pick carousel. */
export const tonightCatalog = () => fetchCatalog({ type: "tonight" });

/** Pick the right loader for a Browse category (or search) + page. */
export function loadCatalogPage(category: string, query: string, page: number, media: MediaFilter = "both") {
  if (query.trim()) return searchCatalog(query, page, media);
  if (category === "Trending") return trendingCatalog(page, media);
  if (category === "Top Rated") return topRatedCatalog(page, media);
  if (category === "New") return latestCatalog(page, media);
  return browseCatalog(category, page, media);
}
