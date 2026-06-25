"use client";

import { PosterCard } from "@/components/ui/PosterCard";
import { loadCatalogPage } from "@/lib/catalog";
import { BROWSE_GENRES } from "@/lib/tmdb-genres";
import type { Title } from "@/lib/types";
import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

const CATEGORIES = ["Trending", "Top Rated", "New", ...BROWSE_GENRES];

export function Browse() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Trending");
  const [results, setResults] = useState<Title[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [done, setDone] = useState(false); // no more pages
  const reqId = useRef(0);
  const seen = useRef(new Set<string>());

  // (re)load page 1 whenever the query or category changes (search debounced)
  useEffect(() => {
    const id = ++reqId.current;
    setLoading(true);
    const run = async () => {
      const data = await loadCatalogPage(category, query, 1);
      if (id !== reqId.current) return;
      seen.current = new Set(data.map((t) => t.id));
      setResults(data);
      setPage(1);
      setDone(data.length === 0);
      setLoading(false);
    };
    const t = setTimeout(run, query.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, category]);

  // fetch the next page on demand and append (deduped)
  const loadMore = useCallback(async () => {
    if (loading || done) return;
    const id = reqId.current;
    setLoading(true);
    const next = page + 1;
    const data = await loadCatalogPage(category, query, next);
    if (id !== reqId.current) return;
    const fresh = data.filter((t) => !seen.current.has(t.id));
    fresh.forEach((t) => seen.current.add(t.id));
    setResults((r) => [...r, ...fresh]);
    setPage(next);
    if (data.length === 0 || next >= 500) setDone(true); // TMDB hard-caps at 500 pages
    setLoading(false);
  }, [loading, done, page, category, query]);

  // infinite scroll: observe a sentinel near the bottom
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "600px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadMore]);

  const chips = query.trim() ? [] : CATEGORIES;

  return (
    <div className="pb-4">
      {/* search bar */}
      <div className="relative mb-3">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search any movie or series…"
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-10 text-sm text-white placeholder:text-white/35 outline-none focus:border-accent/50"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* category chips */}
      {chips.length > 0 && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((g) => (
            <button
              key={g}
              onClick={() => setCategory(g)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                category === g
                  ? "bg-accent-gradient text-white shadow-glow"
                  : "border border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center text-white/40">
          <p className="text-sm">{query ? `No results for “${query}”` : "Nothing here yet."}</p>
        </div>
      ) : (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-3 gap-2.5">
            {results.map((t) => (
              <PosterCard key={t.id} title={t} />
            ))}
          </motion.div>
          {/* sentinel + loader */}
          <div ref={sentinel} className="h-10" />
          {loading && (
            <div className="flex justify-center py-3 text-white/40">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}
          {done && <p className="py-3 text-center text-[11px] text-white/30">That&apos;s everything 🎬</p>}
        </>
      )}
    </div>
  );
}
