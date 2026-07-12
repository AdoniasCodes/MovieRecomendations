# handoff.md — Amore Movies

_Updated: 2026-07-12_

## Current phase (2026-07-12): Phase 11 "The Smooth Update" SHIPPED, 2 manual steps
Planned + approved by Panda, built by orchestrated subagents (Haiku/Sonnet/Opus under
Fable as architect and final judge), fully E2E-tested (probe11/12 master suite, probe8/9
regressions, After Dark 2000-game sim: 0 violations).

Bug fixes (root causes confirmed by recon + live diagnostics):
1. **Splash on every tab (CRITICAL)**: the v4 SW cached RSC payloads/app shell
   cache-first; after a deploy the stale build made Next hard-reload every nav into the
   stale cache. sw.js is now amore-v5: navigations network-first (2.5s cache fallback),
   only /_next/static + media cache-first, RSC/dynamic never cached. Latent bug fixed:
   missing last-activity stamp treated as "now", never as idle-forever.
2. **Soft welcome gate**: signed-in known identity + activity under 1h enters directly
   (no splash, no picker). Neutral black screen while auth resolves; 5s escape hatch kept.
3. **Push notifications never worked**: the deployed bundle had NO VAPID public key
   (Netlify env scoped to functions, not builds; verified by grepping live chunks) so 0
   devices ever subscribed (0 rows, verified). Key now served at runtime via GET
   /api/push; requestPermission first-in-gesture (iOS); EnableAlerts reflects the real
   subscription row, always retryable, per-cause blocking modals; self-healing refresh.
4. **Us activity feed synced**: new `activity` table (migration 0006) mirrored from every
   couple action; survives refetch; feed works in live mode.
5. **Match overlay for BOTH**: fresh-match diff on hydrate celebrates on the partner's
   device too (freshness-gated, no misfire on boot).
6. **Swipe deck**: promoted cards restore opacity 1 (framer kept 0.7-0.85) + solid card
   bg; era chips restyled high-contrast glass (were near-invisible on OLED).

Features: watch night planning (PlanPicker in TitleSheet, UpcomingPlans on Tonight,
cancel with blocking confirm, Start-now in the window, one-time reminder push via atomic
reminded_at claim), learning taste engine (learnedTaste() blends real votes/ratings into
scoring, n/(n+20) damped), offline write queue (idempotent mirrors park in
localStorage, FIFO replay on reconnect/foreground), After Dark trio (sealed envelope
draws with 2s both-hold reveal, cosmetic rarity 28 rare/6 legendary with foil styling,
persistent "Your story so far" recap stats).

Hard-won regression caught in testing: subscribing realtime to not-yet-migrated tables
kills the WHOLE channel; new tables (activity, watch_plans) now ride a separate channel
so pre-0006 realtime stays alive.

