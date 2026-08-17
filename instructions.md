# instructions.md: reusable build playbook

> Standing instructions so I (Claude) don't re-derive the same solutions every session. If a
> problem is covered here, follow it; if not, solve it fresh and add the solution here.
> Pair with `handoff.md`, the single living project-state file: this file is the *how*,
> handoff.md is the *what/where/now*.
>
> The pre-2026-08-17 long form (mock-era patterns, catalog data shape, full deploy war
> stories) is preserved verbatim in `docs/instructions-archive.md`. Incident write-ups live
> in `docs/postmortems.md`. Section labels like §8a stay stable: CLAUDE.md and handoff.md
> cite them.

## 0. House rules
- Call the user **Panda** (hard rule, whole `fun/` folder).
- Ship working increments; don't gold-plate before it runs.
- After any meaningful change: update `handoff.md`. After solving a novel problem: update
  this file.

## 1. The architecture pattern
Mock-first, swappable-backend. Types (`lib/types.ts`) model the domain once. Mock data
(`lib/mock-data.ts`) is seeded and deterministic. The engine (`lib/recommend.ts`) is pure:
no React, data in, scored results plus human "why" strings out. The store (`lib/store.tsx`)
is React context + `useReducer` + localStorage where **every mutation is a named action**;
UI never touches state shape directly, and this seam is what live mode plugs into. Global
overlays use tiny external stores (`useSyncExternalStore`, see `lib/title-sheet.ts`) so any
component can open them by id.

**Feature order:** types, mock data, engine (if scoring changes), store action, UI. Never
start at the UI.

## 2. Personalization / taste engine
- Per-person taste profiles are **data**, not `if`s scattered in UI.
- Audience dimension (`me` / `her` / `together`). "Together" is not an average: apply the
  stricter person's **hard filters** (her no-gore rule wins), then blend soft preferences.
- Hard filters (gore-for-Hermi, Bollywood-for-both) exclude or penalize heavily; soft prefs
  only nudge scores. Keep the `why` generator next to scoring.

## 3. AI wiring (free API + graceful fallback)
Gemini (`gemini-2.5-flash` / `gemini-2.0-flash`), key in `.env.local` as `GEMINI_API_KEY`.
- Call the model **server-side only** from a Route Handler; the key never reaches the browser.
- **Always keep a local fallback** (the pure engine): no key or a failed call returns engine
  results with `{ source: "local" }`. Never hard-depend on an external key.
- Ask for strict JSON, parse defensively, fuzzy-match titles back onto the catalog. Short
  prompts; pass the taste brief as system context. Cache by query, degrade to local on 429.

## 4. Next.js / SSR gotchas
- Never branch first render on `Date.now()` / `Math.random()` (hydration). Use a monotonic
  counter from a constant base (`useClock()` in `store.tsx`).
- localStorage only in effects; gate persistence behind a `ready` flag; hydrate the reducer
  with a `hydrate` action.
- Interactive files get `"use client"`; route handlers stay server-only.

## 5. PWA
- Manifest via `app/manifest.ts`. SVG icons OK (`sizes: "any"` plus a full-bleed
  `purpose: "maskable"` one).
- SW in `public/sw.js`, **registered only in production** (`RegisterSW.tsx`); a dev SW
  serves stale builds. Never cache `/api/*`.
- NEVER run `next build` while `next dev` runs (shared `.next`, corrupts the dev server).

## Design system cheatsheet
`mx-auto w-full max-w-md` container, dark base, `app-aurora` background. `.glass` /
`.glass-strong`, `bg-accent-gradient`, `text-gradient`, `shadow-glow(-magenta)`, `.chip(-active)`.
Framer Motion everywhere; sheets spring from the bottom (`stiffness: 280, damping: 30`);
buttons `active:scale-95`. Posters are procedural gradients via `Poster.tsx` (real
`posterPath` preferred when present). Icons `lucide-react`; emoji for warmth (🐼 / 💞).

---

# Supabase and realtime

## §5d. Migrations, couple pairing, RLS
- **Migrations:** direct `db.<ref>.supabase.co` is often IPv6-only; use the pooler
  `aws-0-<region>.pooler.supabase.com:5432`, user `postgres.<ref>`, `PGSSLMODE=require`.
  Ours is **eu-west-1**.
- **Pairing under RLS:** a joiner must look up a couple by code before being a member, which
  couple-scoped RLS forbids. Use **SECURITY DEFINER** RPCs (`create_couple`, `join_couple`,
  `ensure_profile`) granted to `authenticated`, enforcing limits (max 2).
- **Auth UX:** with `mailer_autoconfirm` off, use email OTP codes (`signInWithOtp` then
  `verifyOtp(type:'email')`); no redirect-URL config needed.
- **Login stays optional:** AuthProvider wraps but never gates; demo mode is the default.
- **Verify with a Node script** (service-role admin API): create confirmed users, exercise
  the RPCs, assert RLS isolation (stranger sees 0 rows), delete the users. See
  `scripts/verify-pairing.mjs`.

