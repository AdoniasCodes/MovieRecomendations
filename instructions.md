# instructions.md — reusable build playbook

> A set of standing instructions so I (Claude) don't re-derive the same solutions every session.
> If a problem is covered here, follow it. If it isn't, solve it fresh — then add the solution here.
> Pair with `context.md` (the living project state). This file = *how*; context.md = *what/where/now*.

---

## 0. House rules
- Call the user **Panda** (hard rule, whole `fun/` folder).
- Keep it fun and polished, but ship working increments — don't gold-plate before it runs.
- After any meaningful change: update `context.md`. After solving a novel problem: update this file.

## 1. The architecture pattern (reuse this for any similar app)
This couples/social discovery app is built as **mock-first, swappable-backend**:
1. **Types** (`lib/types.ts`) — model the domain once.
2. **Mock data** (`lib/mock-data.ts`) — seeded, deterministic catalog + users + taste seed.
3. **Pure engine** (`lib/recommend.ts`) — no React, no state; takes data in, returns scored
   results + human "why" strings. Easy to unit-reason about.
4. **Action-seam store** (`lib/store.tsx`) — React context + `useReducer` + `localStorage`.
   **Every mutation is a named action** exposed as a function on the store. UI never touches
   state shape directly. This is the seam you swap for a real backend (Supabase) later — keep the
   function signatures stable and screens never change.
5. **Thin UI** — pages/components call store functions and the pure engine. Global overlays
   (sheets, toasts, match reveal) use tiny external stores (`useSyncExternalStore`) so any
   component can open them by id without prop-drilling (see `lib/title-sheet.ts`).

**When adding a feature, go in this order:** types → mock data → engine (if scoring changes) →
store action → UI. Don't start at the UI.

## 2. Personalization / taste engine
- Encode **per-person taste profiles** as data, not hardcoded `if`s scattered in UI.
- Support an **audience** dimension (`me` / `her` / `together`). "Together" is not an average —
  apply the stricter person's **hard filters** (e.g. one partner's no-gore rule wins) and then
  blend soft preferences.
- Represent aversions as **hard filters** (exclude/penalize heavily) vs **soft prefs** (score
  nudges). Gore-for-Amore and Bollywood-for-both are hard filters; "prefers cozy" is soft.
- Keep a `why` string generator next to scoring so every recommendation can explain itself.

## 3. Simulated partner (until real second account exists)
- The partner's reactions live in **one place** (`partnerAffinity()` in `store.tsx`). Make it
  reflect the *real* person's taste (Amore: boost wholesome/cerebral/international, reject gore).
- Use a **seeded RNG** (deterministic) so behavior is reproducible and SSR-safe — never
  `Math.random()` / `Date.now()` in code that affects first render.

## 4. Notifications without a backend
- Model a `Notification[]` in the store. "My" actions (start watching, favorite, add to list,
  mark for cinema) **push a notification addressed to the partner**; render them in a bell/panel.
- Real cross-device presence + nudges + watch-along need Realtime → defer to the backend phase.
  Build the UI + data shape now so the swap is just changing the source.

## 5. AI wiring (free API + graceful fallback) — IMPORTANT REUSE
**Recommended free AI: Google Gemini** (`gemini-2.5-flash` / `gemini-2.0-flash`) — most generous
free tier, strong at "things similar to X" knowledge. Get a key at
https://aistudio.google.com/apikey → put `GEMINI_API_KEY=...` in `.env.local`.
Alternatives: **Groq** (fastest, free, Llama models), **OpenRouter** (`:free` models), **Mistral**.

Pattern:
- Call the model **server-side only** from a Next.js Route Handler (`app/api/.../route.ts`) so the
  key never reaches the browser.
- **Always implement a local fallback** (the pure engine) so the feature works with **zero keys**.
  Detect `process.env.GEMINI_API_KEY`; if absent or the call fails, return engine results and a
  flag like `{ source: "local" }`. The app must never hard-depend on an external key.
- Ask the model for **strict JSON** (list of `{title, year, reason}`), parse defensively, then map
  results back onto the local catalog by fuzzy title match; show un-matched suggestions as plain
  cards. Keep prompts short; pass the couple's taste brief as system context.
- Free tiers are rate-limited → cache by query, debounce, and degrade to local on 429.

## 5b. Realtime-ready features without a backend (Watch-Along pattern)
Build live/social features on the mock store first, shaped so a real backend swaps in cleanly:
- Model the live entity in the store exactly as the DB will (`WatchSession`, `Reaction`) — same
  fields the Supabase table has.
- Drive the "other person" with **client-side timers in a `useEffect`** (mounts after hydration,
  so SSR-safe). Key the effect on a stable id (`session.startedAt`) and clean up timers on unmount.
- Keep all writes behind store actions (`startWatchParty`, `sendReaction(content, kind, by?)`).
  The `by?` param lets the same action represent both me and the simulated partner — later it's
  just "whoever the Realtime event says."
- To go live: replace the timer simulation with a Supabase Realtime channel subscription that
  dispatches the same actions. UI doesn't change.

## 5c. PWA (installable + offline)
- Manifest via `app/manifest.ts` (Next auto-links it). Icons can be **SVG** (`sizes: "any"`,
  provide a separate `purpose: "maskable"` one with no rounded corners / full-bleed bg).
