import { NextResponse } from "next/server";
import { searchTmdb, trendingTmdb, browseTmdb } from "@/lib/tmdb";

// Live catalog endpoint. ?type=search&q= | ?type=trending | ?type=browse&genre=
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "trending";
  const page = Number(searchParams.get("page") ?? "1") || 1;

  try {
    let results;
    if (type === "search") {
      results = await searchTmdb(searchParams.get("q") ?? "", page);
    } else if (type === "browse") {
      results = await browseTmdb(searchParams.get("genre") ?? "Drama", page);
    } else {
      results = await trendingTmdb(page);
    }
    return NextResponse.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "catalog error";
    // Graceful: callers fall back to the curated catalog if this fails.
    return NextResponse.json({ results: [], error: message }, { status: 200 });
  }
}
