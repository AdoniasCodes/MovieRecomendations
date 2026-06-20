# 07 · Backend Wiring (next phase)

The slice runs on mock data + a simulated partner. To make it real and shared, swap the mock layer for Supabase + TMDB. The component tree doesn't need to change — only `lib/` does.

## What stays vs. changes
| Layer | Now (slice) | Real |
|---|---|---|
| Titles | `lib/mock-data.ts` | TMDB API → cached in `titles` table |
| State | `lib/store.tsx` (localStorage) | Supabase tables + Realtime |
| Partner | simulated (`partnerAffinity`) | real second account, live votes |
| Auth | none | Supabase email auth + couple pairing |
| AI | `lib/recommend.ts` heuristic in `AssistantButton` | Claude API call with couple context |

## Steps
1. **Supabase project** → create, grab `NEXT_PUBLIC_SUPABASE_URL` + `ANON_KEY` into `.env.local`.
2. **Schema** → migrate the tables in [`04-database-schema.md`](04-database-schema.md); add RLS policies (couple-scoped) and the match-detection trigger.
3. **TMDB** → `TMDB_API_KEY` in env; server route/Edge Function fetches `discover`/`search`, upserts into `titles`, maps to the `Title` type (real `posterPath` fills the procedural posters automatically — `Poster.tsx` already prefers it).
4. **Auth + pairing** → replace `ME`/`PARTNER` constants with the session user + partner via `couple_members`; build the invite-code accept flow (UI already mocked in Profile).
5. **Realtime** → subscribe to `watchlist_items`, `votes`, `matches`, `activity_events` filtered by `couple_id`; dispatch into the same reducer actions already in `store.tsx`.
6. **Drop the simulator** → in `vote()`, stop synthesizing the partner vote; the Match fires when the *real* partner's `like` row lands and the trigger inserts a `matches` row.
7. **Claude AI** → replace `answer()` in `AssistantButton.tsx` with an API route calling Claude (`claude-opus-4-8` or `claude-sonnet-4-6`), passing both taste profiles + watch history + watchlist as context; keep rendering replies as rec cards.

## Keep the seam clean
`store.tsx` already centralizes every mutation behind named actions (`save`, `vote`, `setStatus`, …). Point those at Supabase writes and feed Realtime events back through the reducer — the screens won't know the difference.
