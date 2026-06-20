// Server-only AI helpers. Calls a free AI API (Google Gemini) when a key is
// present, and ALWAYS degrades to the local pure engine when it isn't — so the
// app works with zero keys and "lights up" the moment GEMINI_API_KEY is set.
// See instructions.md §5 for the reuse pattern.

import { TITLES, getTitle } from "./mock-data";
import { recommend, similarTitles, type Audience } from "./recommend";
import type { QuizAnswers, Vibe } from "./types";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export interface Pick {
  title: string;
  year?: number;
  reason: string;
  id?: string; // set when we can map it onto our catalog (so the sheet opens)
  inCatalog: boolean;
}
export interface AIResult {
  source: "gemini" | "local";
  intro: string;
  picks: Pick[];
}

export const TASTE_BRIEF = `This is for a couple, Panda and Amore.
- Panda: loves crime, psychological thrillers, mystery, detective, dark drama. Totally fine with blood, gore, and brutal action.
- Amore: loves wholesome — animation, comedy, heartfelt drama, romance. DISLIKES blood/gore/brutal action. Crime is OK for her ONLY if low-violence and cerebral (outsmart-the-detective, the mental game). LOVES international cinema: Korean, Japanese, Turkish, Chinese.
- Neither likes Bollywood / Indian cinema — never suggest it.
- "Together" picks must avoid gore and brutal action (Amore's rule wins), and lean cerebral, wholesome, or international.`;

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}
const BY_NAME = new Map(TITLES.map((t) => [normalize(t.title), t.id]));
function matchCatalog(title: string): string | undefined {
  return BY_NAME.get(normalize(title));
}

async function geminiJSON(prompt: string): Promise<unknown | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": key },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: TASTE_BRIEF }] },
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            responseMimeType: "application/json",
            // 2.5-flash is a reasoning model; disable thinking so it answers fast
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
        // free tiers can be slow; don't hang forever
        signal: AbortSignal.timeout(20000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function decoratePicks(raw: { title: string; year?: number; reason: string }[]): Pick[] {
  return raw
    .filter((p) => p && p.title)
    .slice(0, 8)
    .map((p) => {
      const id = matchCatalog(p.title);
      return {
        title: p.title,
        year: p.year,
        reason: p.reason || "A great fit for you two.",
        id,
        inCatalog: !!id,
      };
    });
}

// ---- Similar movies -------------------------------------------------------

export async function getSimilar(titleId: string, audience: Audience): Promise<AIResult> {
  const ref = getTitle(titleId);
  const who =
    audience === "her" ? "for Amore" : audience === "me" ? "for Panda" : "for them to watch together";

  if (ref) {
    const prompt = `Suggest 6 movies or series similar to "${ref.title}" (${ref.year}), ${who}.
They liked it for its ${ref.genres.join(", ")} and a ${ref.vibes.join("/")} feel.
Return ONLY JSON of shape {"picks":[{"title":string,"year":number,"reason":string}]}. Each reason <= 16 words.`;
    const json = (await geminiJSON(prompt)) as { picks?: { title: string; year?: number; reason: string }[] } | null;
    if (json?.picks?.length) {
      return { source: "gemini", intro: `If you loved ${ref.title}, try these:`, picks: decoratePicks(json.picks) };
    }
  }

  // local fallback
  const local = similarTitles(titleId, audience, 6).map<Pick>((s) => ({
    title: s.title.title,
    year: s.title.year,
    reason: s.why,
    id: s.title.id,
    inCatalog: true,
  }));
  return {
    source: "local",
    intro: ref ? `More like ${ref.title}:` : "A few you might like:",
    picks: local,
  };
}

// ---- Assistant ------------------------------------------------------------

export async function getAssistant(query: string, audience: Audience): Promise<AIResult> {
  const prompt = `The user asked: "${query}".
Recommend up to 4 titles ${audience === "together" ? "for the couple to watch together" : audience === "her" ? "for Amore" : "for Panda"}.
Return ONLY JSON of shape {"intro":string,"picks":[{"title":string,"year":number,"reason":string}]}. intro <= 24 words, each reason <= 16 words.`;
  const json = (await geminiJSON(prompt)) as
    | { intro?: string; picks?: { title: string; year?: number; reason: string }[] }
    | null;
  if (json?.picks?.length) {
    return { source: "gemini", intro: json.intro || "Here's what I'd queue up:", picks: decoratePicks(json.picks) };
  }

  // local fallback — keyword → engine
  return localAssistant(query, audience);
}

function localAssistant(qRaw: string, audience: Audience): AIResult {
  const q = qRaw.toLowerCase();
  const a: QuizAnswers = { context: audience === "me" ? "alone" : "together", era: "any" };
  const vibes: Vibe[] = [];
  if (q.includes("dark")) vibes.push("dark");
  if (q.includes("thrill")) vibes.push("thrilling");
  if (q.includes("myster")) vibes.push("mysterious");
  if (q.includes("funny") || q.includes("comedy")) vibes.push("funny");
  if (q.includes("romant") || q.includes("love")) vibes.push("romantic");
  if (q.includes("cozy") || q.includes("wholesome") || q.includes("comfort")) vibes.push("cozy");
  if (q.includes("mind")) vibes.push("mind-blowing");
  a.vibe = vibes[0];
  if (q.includes("90s")) a.era = "90s";
  else if (q.includes("80s")) a.era = "80s";
  else if (q.includes("2000")) a.era = "2000s";

  const hidden = q.includes("hidden") || q.includes("gem") || q.includes("underrated");
  const classic = q.includes("classic") || q.includes("must");
  const aud: Audience = q.includes("for her") || q.includes("amore")
    ? "her"
    : q.includes("just me") || q.includes("for me")
      ? "me"
      : audience;

  const cards = recommend(a, { preferHiddenGems: hidden, preferClassics: classic, audience: aud }, 4);
  const lead = cards[0]?.title.title ?? "a few picks";
  const intro = hidden
    ? `A few under-the-radar picks you probably haven't seen — starting with ${lead}.`
    : a.vibe
      ? `Going for a ${a.vibe.replace("-", " ")} mood — ${lead} fits beautifully:`
      : `Based on your taste, here's what I'd queue up — ${lead} first:`;
  return {
    source: "local",
    intro,
    picks: cards.map<Pick>((s) => ({
      title: s.title.title,
      year: s.title.year,
      reason: s.why,
      id: s.title.id,
      inCatalog: true,
    })),
  };
}
