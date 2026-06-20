import { NextResponse } from "next/server";
import { getSimilar } from "@/lib/ai";
import type { Audience } from "@/lib/recommend";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { titleId, audience } = (await req.json()) as {
      titleId?: string;
      audience?: Audience;
    };
    if (!titleId) return NextResponse.json({ error: "titleId required" }, { status: 400 });
    const result = await getSimilar(titleId, audience ?? "together");
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
