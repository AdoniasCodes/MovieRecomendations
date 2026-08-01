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
- `pnpm run build` (type-checks the whole app) — fix all TS errors.
- Sanity-check the dev server renders the touched screens.
- Don't claim a feature works if it's only partially wired — say what's stubbed.

## 9. Catalog data shape (when adding titles)
Each `Title` needs: stable `id` (`"movie:<tmdbId>"`/`"tv:<tmdbId>"`), `mediaType`, `title`, `year`,
`era`, `runtime` (+`seasons` for tv), `genres[]`, `vibes[]`, `moods[]`, `energy`, `commitment`,
`voteAverage` (0–10), `popularity` (0–100), `hiddenGem`, `classic`, `overview`, `cast[]`,
`colorA`/`colorB` (poster gradient), optional `posterPath`. Phase 2 adds: `violence` (0–5),
`country`, `language`, `international`. Pick `colorA`/`colorB` to evoke the title's mood (dark =
near-black; wholesome = warmer/brighter). Keep `voteAverage`/`popularity` realistic.

## 10. Two-user identity, idle, and per-device prefs (Phase 6 patterns)

- **Display identity vs semantic identity.** Keep semantic ids ("me"/"her") as the data layer's
  language and NEVER change them. Who is physically holding the device is a separate, tiny
  external store (`lib/identity.ts`, useSyncExternalStore + localStorage "amore-movies/whoami",
  getServerSnapshot returns the default so SSR matches). The auth session is the source of truth:
  an effect maps session email to identity. UI reads `store.me` / `store.partner`.
- **Idle lock.** `lib/activity.ts`: passive pointerdown/keydown/visibility listeners call
  `touchActivity()`, throttled to one localStorage write ("amore-movies/last-activity") per 30s.
  The gate checks on visibilitychange + a 60s interval; over the limit it re-shows the picker but
  keeps the session, so re-entry is one tap.
- **Honest presence = heartbeat + freshness, not socket lifetime.** Re-track `{ at: Date.now() }`
  every 60s only while visible AND recently active; the reader computes online from the newest
  foreign stamp being under 2.5 min old, re-evaluated on sync/join/leave AND a local interval so
  zombie entries age out; untrack on hidden/pagehide. Report to the store only on state CHANGE.
- **Per-device UI prefs live OUTSIDE the store seam.** Dismissed watch-along invites
  (`lib/session-prefs.ts`, "amore-movies/dismissed-sessions", capped list) are device preferences,
  not couple data; putting them in the synced store would wrongly propagate them to the partner.
- **Overlay resurrection rule.** Any overlay whose visibility is derived from refetched server
  state needs: (a) the server row reliably closed on cancel (close ALL active rows, not by id),
  (b) staleness filtering at hydrate time, (c) a local dismissed-set for the race window, and
  (d) "accepted this mount" gating so rehydration renders an invite, not a takeover.

## §8a. Supabase golden rule: builders are LAZY
`sb.from(...).insert/update/upsert/delete(...)` does NOTHING until the builder is awaited
or `.then()` is called on it. A fire-and-forget call silently discards the query. Every
mirror in `lib/live.ts` must return `run(builder)` (the wrapper that forces execution and
swallows network errors). When adding any new store action that mirrors to Supabase,
wrap the builder in `run()` or await it. This bug shipped invisible for weeks because the
optimistic local dispatch made everything LOOK like it worked on the acting device.

## §8b. Two-user E2E verification (the only test that catches couple-loop bugs)
Node + playwright-core against a LOCAL PRODUCTION build (`pnpm run build` then `npm start`;
prod activates the service worker; never build while dev runs). Chromium binary from the
playwright cache (`~/Library/Caches/ms-playwright/chromium-*/...`). Pattern (see Phase 9):
- Two browser contexts, sign in both accounts via the gate (Get in, name, PIN 9009).
- Navigate ONLY client-side (bottom nav); any page.goto re-summons the WelcomeGate by
  design, and the gate WILL intercept clicks (probe must re-enter it after a hard nav).
- Assert with request listeners (did the POST /rest/v1/<table> actually fire?), websocket
  frames for realtime, elementFromPoint hit-tests for overlay/z-index blocking, and
  MutationObserver counts for idle churn.
- Realtime self-echo: own writes must cause 0 refetch GETs; a partner write must cause
  one refetch burst on the other context.
- Leave the couple's data as found (toggle back what you toggled; nudges are acceptable
  residue but tell Panda).

**Two probe-flakiness rules (Phase 13, both cost a debugging cycle):**
- **Never hard-navigate a signed-in context mid-probe.** `page.goto` re-summons the
  WelcomeGate and the accumulated gate state is what makes probes flaky. Sign in once, then
  navigate ONLY via the bottom nav and in-app links. Anything needing a clean slate gets a
  throwaway context.
