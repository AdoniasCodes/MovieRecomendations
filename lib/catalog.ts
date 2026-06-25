"use client";

// Client-side wrappers around /api/catalog. Every fetch registers its results
// into the title registry so getTitle() resolves them in the sheet, watchlist, etc.
import { registerTitles } from "./mock-data";
import type { Title } from "./types";

async function fetchCatalog(params: Record<string, string>): Promise<Title[]> {
  const qs = new URLSearchParams(params).toString();
  try {
    const res = await fetch(`/api/catalog?${qs}`);
    const data = (await res.json()) as { results?: Title[] };
    const results = data.results ?? [];
    registerTitles(results);
    return results;
  } catch {
    return [];
  }
}

const p = (n: number) => String(n);

export const searchCatalog = (q: string, page = 1) => fetchCatalog({ type: "search", q, page: p(page) });
export const trendingCatalog = (page = 1) => fetchCatalog({ type: "trending", page: p(page) });
export const browseCatalog = (genre: string, page = 1) => fetchCatalog({ type: "browse", genre, page: p(page) });
export const topRatedCatalog = (page = 1) => fetchCatalog({ type: "toprated", page: p(page) });
export const latestCatalog = (page = 1) => fetchCatalog({ type: "latest", page: p(page) });
/** ~100+ taste-filtered titles for the Tonight's Pick carousel. */
export const tonightCatalog = () => fetchCatalog({ type: "tonight" });

/** Pick the right loader for a Browse category (or search) + page. */
export function loadCatalogPage(category: string, query: string, page: number) {
  if (query.trim()) return searchCatalog(query, page);
  if (category === "Trending") return trendingCatalog(page);
  if (category === "Top Rated") return topRatedCatalog(page);
  if (category === "New") return latestCatalog(page);
  return browseCatalog(category, page);
}
