# context.md — Amore Movies

> Living memory of this project. Read this first every session. Update it whenever something
> meaningful changes (a feature ships, a decision is made, the plan shifts). Pair with
> `instructions.md` (the reusable how-to playbook).

_Last updated: 2026-07-06. Phase 6 SHIPPED (real two-user UX: identity picker, honest presence,
watch-along invite card, Movie/Series filter, shared AI chat, cleanup). Build clean, migration
0003 applied to the live DB (verified), pushed and deployed. See handoff.md._

> Dev server note: the app currently serves on **http://localhost:3000** (it took 3000 after the
> other local project's server stopped). Next picks the next free port — confirm via the page title.

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
- **Dev server:** `pnpm run dev` → currently **http://localhost:3001/** (Next picks next free
  port; 3000 was taken by another project). `pnpm run build` for type-check.

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

## 5b. Phase 3 — "Live & together" (STARTED)

Shipped this round (verifiable, no external accounts needed):
- [x] **Real AI ON** — Gemini key wired (`.env.local`, gitignored). Default model **gemini-2.5-flash**
      (2.0-flash had 0 free quota on this project). Header auth (`x-goog-api-key`), `thinkingBudget: 0`
      for speed, 20s timeout, local fallback intact. Verified `source: "gemini"`.
- [x] **Watch-Along** — `WatchSession` + `Reaction` in the store (realtime-ready seam). Full-screen
      "Together Tonight" view (`components/watch/WatchParty.tsx`): live presence avatars, reaction
      stream, quick-emoji + message input. Simulated Amore joins ~1.6s in and reacts on a 7s timer.
      Started from the TitleSheet ("Start watch-along with Amore"). Mounted globally in providers.
- [x] **Presence** — `herOnline` in store; green "Amore is online" dot on the Tonight header + the
      watch-along avatars. Simulated now; swap for Supabase Realtime presence later.
- [x] **PWA** — `app/manifest.ts`, `public/icon.svg` + `icon-maskable.svg`, `public/sw.js`
      (offline shell, prod-only via `RegisterSW.tsx`), `/offline` route, apple-web-app meta.
      Installable on phones.

LIVE BACKEND (credentials received — project `oodgafejoecyabvrhhew`, eu-west-1):
- [x] **Schema applied** to the live project: `0001_init.sql` (12 tables, RLS on all, realtime on
      notifications/matches/watch_sessions/reactions) + `0002_pairing_rpc.sql` (SECURITY DEFINER
      `ensure_profile` / `create_couple` / `join_couple`). Apply via the eu-west-1 pooler:
      `psql -h aws-0-eu-west-1.pooler.supabase.com -p 5432 -U postgres.oodgafejoecyabvrhhew -d postgres`.
      (Direct `db.<ref>.supabase.co` is IPv6-only and unreachable here — use the pooler.)
- [x] **TMDB real posters** — `scripts/fetch-posters.mjs` → `lib/posters.ts`; 54 titles show real art.
- [x] **Real AI** — Gemini on (gemini-2.5-flash).
- [x] **Auth + couple pairing** — `lib/auth.tsx` (email-OTP sign-in; mailer_autoconfirm is OFF so we
      use 6-digit codes), profile/couple bootstrap, pairing UI in Profile (`components/auth/GoLive.tsx`).
      AuthProvider wraps the app; **demo mode stays the default** (login is optional & additive).
      Verified end-to-end by `scripts/verify-pairing.mjs` (create/join/RLS/isolation all pass).
- [x] **Live data sync + realtime** (`lib/live.ts`) — when signed-in + paired, the store routes every
      mutation to Supabase and re-hydrates from a Realtime refetch (debounced 250ms); presence via a
      Realtime presence channel; matches form for real (`pushVoteAndMaybeMatch` — only when Hermi has
      also liked). Simulated Hermi is disabled in live mode (vote sim + WatchParty timers guarded by
      `store.live`). The "me"/"her" semantic ids translate to/from auth uuids at the `lib/live.ts`
      boundary, so the reducer + all UI are unchanged. AuthProvider auto-detects Hermi joining
      (subscribes to `couple_members`) so Panda flips to live without a reload.
      Verified end-to-end by `scripts/verify-live.mjs` (save / vote→match / watched / note / session +
      reactions / RLS isolation all pass between two real users).
