# Amore Movies — project notes

Fun project (call the user **Panda**). Couples' movie/series discovery platform for Panda (🐼) and Hermi (💞). Deployed on Netlify from GitHub `AdoniasCodes/MovieRecomendations`, branch `main`.

## Decisions locked
- **Name:** Amore Movies. **Users:** Panda + Hermi, PIN login (two pre-paired Supabase accounts, see `lib/pin-accounts.ts`).
- **Identity UX:** the who-are-you picker shows on EVERY app open; PIN only when there is no session for the picked identity. No anonymous mode. 1 hour of inactivity re-shows the picker (no PIN) and drops you to offline for your partner.
- **Watch-along:** a partner-started session shows a small invite card, never a full-screen takeover. An ACTIVE session is never lost by leaving the app: re-entry re-offers it, "Later"/minimize collapse to a resume chip (per-mount state in `lib/party-ui.ts`), and its notification rejoins it. Sessions end only via the Wrap up modal (completed/dropped) and stay saved (with their conversation) in Us > Watchalongs until deleted.

## Architecture (where things live)
- `lib/identity.ts` — DISPLAY identity ("panda" | "hermi", persisted). Decides whose name/emoji renders as "me" vs "partner". Semantic ids stay `"me"`/`"her"` everywhere; `ME`/`PARTNER` in mock-data are id anchors only.
- `lib/store.tsx` — single source of truth (reducer + localStorage, demo mode) with the **named-action seam**: every mutation is a named store function. Never break this seam.
- `lib/auth.tsx` + `lib/live.ts` — live mode (signed in + paired): every action mirrors to Supabase, realtime changes trigger a debounced full refetch. uuid ↔ "me"/"her" translation happens ONLY in `lib/live.ts`.
- `lib/activity.ts` — user-activity timestamps (drives the 1h idle re-lock and the presence heartbeat).
- `lib/session-prefs.ts` — per-device dismissed watch-along ids (outside the store seam on purpose).
- `lib/recommend.ts` — pure scoring engine + "why" strings. `lib/tmdb.ts` + `app/api/catalog` — live TMDB catalog with a Movie/Series filter.
- `lib/ai.ts` + `app/api/assistant` — Gemini assistant with local fallback. The chat thread is couple-synced (`ai_messages` table, `store.askAi`).
- `app/` routes: `/` (Tonight), `/discover`, `/watchlist`, `/us`, `/profile`. `providers.tsx` mounts StoreProvider, WelcomeGate, WatchParty, BottomNav, AssistantButton, MatchOverlay, TitleSheetHost.

## Run / verify
`npm run dev` (usually port 3001; confirm via page title). `npm run build` for type-check. NEVER run build while dev is running (shared `.next`).

## Notifications: the follow-along rule (Panda's standing request, 2026-07-24)
Every action one partner takes that the other would want to know about MUST call
`push.notify` (which also fires the web push) and, where it fits the Us feed,
`push.activity`. When adding ANY new couple-visible feature, wire its notification in the
same commit. Types are free-form text in the DB; extend `NotificationType` + the bell's
ICON map. Nudges get the full `NudgeOverlay` takeover (bell banner is suppressed for
them); everything else gets the bell banner + badge.

## Don't
- Don't add real API keys to the repo. Use `.env.local` (gitignored).
- Don't break the `store.tsx` action seam or move uuid handling out of `live.ts`.
- NEVER call a supabase-js builder fire-and-forget: builders are lazy and only execute
  when awaited/then'd. Wrap mirrors in `run()` (see `lib/live.ts` + instructions.md §8a).
- Overlays: nothing interactive may render above the TitleSheet (z-50) except true
  takeovers (MatchOverlay/WatchParty z-60, AfterDark 70, EnableAlerts 80, WelcomeGate 100).
  Anything faded out via opacity-0 needs pointer-events-none.
- No `Date.now()`/`Math.random()` in first-render paths (hydration). localStorage only in effects.
- No em dashes in user-visible copy or docs (workspace rule).
