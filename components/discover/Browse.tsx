"use client";

import { PosterCard } from "@/components/ui/PosterCard";
import { browseCatalog, searchCatalog, trendingCatalog } from "@/lib/catalog";
import { BROWSE_GENRES } from "@/lib/tmdb-genres";
import type { Title } from "@/lib/types";
import { motion } from "framer-motion";
import { Loader2, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export function Browse() {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string>("Trending");
  const [results, setResults] = useState<Title[]>([]);
  const [loading, setLoading] = useState(true);
  const reqId = useRef(0);

  // debounced search; empty query falls back to the active genre / trending
  useEffect(() => {
    const id = ++reqId.current;
    const run = async () => {
      setLoading(true);
      const data = query.trim()
        ? await searchCatalog(query)
        : genre === "Trending"
        ? await trendingCatalog()
        : await browseCatalog(genre);
      if (id === reqId.current) {
        setResults(data);
        setLoading(false);
      }
    };
    const t = setTimeout(run, query.trim() ? 350 : 0);
    return () => clearTimeout(t);
  }, [query, genre]);

  const chips = ["Trending", ...BROWSE_GENRES];

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

      {/* genre chips (hidden while searching) */}
      {!query.trim() && (
        <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((g) => (
            <button
              key={g}
              onClick={() => setGenre(g)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
                genre === g
                  ? "bg-accent-gradient text-white shadow-glow"
                  : "border border-white/10 bg-white/5 text-white/60 hover:text-white"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center text-white/40">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        <div className="flex min-h-[40vh] flex-col items-center justify-center text-center text-white/40">
          <p className="text-sm">{query ? `No results for “${query}”` : "Nothing here yet."}</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid grid-cols-3 gap-2.5"
        >
          {results.map((t) => (
            <PosterCard key={t.id} title={t} />
          ))}
        </motion.div>
      )}
    </div>
  );
}
