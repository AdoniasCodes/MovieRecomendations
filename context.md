# context.md — Amore Movies

> Living memory of this project. Read this first every session. Update it whenever something
> meaningful changes (a feature ships, a decision is made, the plan shifts). Pair with
> `instructions.md` (the reusable how-to playbook).

_Last updated: 2026-06-20 — Phase 2 ("Make it ours") SHIPPED. Build clean, all routes 200._

---

## 1. The idea

A **couples-first** movie & series discovery app for **Panda (🐼)** and **Amore (💞)**.
Tinder-for-movies × Letterboxd × Apple TV+ polish. Two people swipe, match, get mood-based
recommendations, and an AI that explains *why*. Dark-mode-first, cinematic, mobile-first, 60fps.

The wedge: **deciding what to watch as a couple is hard.** This makes it fun and fast, and it
respects that the two of us have *different* tastes that must be reconciled, not averaged into mush.

## 2. Who we are (the taste brief — drives everything)

This is the heart of the personalization. The recommendation engine must respect it.

**Panda (me, `id: "me"`)**
- Crime / psychological-thriller / mystery / detective / dark drama.
- **Fine with blood, gore, brutal action** (John Wick, The Boys). Sometimes prefers it.
- Loved titles seed: True Detective, Mindhunter, Breaking Bad, Dark, Severance, Fargo,
  Prisoners, Zodiac, Se7en, The Boys.

**Amore (her, `id: "her"`)**
- **Dislikes blood / gore / heavy action.** This is a hard filter for her and for "together".
- Loves **wholesome**: animation, comedy, drama, feel-good.
- Crime is OK **only if low-violence and cerebral** — outsmarting-the-detective, the *mental*
  game, not the carnage.
- Loves **international** film: Turkish, Korean, Japanese, Chinese. Not just Hollywood.
- **Neither of us likes Bollywood / Indian cinema → exclude it.**

**Together mode** = blend both tastes BUT hard-filter high gore/violence (Amore's rule wins),
lean toward cerebral crime, wholesome, and international titles.

## 3. Tech stack & architecture

- **Next.js (App Router) · TypeScript · Tailwind · Framer Motion.** Mobile-first centered
  column (`max-w-md`). Dark glass design system, violet→magenta accent (`bg-accent-gradient`).
- **State:** everything runs on **mock data + `localStorage`** (no Supabase/keys yet).
- **Dev server:** `npm run dev` → currently **http://localhost:3001/** (Next picks next free
  port; 3000 was taken by another project). `npm run build` for type-check.

### Where things live (the seams)
- `lib/types.ts` — all shared types.
- `lib/mock-data.ts` — `ME`, `PARTNER`, `TASTE_SEED`, the `TITLES[]` catalog (TMDB-shaped),
  `getTitle(id)`. IDs look like `"movie:603"` / `"tv:1396"`.
- `lib/recommend.ts` — **pure** scoring engine + "why" strings. Public API:
  `recommend()`, `scoreTitle()`, `tonightsPick()`, `surpriseMe()`, `hiddenGems()`, `classics()`.
- `lib/store.tsx` — **single source of truth** (reducer + localStorage). THE ACTION SEAM:
  every mutation goes through a named action (`save`, `vote`, `setStatus`, `rate`, …). The
  simulated partner (Amore) lives in `vote()` via `partnerAffinity()`. **Swap this layer for
  Supabase later and screens won't change.** Do not break this seam.
- `lib/title-sheet.ts` — tiny external store for the global title-detail sheet (open/close by id).
- `lib/quiz-options.ts` — option lists for the mood quiz.
- `app/` — routes: `/` (Tonight), `/discover`, `/watchlist`, `/us`, `/profile`. `providers.tsx`
  mounts StoreProvider + BottomNav + AssistantButton + MatchOverlay + TitleSheetHost.
- `components/` — `ui/` (Button, Poster, PosterCard), `discover/` (MoodQuiz, SwipeDeck,
  MatchOverlay), `title/TitleSheet`, `ai/AssistantButton`, `nav/BottomNav`.

## 4. What's BUILT (Phase 0 + 1 — done, on mock data)

- **Tonight (`/`)** — Tonight's Pick hero, Surprise Me / Randomize / Discovery, partner-activity
  peek, rails: Matches, Continue watching, Hidden gems, Classics. Finished titles excluded.
- **Discover (`/discover`)** — mood quiz (feeling→context→vibe→era→commitment→energy) → swipe
  deck (drag / like / pass / save / seen + undo).
- **The Match** — in Together mode, a positive swipe simulates Amore reacting (`partnerAffinity`);
  on mutual like → "IT'S A MATCH" overlay, auto-added to matches + shared watchlist.
- **Watchlist & Matches (`/watchlist`)** — filters: Matches / All saved / Planning / Watching /
  Finished.
- **Us (`/us`)** — couple stats (hours, matches, completed), taste-DNA bars, computed
  achievements, activity feed.