## §5e. The live seam (mock store to live backend)
- **Translation boundary:** internal ids stay semantic (`"me"` / `"her"`); uuid translation
  happens ONLY in `lib/live.ts`. Reducer and UI never learn uuids.
- **Optimistic + reconcile:** each action dispatches locally AND mirrors to Supabase; the
  realtime subscription debounces (250ms) then refetches the whole couple slice and
  re-hydrates. Idempotent, fine for 2 users.
- **Mode flag:** `live = signed-in && paired`, read through a `liveRef` so callbacks see the
  current mode. Disable all simulation in live mode (partner affinity, fake replies,
  WatchParty timers).
- **Don't clobber demo data:** skip localStorage persistence while live; restore on
  sign-out. Subscribe to `couple_members` so the creator flips live when the partner joins.
- **Verify at the data layer** with a two-user Node script asserting partner reads + RLS
  isolation (`scripts/verify-live.mjs`).

## §8a. Supabase golden rule: builders are LAZY
`sb.from(...).insert/update/...` does NOTHING until awaited or `.then()`d; fire-and-forget
silently discards the query. Every mirror in `lib/live.ts` must return `run(builder)` (or be
awaited). The optimistic local dispatch hides this bug completely on the acting device.

## §8c. Realtime + service worker hard rules
- **Never subscribe a channel to a table that may not exist yet:** one failed
  postgres_changes binding kills the WHOLE channel. New tables get their own channel
  (COUPLE_TABLES vs EXTRA_TABLES in subscribeCoupleChanges) until their migration is a given.
- **Never cache RSC payloads or the app shell cache-first in the SW** (the
  splash-on-every-tab bug). Navigations network-first with short cache fallback; cache-first
  ONLY for `/_next/static` + media; `_rsc` never touched.
- **NEXT_PUBLIC_ env vars are build-time.** A Functions-scoped Netlify var never reaches the
  client bundle; serve such values (e.g. the VAPID public key) from an API route at runtime.

## §8d. BROADCAST features (anniversary stage, After Dark Pulse)
Live presentation features that need no persistence use Realtime broadcast via
`lib/broadcast.ts`: no migration, separate from the postgres_changes channels. Two rules:
1. **ONE channel per topic per client.** A second subscription to the same topic never
   finishes joining and its sends queue forever ("not connected"). `openBroadcast` shares
   and reference-counts the channel, binds ONE `.on("broadcast", { event: "*" })`, and fans
   out to consumer handler maps. Event names lowercase; `self: false` keeps the sender's own
   global listener quiet.
2. **Broadcast is fire and forget: build a resume handshake.** Receiver sends `hello` on
   join; sender answers with its FULL current state (including "showing nothing yet"), plus
   a localStorage cache on the receiver so a reload repaints instantly.

## §8g. Client timeouts and recovery (the wedge rules)
Full post-mortem in `docs/postmortems.md`. Standing rules:
- **Never create a Supabase client without a fetch deadline** (`timedFetch`, 20s, in
  `lib/supabase.ts`). It turns a permanent jam on a black-holed route into a retryable
  error. Do not remove it.
- **Every await on a recovery path is bounded** (`withTimeout`, `lib/auth.tsx`). A recovery
  path that can itself hang is not a recovery path.
- **A retry is not a repair.** `auth.reconnect()` does what a restart does, in order: fresh
  token, reload the slice, rebuild the sockets. Escalate to a real reload only after that.
- **Every realtime channel goes through `managedChannel`** (backoff rejoin, kick on
  online/foreground, forced rebuild after >4s hidden); a rejoin triggers a refetch because
  gap-time partner writes were never delivered.
- **Diagnose from the phone:** `lib/diag.ts` + `lib/health.ts` (four legs auth / data /
  realtime / host, tested IN PARALLEL) + Profile > Connection. Log upload uses PLAIN fetch
  with the anon key, never the supabase-js client (the broken client is the moment worth
  capturing).
- Reproduce with `scratchpad/probe-wedge.mjs` (a server that accepts and never answers): a
  stock client hangs forever, the fixed one settles at 20s.

---

# Device, identity, presence

## §10. Two-user identity, idle, per-device prefs
- **Display vs semantic identity.** Semantic ids (`"me"` / `"her"`) never change. Who holds
  the device is `lib/identity.ts` (localStorage `amore-movies/whoami`; getServerSnapshot
  returns the default so SSR matches); the auth session is the source of truth via
  email-to-identity mapping. UI reads `store.me` / `store.partner`.
- **Idle lock:** `lib/activity.ts` throttles `touchActivity()` to one write per 30s; the
  gate checks on visibilitychange + a 60s interval; over the limit it re-shows the picker
  but keeps the session.
- **Honest presence = heartbeat + freshness, not socket lifetime.** Re-track every 60s only
  while visible and recently active; online = newest foreign stamp under 2.5 min,
  re-evaluated on sync/join/leave and a local interval; untrack on hidden/pagehide; report
  only on state CHANGE.
- **Per-device UI prefs live OUTSIDE the store seam** (`lib/session-prefs.ts`): syncing them
  would wrongly propagate to the partner.