**Status 2026-07-12 (end of session):** Migration 0006 APPLIED by Panda and verified
against the live DB (activity + watch_plans tables both responding; activity already has
real rows). Panda confirmed the app "works nice" in testing. Deploy amore-v5 verified
live; GET /api/push serves the runtime key (configured).
Only remaining device step (if not already done): Profile > "Turn on alerts" on BOTH
phones. The rebuilt flow reports the exact blocker if anything fails; a granted-but-
half-enrolled device self-heals on the next app open.
E2E residue: test votes on Paddington (both liked it, it's now a match) + a few test
nudge/plan notifications. The Shoplifters watch-along test records were deleted.

## Next session candidates (nothing in flight)
- Confirm push end-to-end on the real phones (nudge with the app closed).
- Us activity feed polish if wanted (icons per type, day grouping).
- Deferred: synced playback position, provider deep links, Cloudflare-proxied custom
  domain for Panda's ISP route (approved concept, unbuilt).

## Current phase (2026-07-11): Phase 10 "Watch-along that remembers" SHIPPED, 1 manual step
Watch-alongs are now durable, resumable records instead of ephemeral overlays:
- **Resume**: an active session survives leaving the app. Re-entry re-offers it (invite
  card reads "still going" for the host, "started a watch-along" for the partner);
  minimizing shows a left-anchored resume chip; tapping the "started a watch-along"
  NOTIFICATION now rejoins the running session instead of dead-ending on the title page.
- **Saved conversations**: reactions/messages always persisted (reactions table); now
  browsable per night in Us > Watchalongs, bubbles with attribution.
- **Lifecycle**: in_progress / completed / dropped. "Wrap up" button inside the party
  opens a blocking modal (We finished it / We dropped it / Keep watching). Auto-retired
  sessions (new one started over an old one) become dropped.
- **Delete**: per-record delete in Us > Watchalongs with a blocking confirm; removes the
  session + conversation for both (reactions cascade via FK).
- New seam pieces: lib/party-ui.ts (per-mount accepted/minimized UI state, outside the
  store so refetch re-hydration can't reset it), store actions endWatchParty(status) /
  listPartyHistory / partyConversation / deleteParty, live.ts setSessionStatus /
  deleteSession / listWatchSessions / fetchSessionReactions, components/us/Watchalongs.tsx.
- Verified by a full two-user E2E on a local prod build (12/12 checks): start, live chat
  both ways, minimize + chip, reload-resume with history intact, notification rejoin,
  wrap-up closing both devices, history + conversation in Us, delete. Test data removed.

Migration 0005 APPLIED by Panda (2026-07-11) and verified live: a wrap-up as "We finished
it" persists status='completed' and renders the Completed chip in Us > Watchalongs
(probe10 E2E against the live DB, test record deleted after). No manual steps pending.

## Current phase (2026-07-10): Phase 9 "Diagnose + cleanse" SHIPPED
Panda reported: drawer taps dead, app way slower, Hermi offline, nudges not arriving.
Full diagnostic (3 parallel audits + real two-user Playwright E2E on a local prod build)
found and fixed, all verified end-to-end before push:
1. **THE BIG ONE: most Supabase mirror writes never executed.** supabase-js builders are
   lazy (request fires only when awaited). Nearly every `push.*` call in store.tsx is
   fire-and-forget, so nudge/save/status/note/AI-message/endSession INSERTs were silently
   discarded. Only the awaited paths (votes/matches/startSession) ever wrote. Fixed with a
   `run()` wrapper in live.ts that forces execution + swallows network errors. This is why
   Hermi's nudges never arrived (only the /api/push knock fired, no notifications row).
2. **Dead drawer taps: stuck notification banner.** The Phase 8 in-app banner (z-55) sat
   ABOVE the TitleSheet (z-50) and its 8s dismiss timer was cancelled without reschedule
   whenever unread changed, leaving an invisible tap-eater parked over the drawer header.
   Now: timer tied to the banner itself, banner z-45 (below sheet), FABs get
   pointer-events-none while faded.
3. **Slowness: self-echo refetch storm.** After migration 0004 published watchlist/watched/
   votes/notes, every own swipe/save echoed back and triggered the full 8-query refetch +
   app-wide re-render. Now suppressed (4s table-level local-write window in live.ts);
   partner events still refetch (verified). Reconcile-on-foreground added in store.tsx.
4. Boot: loadAll ran twice (boot IIFE + INITIAL_SESSION) = ~12 serial queries; deduped by
   user id. SW navigations now cache-first with background revalidate (amore-v4) instead of
   3.5s network-first waits on the broken ISP path. Error boundaries added (app/error.tsx +
   global-error.tsx, blocking OK modal). Fetch timeouts on catalog/assistant/similar/push.
   "undefined seasons" fixed (falls back to "Series"). Icons/photo compressed (~560K saved,
   icon-512 490K to 146K). Orphan icon-maskable.svg deleted. AfterDark roll timer cleanup.
   catalog-pinned localStorage now LRU-capped (600).
- Presence verified working both ways in E2E (both saw each other online). "Hermi offline"
  on real phones = honest-presence semantics (online only while her app is foregrounded,
  2.5 min freshness) + her actions never syncing due to bug 1 making the app look dead.
- E2E leftovers in the couple's real data: a test vote each on Shoplifters (Panda: Pass,
  Hermi: Like) and one test nudge notification; Panda's old unread were marked read.
  Re-swipe Shoplifters if you care about it.
- Verify scripts live in the session scratchpad (probe8.mjs pattern documented in
  instructions.md §8b).

## Previous phase (2026-07-09): Phase 8 "Fix the couple loop" SHIPPED, 2 manual steps pending
Root-caused and fixed: (1) boot hang on "Warming up" (auth.tsx had no timeout/catch/finally on
getSession + 6 serial queries; now timed out 5s/8s with finally, plus a 5s WelcomeGate escape
hatch); (2) watch status pills silently no-oping (status reducer lacked the insert branch cinema
had); (3) partner statuses/ratings/votes/notes never syncing (those 4 tables were missing from
the supabase_realtime publication; cinema only worked by piggybacking a notifications insert);
(4) nudges giving no alert (pipeline was fine, alerting layer didn't exist: added web push via
sw.js push handlers + /api/push route + push_subscriptions table + EnableAlerts profile card,
plus in-app vibrate + slide-in banner, plus optimistic sender echo).

**PANDA MUST DO (push + sync fixes are dormant until then):**
1. Apply `supabase/migrations/0004_realtime_push.sql` in the Supabase SQL editor.
2. In Netlify: add the 3 new env vars from `.env.netlify.local` (NEXT_PUBLIC_VAPID_PUBLIC_KEY,
   VAPID_PRIVATE_KEY, VAPID_SUBJECT) and trigger a redeploy. Then on BOTH phones: open the
   installed PWA > Profile > "Turn on alerts".
Email notifications were consciously skipped: Supabase's mailer only sends auth emails (that's
the rate-limit error Panda hit); if wanted later, use Resend via an API key in .env.