- **Run throwaway contexts that sign in as an EXISTING user FIRST**, before the main contexts
  exist. Signing the same account in twice can invalidate the older session and silently kill
  the main context's realtime for every later step.
- Accessible names include the description text inside a button, so
  `getByRole("button", { name: /^Pulse$/ })` will not match a tile whose body reads
  "Pulse / No dice, no cards...". Use unanchored patterns for those.
- **Known pre-existing noise:** React error #418 (hydration text mismatch) fires for Hermi on
  `/` and `/profile` and is unrelated to any new feature. Cause: `useWhoami`'s
  `getServerSnapshot` returns the default "panda", so her name text differs for one frame.
  Documented and accepted in lib/identity.ts. Do not chase it during a probe.

## §8d. Supabase BROADCAST features (anniversary stage, After Dark Pulse)
For live presentation features that need no persistence, use Realtime **broadcast** via
`lib/broadcast.ts` instead of a table. No migration, instant, and completely separate from
the postgres_changes channels in `lib/live.ts`.

Two rules learned the hard way in Phase 13:

1. **ONE channel per topic per client.** A single Supabase client cannot hold two
   subscriptions to the same topic: the second `phx_join` never completes, so that consumer's
   sends queue forever and the UI reads "not connected". This bites whenever a globally
   mounted component and a page component want the same topic (AnniversaryStage lives in
   providers.tsx, DirectorPanel is a page, both want `stage:<coupleId>`). `openBroadcast`
   therefore shares and reference counts the underlying channel, binds ONE
   `.on("broadcast", { event: "*" })`, and fans out to each consumer's handler map. Keep
   event names lowercase: realtime-js lowercases them when matching bindings.
   `self: false` is what stops the sender's own globally mounted listener from reacting.
