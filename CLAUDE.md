# Amore Movies — project notes

Fun project (call the user **Panda**). Couples' movie/series discovery platform for Panda (🐼) and Hermi (💞). Deployed on Netlify from GitHub `AdoniasCodes/MovieRecomendations`, branch `main`.

## Decisions locked
- **Name:** Amore Movies. **Users:** Panda + Hermi, PIN login (two pre-paired Supabase accounts, see `lib/pin-accounts.ts`).
- **Identity UX:** the who-are-you picker shows on EVERY app open; PIN only when there is no session for the picked identity. No anonymous mode. 1 hour of inactivity re-shows the picker (no PIN) and drops you to offline for your partner.
- **Watch-along:** a partner-started session shows a small invite card, never a full-screen takeover. Dismissing it is permanent per device.

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

## Don't
- Don't add real API keys to the repo. Use `.env.local` (gitignored).
- Don't break the `store.tsx` action seam or move uuid handling out of `live.ts`.
- No `Date.now()`/`Math.random()` in first-render paths (hydration). localStorage only in effects.
- No em dashes in user-visible copy or docs (workspace rule).
