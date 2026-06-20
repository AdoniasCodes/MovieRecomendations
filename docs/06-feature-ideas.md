# 06 · Feature Ideas & Build Phasing

## Ideas that make it genuinely memorable / addictive
Beyond the brief — the stuff that turns a tool into a ritual:

1. **Veto tokens** — each partner gets a limited weekly "hard no" they can spend to kill a pick instantly. Makes negotiation playful and bounded.
2. **The Tiebreaker** — when you can't agree, app picks between *your two top* contenders with a dramatic 3-2-1 reveal. Removes the final standoff.
3. **"Worth it?" pings** — async mode: one partner watches solo, taps a quick verdict; the other gets a "she says watch it / skip it" nudge. Great for long-distance / different schedules.
4. **Mood memory** — learns "Sunday = comfort watch, Friday = intense" and pre-tunes Tonight's Pick by day/time.
5. **Two-truths taste calibration** — instead of rating 20 movies, a fun "this or that" poster duel that sharpens the model and feels like a game.
6. **Cliffhanger tracker** — for series in progress, a gentle "you're 2 episodes from the S2 finale" nudge.
7. **Shared reaction stickers** — drop timestamped reactions on a title ("🤯 the reveal"), building a private inside-joke layer over your watch history.
8. **Date Night Mode** (brief's future feature) — full evening plan: pick + runtime + suggested start time so it ends before bed + snack pairing + optional dim-the-lights checklist.
9. **Streaks** — "watched together 3 nights this week." Light, not naggy.
10. **Blind Match** — both privately pick 3; app reveals only the overlap. Pure dopamine.
11. **"Because you finished X"** smart re-engagement — next-day suggestion riffing on what you just completed.
12. **Couple taste DNA** — a visual "we are 72% crime, 18% sci-fi…" identity card, shareable, evolves over time.
13. **Anti-recommendations** — "you'll probably hate this, here's why" — honesty builds trust and is weirdly fun.
14. **Where-to-watch** — TMDB watch-providers so a pick is actually actionable ("on Netflix").

## Phasing — how I'd build it

### Phase 0 — Foundation
Next.js + TS + Tailwind + shadcn scaffold · Supabase project · schema + RLS · TMDB fetch/cache layer · auth · couple pairing · design system & tokens.

### Phase 1 — Prove the wedge (the vertical slice)
Mood quiz → recommendation engine (v1 scoring + templated "why") → swipe deck → **Together-mode Match** → shared watchlist with realtime. Tonight's Pick / Surprise Me / Randomizer. **This is the demo that has to feel magical.**

### Phase 2 — The relationship layer
Watch status tracking · ratings · private notes + shared comments · activity feed (realtime) · collections.

### Phase 3 — AI & delight
Claude assistant (chat → result cards) · AI-written "why" explanations · Hidden Gems / Classics We've Missed rails · Date Night Mode.

### Phase 4 — Retention & flex
Stats dashboard · achievements · streaks · Couple Taste DNA · Yearly Recap (Wrapped).

### Phase 5 — Extra spice
Veto tokens · Tiebreaker · Blind Match · "Worth it?" async · mood memory · where-to-watch.

## What I'd recommend for the *first* build
Phase 0 + Phase 1 as one cohesive, beautiful slice — real auth, real TMDB data, real realtime match. It's the smallest thing that proves the whole concept and is genuinely fun on night one. Then we iterate phase by phase.