2. **Broadcast is fire and forget, so build a resume handshake.** Anything sent while the
   other device was reloading or reconnecting is gone. The receiver sends `hello` on join and
   the sender answers with its FULL current state (including "showing nothing but the holding
   screen", not just "showing module X"), plus a localStorage cache on the receiver so a
   reload repaints instantly instead of waiting for the round trip.

## §8e. Never gate anything on the DISPLAY identity
`getWhoami()`/`useWhoami()` (lib/identity.ts) is a localStorage toggle that reads `"panda"`
on a cold page load and only corrects inside an effect. Any gate built on it **fails open for
at least one render**, which in Phase 13 flashed the entire anniversary surprise onto Hermi's
screen on a hard navigation. Use `identityFromEmail(auth.session?.user.email)` (authoritative,
what WelcomeGate itself follows) and render nothing while `auth.loading`, so the gate fails
CLOSED. Fall back to the toggle only when `!auth.configured` (demo mode has no session).

## §8f. Web vibration, honestly (lib/haptics.ts)
- **Android Chrome:** `navigator.vibrate(pattern)`, arrays of alternating on/off ms. There is
  NO amplitude control in the web platform anywhere, so "intensity" can only mean duty cycle
  and tempo. A continuous buzz is one window-length vibration re-issued just before it
  expires (a new call replaces the running pattern).
  **Odd-length patterns invert phase on every repetition**, so a repeated `[520]` becomes a 50
  percent stutter instead of a solid buzz. Pad odd cycles, and special-case "solid" as a
  single long vibration.
- **iOS Safari:** `navigator.vibrate` does not exist and never has. The only route to the
  Taptic Engine is `<input type="checkbox" switch>` (17.4+) clicked via its `<label>`, which
  produces **taps only**; there is no way to hold the motor on. Fast taps read as a flutter.
  Say so in the UI rather than promising a buzz the phone cannot make.
- Both are blocked while the page is hidden, both need one prior user gesture, and neither has
  any background path. A remote-controlled receiver therefore needs a Wake Lock, an arming
  tap, and auto-stop on `visibilitychange`.

## §8c. Realtime + service worker hard rules (regressions that actually happened)
- **Never subscribe a realtime channel to a table that may not exist yet.** If any
  postgres_changes binding fails (table missing pre-migration), the WHOLE channel dies
  and every other table on it goes silent. New tables get their own channel (see
  subscribeCoupleChanges: COUPLE_TABLES vs EXTRA_TABLES) until their migration is a
  given.
- **Never cache Next.js RSC payloads or the app shell cache-first in the SW.** After a
  deploy the stale build makes the router hard-reload every navigation into the same
  stale cache (the splash-on-every-tab bug). Contract: navigations network-first with a
  short cache fallback; cache-first ONLY for /_next/static + media; `_rsc` and other
  dynamic GETs are never touched.
- **NEXT_PUBLIC_ env vars are build-time.** On Netlify, an env var scoped to Functions
  never reaches the client bundle. Anything the client needs that the server also knows
  (like the VAPID public key) should be served from an API route at runtime instead.

## §6. Verifying a Netlify deploy (no dashboard access needed)
GitHub commit statuses/check-runs stay empty for this repo (Netlify not wired as a GitHub check)
and no Netlify CLI auth exists locally. After pushing to main, wait 2-4 min then:
`curl -s -o /dev/null -w "%{http_code}" https://amoremovies.netlify.app/<route>` (expect 200)
and grep the HTML for content unique to the new change.

**Client-code changes never show in the HTML — grep the deployed CHUNK JS instead** (proven
2026-07-25): after `pnpm run build` locally, find which chunk holds your new string
(`grep -rl "<unique string>" .next/static/chunks/`), then fetch that same chunk path from the
live site and grep it. Shared chunks (e.g. `695-*.js` for lib/store.tsx) keep IDENTICAL hashed
names between local and Netlify builds; the layout chunk hash DIFFERS (env inlining), so for
layout-bundled components pull the current layout path out of the live HTML first.
**PER-ROUTE page chunks also differ from local** (confirmed Phase 13: local
`app/anniversary/page-ef14bd95092dbdf3.js` shipped as `page-d76cf9021a8fd3be.js`), so a 404 on
a locally-derived page chunk path does NOT mean the deploy failed. Fetch the route's HTML and
grep out `/_next/static/chunks/app/<route>/page-*.js` first. A brand new route returning 200 is
itself strong evidence the deploy landed. A free-tier
deploy can take 10+ min to go live — keep polling the chunk, not the CI (there is none).

**ALWAYS `curl --compressed` when grepping a deployed chunk** (cost 7 wasted minutes on
2026-08-01). Netlify serves chunk JS brotli/gzip encoded, so a plain `curl | grep` searches
compressed bytes, finds nothing, and reads exactly like "the deploy has not landed yet".
**Do NOT trust "every shared chunk name exists locally" as a deploy check.** It gave a false
LIVE on the very next deploy (2026-08-01): `.next/static/chunks/` accumulates chunks across
builds, so the PREVIOUS build's shared chunks are still sitting on disk and every live name
matches while Netlify is still serving the old bundle. Chunk-name matching only proves a chunk
came from *some* build of yours.

The reliable check is a string that exists ONLY in the new commit:
1. `grep -rl "<new string>" .next/static/chunks/` to find its chunk.
2. If it is a route chunk, pull the current `app/<route>/page-*.js` path out of the LIVE HTML
   (that hash always differs from local) and `curl --compressed` it.
3. For a shared chunk, fetch the same name and `cmp` it against the local file: byte-identical
   is proof.
4. The layout chunk is a special case: same SIZE as local but differs around char ~1200 because
   env values are inlined. Grep it for a new symbol instead of comparing bytes (`revive`,
   `visibilitychange`, a new copy string).

**If local curl times out (000), do NOT assume the deploy failed.** Rule out a local/ISP path
problem first (hit us 2026-07-09: ISP could not reach Netlify's Frankfurt edge while the site
was 200 worldwide):
1. `curl https://www.google.com` and `https://www.netlify.com` — if those work, general
   internet is fine.
2. `dig +short amoremovies.netlify.app` locally and `@8.8.8.8` — identical answers = DNS fine.
3. Global vantage: `curl -H "Accept: application/json" "https://check-host.net/check-http?host=https%3A%2F%2Famoremovies.netlify.app%2F&max_nodes=5"`,
   grab `request_id`, sleep ~12s, then `curl .../check-result/<id>`. 200s from other countries =
   site is up, the path from this ISP is broken.
4. Netlify health: `curl https://www.netlifystatus.com/api/v2/status.json`.
If it is an ISP path issue: nothing to fix in code; use mobile data or a VPN on the device to
load the app once (lands the self-healing SW), and retry verification later.

**Verifying the deploy anyway while the local geo edge is down:** Netlify geo-DNS hands this
region Frankfurt IPs; other edges may still be reachable. Pin curl to a working edge:
`curl --resolve amoremovies.netlify.app:443:18.208.88.157 https://amoremovies.netlify.app/sw.js`
(18.208.88.157 = US edge, 13.215.239.219 = Singapore; get fresh ones from a check-host.net run,
its results show which IP each node connected to). TLS + Host still validate the real site, so
the response is authoritative.

## §7. After Dark engine: adding cards safely
Cards live in `lib/afterdark/deck.ts`. Every card that needs skin declares
`require.maxClothing` (3 dressed .. 0 nude), every card that strips declares an effect, and
blindfold/restraint cards must come in put-on/take-off pairs (take-off weighted ~16 so state
never sticks). After editing the deck, rerun the coherence sim (2000 games x 60 rounds calling
draw/applyCard and asserting cardValid) with `npx tsx <sim script>`; it must print 0 violations
and "cards never drawn: none".