- **Overlay resurrection rule.** Overlays derived from refetched server state need: server
  row closed on cancel (ALL active rows, not by id), staleness filtering at hydrate, a local
  dismissed-set for the race window, and "accepted this mount" gating so rehydration renders
  an invite, not a takeover.

## §8e. Never gate anything on the DISPLAY identity
`useWhoami()` reads `"panda"` on a cold load and corrects only in an effect, so any gate on
it fails OPEN for at least one render (Phase 13: flashed the anniversary surprise onto
Hermi's screen). Gate on `identityFromEmail(auth.session?.user.email)` and render nothing
while `auth.loading` (fails CLOSED). Fall back to the toggle only when `!auth.configured`.

## §8f. Web vibration, honestly (lib/haptics.ts)
- **Android Chrome:** `navigator.vibrate(pattern)`; no amplitude control exists on the web,
  so "intensity" means duty cycle and tempo. Continuous buzz = one window-length vibration
  re-issued before expiry. **Odd-length patterns invert phase each repetition** (repeated
  `[520]` becomes a stutter): pad odd cycles, special-case "solid" as one long vibration.
- **iOS Safari:** no `navigator.vibrate`. Only `<input type="checkbox" switch>` (17.4+)
  clicked via its label reaches the Taptic Engine, taps only. Be honest about it in the UI.
- Both blocked while hidden, both need a prior gesture, neither runs in background: a
  remote-controlled receiver needs a Wake Lock, an arming tap, auto-stop on visibilitychange.

---

# Verification

## §8. Verify before declaring done
`pnpm run build` (type-checks all); sanity-check the dev server renders touched screens;
never claim a partially wired feature works, say what's stubbed.

## §8b. Two-user E2E verification (catches couple-loop bugs)
Node + playwright-core against a LOCAL PRODUCTION build (`pnpm run build` then `npm start`;
prod activates the SW; never build while dev runs). Chromium from the playwright cache.
- Two contexts, sign in both accounts via the gate (Get in, name, PIN 9009).
- Navigate ONLY client-side: `page.goto` re-summons the WelcomeGate by design.
- Assert with request listeners (did POST `/rest/v1/<table>` fire?), websocket frames,
  elementFromPoint hit-tests for overlay blocking, MutationObserver counts for idle churn.
- Realtime self-echo: own writes cause 0 refetch GETs; a partner write causes one burst.
- Leave the couple's data as found; tell Panda about residue.

Flakiness rules (each cost a debugging cycle):
- **Never hard-navigate a signed-in context mid-probe**; a clean slate gets a throwaway
  context.
- **Throwaway contexts signing in as an EXISTING user run FIRST**, before the main contexts:
  a duplicate sign-in can invalidate the older session and kill its realtime silently.
- Accessible names include a button's description text; use unanchored role-name patterns.
- Known noise: React error #418 for Hermi on `/` and `/profile` (whoami SSR default),
  documented in lib/identity.ts. Do not chase it.

## §6. Verifying a Netlify deploy (no dashboard access)
No GitHub checks, no Netlify CLI auth. After pushing, wait 2-4 min (free tier can take 10+),
then verify by CONTENT:
- `curl -s -o /dev/null -w "%{http_code}" https://amoremovies.netlify.app/<route>` expects
  200; grep the HTML for content unique to the change.
- Client-code changes never show in HTML: find the chunk locally
  (`grep -rl "<string>" .next/static/chunks/`) and fetch the same path live.
- **ALWAYS `curl --compressed`**: Netlify serves chunks brotli/gzip encoded, so plain
  `curl | grep` reads exactly like "not landed yet".
- **Only a string unique to the new commit proves anything.** `.next/static/chunks`
  accumulates across builds (false LIVEs). Shared chunks keep identical hashed names
  (byte-identical `cmp` is proof); the layout chunk and PER-ROUTE page chunks hash
  differently from local, so pull the current `page-*.js` path from the live HTML and grep
  it for a new symbol. A 404 on a locally-derived page chunk path does NOT mean failure.
- **Local curl 000 does not mean the deploy failed:** this ISP has lost the path to
  Netlify's Frankfurt edge while the site was 200 worldwide. Check google/netlify.com, `dig`
  locally and `@8.8.8.8`, a check-host.net global run, and netlifystatus.com. Verify anyway
  by pinning to a reachable edge:
  `curl --resolve amoremovies.netlify.app:443:<edge-ip> ...` (fresh edge IPs from the
  check-host run); TLS + Host still validate the real site.

## §7. After Dark engine: adding cards safely
Cards live in `lib/afterdark/deck.ts`. Skin-dependent cards declare `require.maxClothing`
(3 dressed .. 0 nude), stripping cards declare an effect, blindfold/restraint cards come in
put-on/take-off pairs (take-off weighted ~16). After editing the deck, rerun the coherence
sim (2000 games x 60 rounds calling draw/applyCard, asserting cardValid) with
`npx tsx <sim script>`; it must print 0 violations and "cards never drawn: none".