- Service worker in `public/sw.js`; **register only in production** (`RegisterSW.tsx` guards on
  `NODE_ENV`) — a dev SW serves stale builds and is maddening. Never cache `/api/*`.
- Add `appleWebApp` + `icons` to layout `metadata`, `themeColor` to `viewport`.
- IMPORTANT: never run `next build` while `next dev` is running — they share `.next` and it
  corrupts the dev server. Stop dev first, or build in a separate worktree.

## 5d. Supabase auth + couple pairing + RLS (verified pattern)
- **Applying migrations:** direct `db.<ref>.supabase.co` is often IPv6-only — if the machine has no
  IPv6, use the **pooler** `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`,
  `PGSSLMODE=require`. Find the region by probing (`select 1`); ours is **eu-west-1**.
- **Pairing under RLS:** a joiner must look up a couple by code *before* they're a member, which
  couple-scoped RLS forbids. Solve with **SECURITY DEFINER** RPCs (`create_couple`, `join_couple`,
  `ensure_profile`) granted to `authenticated` — they bypass RLS safely and enforce limits (max 2).
- **Auth UX:** if `mailer_autoconfirm` is off (check `GET /auth/v1/settings`), use **email OTP codes**
  (`signInWithOtp` → `verifyOtp(type:'email')`) — no redirect-URL config needed, works for known users.
- **Keep login optional:** wrap the app in AuthProvider but DON'T gate it — demo mode stays default so
  solo testing is instant; "go live" is an additive upgrade in Profile.
- **Verify before trusting:** a Node script using the service-role admin API can create confirmed
  users, exercise the RPCs, and assert RLS isolation (stranger sees 0 rows), then delete the users.
  See `scripts/verify-pairing.mjs`. Always test RLS isolation, not just the happy path.

## 5e. Swapping a mock store for a live backend (the seam paid off)
The action-seam design (every mutation is a named store function) let us add live mode WITHOUT
touching the reducer or any UI:
- **Translation boundary:** keep the store's internal ids semantic (`"me"`/`"her"`); translate
  to/from real auth uuids only in the live layer (`lib/live.ts`). Reducer + UI never learn about uuids.
- **Optimistic + reconcile:** each action does its normal local `dispatch` (instant feel) AND mirrors
  the write to Supabase. A realtime subscription debounces (250ms) then **refetches the whole couple
  slice and re-hydrates** — idempotent, far simpler than replaying granular events, fine for 2 users.
- **Mode flag:** `live = signed-in && paired`. Keep a `liveRef` (ref, not state) so action callbacks
  read the current mode without re-creating. Demo path stays the default; live is additive.
- **Disable the simulation in live mode** (partner affinity, fake replies, WatchParty timers) — guard
  on `store.live` / `liveRef.current`.
- **Don't clobber demo data:** skip localStorage persistence while live; restore demo on sign-out.
- **Auto-detect pairing:** subscribe to `couple_members` so the creator flips to live when the partner
  joins, no reload.
- **Verify the swap at the data layer** with a two-user Node script that mirrors the live writes and
  asserts the partner reads them + RLS isolation (`scripts/verify-live.mjs`). The React realtime glue
  is the only part that needs a real two-device test.

## 6. Next.js / SSR gotchas (already hit these)
- Hydration mismatch: never branch first render on `Date.now()`/`Math.random()`. Use a monotonic
  counter seeded from a constant base (see `useClock()` in `store.tsx`).
- `localStorage` is client-only: read it in a `useEffect` after mount, gate persistence behind a
  `ready` flag, and hydrate the reducer with a `hydrate` action.
- Mark interactive files `"use client"`. Keep route handlers server-only (no `"use client"`).

## 7. Design system cheatsheet (keep new UI consistent)
- Container: `mx-auto w-full max-w-md`. Dark base, `app-aurora` background.
- Glass: `.glass` / `.glass-strong`. Accent: `bg-accent-gradient`, `text-gradient`,
  `shadow-glow` / `shadow-glow-magenta`. Pills: `.chip` / `.chip-active`.
- Motion: Framer Motion everywhere; sheets spring up from bottom (`y: "100%" → 0`,
  `stiffness: 280, damping: 30`). Buttons `active:scale-95`.
- Posters are **procedural gradients** (`colorA`→`colorB`) via `Poster.tsx`, which prefers a real
  `posterPath` when present — so wiring TMDB later just fills `posterPath`.
- Icons: `lucide-react`. Emoji used liberally for warmth (🐼 / 💞).

## 8. Verify before declaring done
- `npm run build` (type-checks the whole app) — fix all TS errors.
- Sanity-check the dev server renders the touched screens.
- Don't claim a feature works if it's only partially wired — say what's stubbed.

## 9. Catalog data shape (when adding titles)
Each `Title` needs: stable `id` (`"movie:<tmdbId>"`/`"tv:<tmdbId>"`), `mediaType`, `title`, `year`,
`era`, `runtime` (+`seasons` for tv), `genres[]`, `vibes[]`, `moods[]`, `energy`, `commitment`,
`voteAverage` (0–10), `popularity` (0–100), `hiddenGem`, `classic`, `overview`, `cast[]`,
`colorA`/`colorB` (poster gradient), optional `posterPath`. Phase 2 adds: `violence` (0–5),
`country`, `language`, `international`. Pick `colorA`/`colorB` to evoke the title's mood (dark =
near-black; wholesome = warmer/brighter). Keep `voteAverage`/`popularity` realistic.
