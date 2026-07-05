import { NextResponse } from "next/server";
import { searchTmdb, trendingTmdb, browseTmdb, tonightPoolTmdb, topRatedTmdb, latestTmdb } from "@/lib/tmdb";
import type { MediaFilter } from "@/lib/types";

// Live catalog endpoint. ?type=search&q= | ?type=trending | ?type=browse&genre= | &media=movie|tv
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "trending";
  const page = Number(searchParams.get("page") ?? "1") || 1;
  const mediaParam = searchParams.get("media");
  const media: MediaFilter = mediaParam === "movie" || mediaParam === "tv" ? mediaParam : "both";

  try {
    let results;
    if (type === "search") {
      results = await searchTmdb(searchParams.get("q") ?? "", page, media);
    } else if (type === "browse") {
      results = await browseTmdb(searchParams.get("genre") ?? "Drama", page, media);
    } else if (type === "toprated") {
      results = await topRatedTmdb(page, media);
    } else if (type === "latest") {
      results = await latestTmdb(page, media);
    } else if (type === "tonight") {
      results = await tonightPoolTmdb();
    } else {
      results = await trendingTmdb(page, media);
    }
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "catalog error";
    // Graceful: callers fall back to the curated catalog if this fails.
    return NextResponse.json({ results: [], error: message }, { status: 200 });
  }
}