## 2026-07-09 late-night follow-up: splash STILL stuck, root cause is the NETWORK, not code
Investigated at ~11pm. The site and the self-heal fix are fine; Panda's ISP cannot currently
reach Netlify's edge:
- From this machine, https://amoremovies.netlify.app times out at TCP connect (curl 000, no
  remote IP). DNS is correct and identical on local/8.8.8.8/1.1.1.1 (35.157.26.135, 63.176.8.218
  = Netlify edge on AWS Frankfurt). Traceroute dies inside the ISP's 10.x network.
- check-host.net: 200 OK from Finland, Hungary, Indonesia, India, Japan, including from the SAME
  two IPs that time out here. Netlify status page: all systems operational, no incidents.
- origin/main has the fix commits (55924f6). GitHub and general internet reachable; only the
  Netlify edge path is broken from this ISP.
Why the phones hang: they still run the OLD cached bundle (pre-timeout code that can hang
forever), and they cannot download the fixed bundle because the site is unreachable from this
network. Nothing to change in code; the shipped SW self-heal lands the moment a phone loads the
site once over a working path.
**What Panda must do:** on the phone, try the site in a normal browser tab first (confirms
reachability). Then open the installed PWA over mobile data instead of WiFi, or via VPN if both
go through the same ISP. One successful load installs the amore-v3 worker and the permanent-hang
class is gone. If splash persists on a confirmed-working network: clear the PWA's website data /
reinstall (guaranteed clean), then re-enable alerts in Profile.
DONE: deployed sw.js verified as `amore-v3` (fetched via a reachable non-EU Netlify edge with
curl --resolve; see instructions.md §6). The self-heal fix is confirmed live.

