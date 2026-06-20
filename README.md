# 🎬 MovieMatch (working name)

A premium, couples-first movie & series discovery platform. Less "database of movies," more "personal recommendation engine built for two people who can never decide what to watch."

> Built for fun. Panda's project.

## The one-line pitch
Tinder-for-movies × Letterboxd × Apple TV+ polish — a shared entertainment hub where two people swipe, match, and get mood-based recommendations with an AI that explains *why*.

## Status
🟢 **Phase 0+1 vertical slice built & running on mock data.**

## Run it
```bash
npm install
npm run dev
# open the printed URL (http://localhost:3000, or next free port)
```
Everything runs on seeded mock data — no accounts or API keys needed. State persists in `localStorage`.

### What's live in the slice
- **Tonight / Home** — Tonight's Pick hero, Surprise Me / Randomize / Discovery, Hidden Gems & Classics rails, partner activity peek
- **Discover** — mood quiz (feeling → context → vibe → era → commitment → energy) → swipe deck (drag/like/pass/save/seen + undo)
- **The Match** — Together-mode swipes trigger a live "IT'S A MATCH" reveal via a **simulated partner** (Amore), auto-added to Matches + tonight's shortlist
- **Watchlist & Matches** — segmented (Matches / Saved / Planning / Watching / Finished), status pills
- **Us** — couple stats, taste-DNA bars, computed achievements, realtime-style activity feed
- **Profile** — taste seed, do-not-want, couple invite code, reset
- **Amore AI** — floating concierge that turns natural-language asks into rec cards (mock engine; real Claude wiring next)
- **Title detail sheet** — cinematic, with "why recommended", vote/save/status/rate

### Next up (wiring real backend)
See [`docs/07-backend-wiring.md`](docs/07-backend-wiring.md) — Supabase schema migration, auth + real couple pairing, TMDB ingestion, Realtime channels, and swapping the mock partner for a real second account.

## Planning docs
1. [Product Strategy](docs/01-product-strategy.md) — vision, positioning, the wedge, success metrics
2. [Information Architecture](docs/02-information-architecture.md) — navigation, screen map, data flow
3. [Screen Designs](docs/03-screens.md) — every major screen, layout & interactions
4. [Database Schema](docs/04-database-schema.md) — Supabase/Postgres tables, RLS, relationships
5. [User Flows](docs/05-user-flows.md) — onboarding, discovery, match, watch tracking
6. [Feature Ideas](docs/06-feature-ideas.md) — what makes it genuinely addictive

## Tech stack
- **Frontend:** Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Framer Motion
- **Backend/DB/Auth:** Supabase (Postgres + Auth + Realtime + Edge Functions)
- **Movie data:** TMDB API
- **AI:** Claude (Anthropic) for the recommendation assistant & explanations

## Design north star
Dark-mode-first · cinematic · glassmorphism accents · poster-forward · buttery 60fps micro-interactions · mobile-first responsive.