- [x] **Real second account** — Hermi signs in on her device + joins via the couple code; her real
      votes/reactions now drive matches & watch-along.

### Live-mode notes / known gaps
- "live" = signed in AND paired (both members present). Solo-signed-in (couple created, partner not
  joined yet) stays in demo/localStorage; data starts syncing once Hermi joins.
- `activity` feed (/us) isn't synced to Supabase yet — it's rebuilt locally and resets on refetch in
  live mode. Low priority. The match overlay fires for the partner who *completes* the match
  (the other sees it appear in Matches via refetch).
- Demo data (localStorage) is preserved untouched while live; sign out → demo returns.

### Partner identity
PARTNER is **Hermi** 💞 (`id: "her"`) — pet names Mi Amore / LOML. Brand stays "Amore Movies".

## 5c. Phase 5 — "Real & frictionless" (✅ SHIPPED, deployed on Netlify)

Deployed to **Netlify** (not Vercel/cPanel — SSR + API routes need a Node runtime).
Repo `AdoniasCodes/MovieRecomendations`, auto-deploys from `main`. `netlify.toml` +
`@netlify/plugin-nextjs`. Gotcha: Netlify blocks Next.js versions hit by CVE-2025-55182 —
keep `next` >= 15.5.19. Secret-scan exempts `GEMINI_MODEL` (a model name, not a secret).

- [x] **Live TMDB catalog** — real search / trending / genre-browse over the full TMDB
      database. `lib/tmdb.ts` (server, maps TMDB→our `Title`, infers violence/cerebral/
      international, excludes Bollywood+adult) → `app/api/catalog` → `lib/catalog.ts` (client,
      registers results). A runtime **title registry** in `lib/mock-data.ts` makes `getTitle()`
      resolve live titles everywhere; saved ones persist (`localStorage["amore-movies/catalog"]`).
      Curated 54 still power the personalized rec engine; live catalog powers discovery.
      UI: Discover has **Browse** (search + trending + genre rails) and **Mood match** tabs.
- [x] **Pick-who-you-are + PIN login (no email)** — `components/auth/PinLogin.tsx`: tap
      "I'm Panda"/"I'm Hermi" + a 4-digit PIN (**9009**) → `auth.signInWithPin` does a Supabase
      **password** sign-in (PIN→password `amore-<pin>`, see `lib/pin-accounts.ts`). Two accounts
      `panda@amoremovies.app` / `hermi@amoremovies.app` are **pre-created + pre-paired**
      (couple AM-427CD) by `scripts/setup-pin-accounts.mjs` (idempotent, run once). Signing in
      flips straight to **live mode** — real cross-device sync, real matches. Replaces the email-OTP
      card in Profile (OTP code paths remain in `lib/auth.tsx` but are no longer surfaced).

## 5d. Phase 6 — "Real two-user UX" (SHIPPED 2026-07-05/06)

Root-caused and fixed the user-management complaints, plus two features and a cleanup pass:

- [x] **Display identity** (`lib/identity.ts`): the app now knows who is holding the phone.
      Whoever signs in sees their own name/emoji everywhere (header, profile, notifications,
      watch-along, AI greeting). Semantic ids "me"/"her" unchanged; only display swaps.
- [x] **Welcome gate rework**: the Panda/Hermi picker shows on EVERY app open. PIN (9009) only
      when no session exists for the picked identity; picking the other identity signs the old
      session out first. "Just browse" anonymous mode removed. Splash no longer haunts navigation
      (and the fake 1.4s Discover loader is gone).
- [x] **1h idle re-lock** (`lib/activity.ts`): activity (taps/keys/visibility) is tracked,
      throttled to one localStorage write per 30s. After 1h idle the gate re-shows the picker
      (one tap back in, no PIN) and the presence heartbeat stops so the partner sees you offline.
- [x] **Honest presence**: heartbeat re-track every 60s while visible + active; partner counts as
      online only if their stamp is under 2.5 min old; leave events, tab hide, and pagehide untrack.
      No more "Amore is online" lies.
- [x] **Watch-along resurrection fixed**: partner-started sessions show an invite card (Join /
      Later), never a takeover; Later and Cancel are permanent per device (`lib/session-prefs.ts`);
      startSession retires previous active rows; endSession closes ALL active rows; stale rows
      (>4h) never hydrate; the reactions realtime listener is couple-filtered; demo mode no longer
      persists sessions across reloads. Migration: `supabase/migrations/0003_sessions_ai.sql`.
