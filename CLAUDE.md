# Amore Movies — project notes

Fun project (call the user **Panda**). Couples' movie/series discovery platform.

## Decisions locked
- **Name:** Amore Movies. **Users:** Panda (🐼) + Amore (💞).
- **First build:** Phase 0+1 vertical slice on **mock data** (no Supabase/keys yet).
- Real backend wiring is documented but deferred — see `docs/07-backend-wiring.md`.

## Architecture (where things live)
- `lib/mock-data.ts` — seeded TMDB-shaped titles (weighted to Panda's crime/thriller/mystery taste) + `ME`/`PARTNER`/`TASTE_SEED`.
- `lib/recommend.ts` — scoring engine + "why" strings; `tonightsPick`/`surpriseMe`/`hiddenGems`/`classics`.
- `lib/store.tsx` — single source of truth (reducer + localStorage). **All mutations go through named actions** (`save`, `vote`, `setStatus`, `rate`). The simulated partner lives in `vote()` (`partnerAffinity`). Swap this layer for Supabase later; screens won't change.
- `lib/title-sheet.ts` — global title-detail sheet store.
- `app/` — routes: `/` (Tonight), `/discover`, `/watchlist`, `/us`, `/profile`.

## Design system
Dark-first, glass, violet→magenta accent (`bg-accent-gradient`), procedural posters (`Poster.tsx` prefers real `posterPath` when present). Framer Motion everywhere. Mobile-first centered column (`max-w-md`).

## Run / verify
`npm run dev` (uses next free port if 3000 busy). `npm run build` for type-check. Build is clean as of slice completion.

## Don't
- Don't add real API keys to the repo. Use `.env.local`.
- Don't break the `store.tsx` action seam — it's what makes the Supabase swap painless.
