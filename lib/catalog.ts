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

export const searchCatalog = (q: string) => fetchCatalog({ type: "search", q });
export const trendingCatalog = () => fetchCatalog({ type: "trending" });
export const browseCatalog = (genre: string) => fetchCatalog({ type: "browse", genre });
/** ~100+ taste-filtered titles for the Tonight's Pick carousel. */
export const tonightCatalog = () => fetchCatalog({ type: "tonight" });
