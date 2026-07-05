import { NextResponse } from "next/server";
import { getAssistant } from "@/lib/ai";
import type { Audience } from "@/lib/recommend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query, audience, asker } = (await req.json()) as {
      query?: string;
      audience?: Audience;
      asker?: "panda" | "hermi";
    };
    if (!query?.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });
    const result = await getAssistant(query, audience ?? "together", asker);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
