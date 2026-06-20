import { NextResponse } from "next/server";
import { getAssistant } from "@/lib/ai";
import type { Audience } from "@/lib/recommend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { query, audience } = (await req.json()) as {
      query?: string;
      audience?: Audience;
    };
    if (!query?.trim()) return NextResponse.json({ error: "query required" }, { status: 400 });
    const result = await getAssistant(query, audience ?? "together");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