- [x] **Movie/Series filter**: Both/Movies/Series segments on Discover Browse (drives the TMDB
      fetchers server-side) and Watchlist (client-side); the mood-quiz commitment answer is now a
      HARD media filter for movie / mini-series / full-series picks.
- [x] **Shared AI chat**: `ai_messages` table + `store.askAi` named action; the Gemini thread is
      couple data, both partners see it live with author attribution, partner gets a bell
      notification; last 100 messages kept; works offline/demo via localStorage.
- [x] **Cleanup**: dead email-OTP path deleted (GoLive.tsx + auth methods), API.rtf (plaintext key)
      deleted, profile Reset now clears all app localStorage keys, `server-only` pinned,
      `outputFileTracingRoot` set, couple.jpg compressed 444K→285K, em dashes swept from all
      user-visible copy. `icon-512.png` still ~480K (needs pngquant; low priority, loads once).

## 5e. Phase 7 — "After Dark" (SHIPPED 2026-07-06)

18+ couple's dice game, reachable from Profile ("After Dark 18+" card, not in the bottom nav).
Fully client-side and isolated: `lib/afterdark/engine.ts` (pure state machine), `lib/afterdark/deck.ts`
(112 cards, 4 heat levels: Spark flirting / Tease foreplay / Fire intimate / Ember light-BDSM),
`components/afterdark/AfterDarkGame.tsx`, route `app/after-dark/page.tsx`. Design decisions:
- Cards carry `require` (clothing min/max per player, blindfold/restraint flags) + `effects`
  (strip one, blindfold, restrain...). The engine only draws valid cards, so the random flow
  always makes physical sense. 18% of draws dip one heat below for variety. Repeat window 10.
- Hard limits live in the CONTENT, not in checks: nothing anal (butt massage yes), no third
  parties, rough stuff only at heat 4. Consent UX: gate screen on every entry, blocking Pause
  check-in modal, 3 skips per player, heat rises only via a both-hold-3-seconds button.
- No store.tsx involvement, no Supabase, no localStorage state (a night is ephemeral on purpose).
- Verified: clean `pnpm run build`; 2000-game simulation (120k draws) with 0 constraint violations.

## 5f. Phase 8 — "Fix the couple loop" (SHIPPED 2026-07-09)

Three investigated root causes (multi-agent audit), all fixed:
- **Boot hang**: `lib/auth.tsx` boot was a bare `.then()` with six serial un-timed Supabase
  calls; any stall pinned `loading=true` forever ("Warming up"). Now: getSession raced against
  5s, loadAll against 8s, try/catch/finally always clears loading, onAuthStateChange also
  clears it, and WelcomeGate unlocks the button after 5s regardless.
- **Status/ratings sync**: `watchlist`, `watched`, `votes`, `notes` were never in the
  supabase_realtime publication (0001 only added notifications/watch_sessions/reactions/matches),
  so partner changes fired no event. Fixed in migration 0004. Also the `status` reducer only
  mapped existing watchlist rows (no-op on unsaved titles); it now inserts like `cinema` does.
  The "watched-by disables status" theory was disproven: pills were never disabled, just no-oping.