- **Profile (`/profile`)** — taste seed, do-not-want, couple invite code, reset.
- **Amore AI (floating button)** — natural-language → rec cards. **Currently a local keyword
  engine** (`answer()` in AssistantButton), NOT a real AI yet.
- **Title detail sheet** — backdrop, "why recommended", like/save/pass, status pills, 5-star
  rating (mine only).

## 5. Phase 2 — "Make it ours" (✅ SHIPPED)

Goal: bend the whole app around the real taste brief (§2) and add the couple-utility features
Panda asked for. All delivered:

- [x] **A. Data model** — `Title` now has `violence` (0–5), `cerebral`, `country`, `language`,
      `international`. New types: `WatchedRecord` (per-person + optional rating), `Note`,
      `Notification`, `cinema` flag on `WatchlistItem`, `Watcher = "me"|"her"`. (`lib/types.ts`)
- [x] **B. Catalog** — added KR/JP/TR/CN + wholesome/animation titles (Your Name, Spirited Away,
      Crash Landing on You, Reply 1988, Decision to Leave, Shoplifters, Miracle in Cell No. 7,
      Knives Out, Sherlock, Klaus, Coco, Up, Howl's, A Silent Voice, Hi Mom, Better Days, …).
      Every title tagged `violence`/`country`. Bollywood excluded by `EXCLUDED_COUNTRIES`.
      Per-person profiles: `TASTE_PANDA` / `TASTE_AMORE` (+ `TASTES` map). (`lib/mock-data.ts`)
- [x] **C. Engine** — `audienceOf()`, `tooViolentForHer()`, hard filters (gore for her+together,
      Bollywood), soft nudges (international/wholesome/cerebral boosts, Panda gets crime boost).
      New `similarTitles()`. `tonightsPick` is now a couple-blend (no forced dark). (`lib/recommend.ts`)
- [x] **D. Store** — actions: `markWatched`/`unwatch`, `rateAs`, `addNote`/`deleteNote`,
      `toggleCinema`, `nudge`, `markNotifsRead`. Amore sim now REUSES the engine (audience "her")
      so she rejects gore. My actions emit notifications to her; `maybeReply()` makes her reply
      ~45% so the bell gets incoming traffic. Storage key bumped to `amore-movies/v2`. (`lib/store.tsx`)
- [x] **E. UI** — TitleSheet: **Similar movies** (with For-us/Me/Her audience toggle), **Watch in
      cinema** toggle, **Nudge Amore**, **watched (Me/Amore)**, **notes** add/list/delete, violence
      + cerebral + international badges, Amore's rating badge. Watchlist: **Cinema** filter +
      **Watched** browser with who-watched (Both/Me/Amore) sub-filter (the rewatch shelf).
      **NotificationsBell** FAB + panel (stacked above the AI FAB). Assistant → real API.
- [x] **F. Free AI** — `app/api/similar` + `app/api/assistant` route handlers call **Gemini**
      server-side (`lib/ai.ts`, key from `GEMINI_API_KEY`) with **graceful local-engine fallback**
      (verified working with NO key). `.env.example` documents setup. See instructions.md §5.

### How to turn on real AI (currently running on the local fallback)
Copy `.env.example` → `.env.local`, set `GEMINI_API_KEY` (free at aistudio.google.com/apikey),
restart dev. With no key the app already works — similar/assistant just use the local engine.

### Decisions behind Phase 2
- **Why per-person watched (not one global "seen"):** Amore rewatches a lot; we need a list
  filterable by who watched, so each can browse the other's watched titles and pick a rewatch.
- **Why notes:** lightweight reminders per title ("check it out", "amazing", "rewatch") that
  persist and nudge us later.
- **Why a separate "cinema" flag (not a status):** some titles we specifically want to see in a
  theater — it's orthogonal to planning/watching status, so it's its own toggle + filter.
- **Why notifications are local for now:** no real backend, so "both online" presence isn't real.
  Phase 2 ships a local notification feed (my actions generate notifications; Amore sim can too).
  Real cross-device presence + nudges + watch-along = **Phase 3** (needs Supabase Realtime / PWA).
- **Why Gemini for AI:** most generous free tier, good at "movies like X" knowledge tasks. Local
  fallback keeps everything working with zero keys. (Groq is the fast alternative.)

## 6. Deferred (Phase 3+)
- Supabase migration (auth, real couple pairing, RLS), TMDB ingestion, real posters.
- Real-time presence + nudges + **watch-along** (text together while watching).
- **PWA** (installable, push notifications).
- Swap the simulated partner for a real second account.
- See `docs/07-backend-wiring.md`.

## 7. Conventions / gotchas
- **Never** put real API keys in the repo — use `.env.local`.
- **Never** break the `store.tsx` named-action seam.
- No `Date.now()` in render paths that affect SSR — store uses a monotonic `useClock()` base to
  avoid hydration mismatch. Keep new time logic on the same pattern.
- Always call the user **Panda**.