## 2026-07-09 decision + carrier reachability map (Panda's own hotspot / carrier)
Panda confirmed: works with VPN, works on the PC via his brother's hotspot, Hermi's side fine.
**Decision: NO Vercel mirror. Stay Netlify-only.** If the carrier route never heals, fallback is
VPN on Panda's phone; optional future durable fix (approved concept, not built): cheap custom
domain proxied through Cloudflare (free plan) in front of the same Netlify site.
Measured from the bad carrier:
- Netlify Frankfurt edge (35.157.26.135, 63.176.8.218 = what geo-DNS returns here): DEAD.
- Netlify US edge 18.208.88.157 + Singapore 13.215.239.219: reachable, 200.
- Supabase (project URL): 200. image.tmdb.org + api.themoviedb.org: reachable.
- Cloudflare: fast (0.14s). Vercel + GitHub Pages: reachable.
Practical no-VPN state on Panda's phone once the new bundle lands (one VPN load, visit all 5
tabs to warm the SW cache, re-enable alerts): app opens from cache, everything Supabase-backed
works (watchlist, statuses, votes, chat, presence, realtime), posters work (direct image.tmdb.org
via plain img tag, no Netlify optimizer). Needs VPN until route heals: /api/* on Netlify =
Discover catalog refresh, AI assistant, sending push notifications.

## 2026-07-09 follow-up: stuck-on-splash was STALE PWA CACHE
After Panda applied migration 0004 + Netlify env, both phones stuck on the "Warming up" splash
every open. Root cause: the phones were still running the OLD pre-fix bundle (service worker
served stale cached HTML+chunks that boot into the infinite-hang code). New deployed code cannot
hang forever (5s/8s boot timeouts + 5s WelcomeGate escape hatch), so a permanent stuck splash =
old code on device. Fix = force one clean load (clear PWA website data / reinstall).
Durable fix shipped (commit c75a27d): RegisterSW now reloads on SW controllerchange + calls
registration.update() on load/foreground; sw.js bumped to amore-v3 (purges old caches) with a
3.5s network-first navigation timeout. After phones load the new code ONCE, this class of
permanent hang is gone for good.

## Previous phase
Phase 7 ("After Dark", the 18+ couple's dice game) is SHIPPED on top of Phase 6. All client-side,
no migration needed. Entry: Profile > "After Dark 18+" card > /after-dark. Build clean, engine
stress-tested (120k simulated draws, 0 coherence violations).

## After Dark (Phase 7) key facts
- `lib/afterdark/engine.ts` — pure engine: 4 heat levels (Spark/Tease/Fire/Ember), tag-based
  state machine (clothing 3..0 per player, blindfold, restraints), cards declare require/effects
  so consecutive cards never contradict. Fallback logic means a draw can never come up empty.
- `lib/afterdark/deck.ts` — 112 cards (26/30/28/28 per heat). House limits baked into content:
  two players only, nothing anal (butt massage allowed), light BDSM at heat 4 only.
- `components/afterdark/AfterDarkGame.tsx` — consent gate (every entry), dice roll animation,
  card flip, per-card timers, 3 skips per player, both-hold-3s "turn up the heat" button,
  blocking Pause check-in modal, end-of-night recap. No store.tsx changes (seam untouched).
- Coherence test script (rerunnable): scratchpad simulate.ts pattern — 2000 games x 60 rounds
  asserting cardValid + clothing bounds + heat leaks.

## Previous phase (6) summary
Migration 0003 applied and verified live; identity picker, honest presence, watch-along invite
card, Movie/Series filter, shared AI chat all shipped and deployed from main.

## Shipped this session (see context.md 5d for detail)
1. Display identity: app knows Panda vs Hermi; picker on every open, PIN once per device switch.
2. 1h idle re-lock + activity tracking.
3. Honest presence (heartbeat + freshness; offline on tab hide/close/idle).
4. Watch-along: invite card instead of takeover; cancel/Later are permanent; DB session hygiene.
5. Movie/Series filter (Browse, Watchlist, mood-quiz hard filter); fake Discover loader removed.
6. Shared couple-synced AI chat with attribution + partner notification.
7. Cleanup: OTP dead code + API.rtf deleted, profile Reset fixed, em-dash sweep, couple.jpg
   compressed, `server-only` pinned, `outputFileTracingRoot` set.

## Next steps
- Two-device E2E test (the script is in the plan/context): both log in, presence, invite card,
  sticky cancel, shared AI thread, idle re-lock.
- Optional: compress `public/icon-512.png` (~480K; needs pngquant or similar, sips can't shrink it).
- Optional: delete stray `/Users/eyoel/package-lock.json` (84 bytes, outside the repo; the
  `outputFileTracingRoot` setting already neutralizes it).

## Known gaps (accepted)
- `/us` activity feed is not synced to Supabase (rebuilt locally, resets on live refetch).
- Push notifications when the PWA is closed: future phase.

## Key locations
- Plans/state: `context.md` (living memory), `instructions.md` (patterns playbook).
- Identity/idle/presence: `lib/identity.ts`, `lib/activity.ts`, `lib/live.ts` (trackPresence).
- Watch-along: `components/watch/WatchParty.tsx`, `components/watch/PartyInvite.tsx`,
  `lib/session-prefs.ts`, `supabase/migrations/0003_sessions_ai.sql`.
- AI chat: `lib/store.tsx` (askAi), `lib/live.ts` (push.aiMessage), `components/ai/AssistantButton.tsx`.
- Credentials: `.env.local` (Gemini, Supabase, TMDB) and `.env.netlify.local`. Paths only, never
  values, per workspace rules. The Supabase DB password is NOT stored on this machine.
- Accounts: panda@amoremovies.app / hermi@amoremovies.app, PIN 9009, couple AM-427CD.