- **Notifications**: data pipeline was already correct (nudge inserts a notifications row with
  the partner's uuid; realtime + refetch deliver it). What was missing was ALERTING. Added:
  web push (sw.js `push`/`notificationclick` handlers, cache bumped amore-v2; `app/api/push`
  route sends via `web-push` npm using VAPID keys from env, caller JWT + RLS scopes it to the
  couple; `push_subscriptions` table in 0004; `lib/push.ts` subscribe/refresh helpers;
  `EnableAlerts` profile card with blocking error modals) and in-app alerts (NotificationsBell
  vibrates + slide-in banner when unread rises while panel closed). `push.notify` in live.ts
  fire-and-forgets `/api/push` so ALL notification types knock. Sender gets an optimistic echo.
- Email channel deliberately not built: Supabase mailer = auth emails only (source of Panda's
  rate-limit errors). Resend is the path if email is ever really wanted.
- VAPID keys live in `.env.local` + `.env.netlify.local` (gitignored). Netlify needs them
  imported + redeploy; migration 0004 needs manual apply. Until both, everything degrades
  gracefully (503 from /api/push, "unsupported" from enablePush).

## 5g. Phase 9 — "Diagnose + cleanse" (SHIPPED 2026-07-10)

Panda reported dead drawer taps, big slowdown, missing nudges, partner always offline.
Root causes found by parallel audits + a real two-user Playwright E2E against a local
production build (both accounts signed in, real Supabase):
- **Lazy supabase-js builders**: every fire-and-forget `push.*` mirror (nudge, save,
  status, note, AI message, endSession, readNotifs...) built a query but never sent it,
  because PostgrestBuilder only executes when awaited/then'd. `run()` wrapper in live.ts
  now forces execution. THE golden rule is in instructions.md §8a.
- **Stuck banner over the drawer**: Phase 8's in-app banner rendered at z-55 above the
  TitleSheet (z-50) and could lose its dismiss timer (cleanup-without-reschedule when
  unread changed). Timer now keyed to the banner state; banner moved to z-45.
- **Self-echo refetch storm**: 0004's realtime publication meant own writes echoed back,
  each one a debounced 8-query refetch + full re-render. Table-level 4s suppression added;
  foreign (partner) events still refetch; visibilitychange reconcile covers missed events.
- Also: loadAll boot dedup, SW cache-first navigations (amore-v4), error boundaries,
  fetch timeouts, "undefined seasons" fallback, image compression, pinned-registry cap,
  AfterDark timer cleanup.
E2E verified: presence both ways, nudge lands as DB row + banner in under 2s, banner
auto-dismisses at 8s, drawer fully clickable underneath, 0 self-refetches, partner
actions refetch, SPA navs 33-190ms, SW cached reload 122ms.

## 5h. Phase 10 — "Watch-along that remembers" (SHIPPED 2026-07-11)

Watch-alongs became durable couple records: resumable while active (invite card on
re-entry, minimize-to-chip, notification tap rejoins), conversations browsable in
Us > Watchalongs, lifecycle status (in_progress/completed/dropped) set from a blocking
"Wrap up" modal inside the party, and per-record delete (cascades the conversation).
Key decision: per-mount UI state (accepted/minimized) lives in lib/party-ui.ts, a tiny
external store OUTSIDE the store seam, because store hydration replaces state wholesale
on every realtime refetch and must not reset what this device has open. Migration 0005
adds watch_sessions.status; all writes fall back gracefully until it is applied.

## 5i. Phase 11 — "The Smooth Update" (SHIPPED 2026-07-12)

Plan-approved orchestrated iteration (multi-agent: Haiku cosmetics, Sonnet plan UI,
Opus x2 for After Dark + learning engine, Fable architect/judge). Fixed at root cause:
splash-on-every-tab (v4 SW cached RSC/shell cache-first; v5 caches only immutables,
navigations network-first), soft welcome gate (fresh session + <1h activity enters
directly), phone push (VAPID key was never in the client bundle; now served at runtime
by GET /api/push, enable flow rebuilt for iOS gesture rules + subscription-truth UI),
synced activity feed (activity table, 0006), match overlay on both devices, deck
opacity + era chip contrast. New: watch night planning (watch_plans table, PlanPicker,
UpcomingPlans, atomic one-shot reminder), learning taste engine (RecOptions.learned,
damped n/(n+20)), offline write queue (lib/write-queue.ts + queuedMirror in live.ts),
After Dark envelopes/rarity/persistent stats. Critical lesson recorded in
instructions.md §8c: realtime channels die wholesale if ANY subscribed table is
missing; new tables must ride a separate channel until their migration is applied.

## 6. Deferred (later)
- Push notifications (web-push) once PWA is installed + a backend exists to send them.
- Richer watch-along (synced playback position, video provider deep-links).
- See `docs/07-backend-wiring.md` + `supabase/README.md`.

## 7. Conventions / gotchas
- **Never** put real API keys in the repo — use `.env.local`.
- **Never** break the `store.tsx` named-action seam.
- No `Date.now()` in render paths that affect SSR — store uses a monotonic `useClock()` base to
  avoid hydration mismatch. Keep new time logic on the same pattern.
- Always call the user **Panda**.
