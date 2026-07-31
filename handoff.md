# handoff.md — Amore Movies

_Updated: 2026-07-30_

## CURRENT PHASE (2026-07-30): Phase 13 "Year One" BUILT + PUSHED, awaiting content + 2 manual steps
Their first anniversary is **TOMORROW, 2026-07-31**. Two features shipped in commit 1043fd8
(pushed to main). E2E 17/17 green on a local prod build.

### A. The anniversary experience
- **`lib/anniversary/script.ts` is the entire content file.** The night is a flat list of
  modules: banner, letters, voice notes, photos, guess-the-photo game, us-in-numbers, the 5
  itinerary stops, jokes, finale. Editing that one file changes everything Hermi sees.
- **Panda is the director.** `/anniversary` (reached from the new "Year One" card in Profile)
  lists every module: tap to send it to her screen, any order, skip anything, preview locally
  before sending, plus Ping her phone / Hold screen / Release and a live "on her screen" ack.
  Nothing is time-gated except the morning, by Panda's explicit decision (a real day drifts).
- **Her side** is `components/anniversary/AnniversaryStage.tsx`, mounted in providers.tsx at
  **z-[90]** (above everything except WelcomeGate at 100). Ambient holding screen between
  modules so she never falls back into the normal app mid-story. On July 31 her first open
  fires the banner and walks to the first letter by itself, once per device
  (`amore-movies/anniv-2026-opened`), then waits for him. A long press on the faint top-right
  dot releases the takeover if anything ever goes wrong.
- **Reopenable forever** from Profile. From Aug 1 either of them can drive it or walk it alone
  on one phone ("Or walk through it all on this phone").
- **Itinerary as Panda described it:** ~3pm the room (cake, flowers, wine, private), ~4:35pm
  tattoos, evening cocktails + dinner, late hookah, ~11pm back to the room into the finale.

### B. After Dark Pulse (the 18+ addition)
- `lib/haptics.ts` + `components/afterdark/PulseRemote.tsx`, entered from a new Pulse tile on
  the After Dark consent screen (so the house rules are always seen first).
- **Device reality:** Panda's Android runs every pattern including a genuinely solid buzz.
  **Hermi's iPhone 14 Pro Max cannot vibrate from a web page at all** (`navigator.vibrate` does
  not exist in Safari); it falls back to the iOS 17.4 `<input switch>` taptic trick, which can
  only TAP, never hold. Rhythms work, sustained buzz does not. The UI says so.
  **This is why role swap exists:** one tap and his Android becomes the receiver instead.
- Modes: constant, pulse, wave, heartbeat, tease. Level changes duty cycle and tempo, not
  strength (the web has no amplitude control anywhere).
- Safety: receiver always has a full-width Stop, auto-stops on background / 10s link gap /
  20min cap, holds a screen Wake Lock, needs an arming tap. No DB writes, no notifications.

### Architecture notes worth knowing before touching it
- Transport is Supabase **broadcast** (`lib/broadcast.ts`), so **NO MIGRATION** is needed.
  Nothing for Panda to run in the SQL editor.
- `lib/broadcast.ts` shares ONE channel per topic per client, reference counted. A client
  cannot hold two subscriptions to the same topic, and Panda's phone has both the global stage
  and the director panel wanting `stage:<coupleId>`. See instructions.md §8d.
- Gating uses `identityFromEmail(auth.session?.user.email)`, NOT the display toggle, and fails
  closed while auth loads. The toggle reads "panda" on a cold load and flashed the whole
  surprise open for one render. See instructions.md §8e.

### CONTENT IS IN AND LIVE (2026-07-31, commit 8e6d61a)
- **12 photos** in `public/anniversary/photos/` (3.2MB, longest edge 1400, orientation
  checked). `cutout-us.png` stays PNG for its alpha. All 12 verified 200 on the live site.
- **3 voice notes** as `note-1.mp3` (3:06), `note-2.mp3` (1:03), `note-3.mp3` (3:06),
  numbered rather than tied to a time of day because Panda picks the moment. Transcoded
  mono 96k (17.3MB down to 4.9MB); durations and levels checked against the originals.
- **Both remaining letters written** (`letter-year`, `letter-promise`). Zero `REPLACE ME`
  left anywhere in script.ts. Joke modules dropped (no material, and empty cards are worse).
- Numbers module uses real values including today's 2 tattoos and 5 stops.
- **Fixed:** the stage rendered an `<audio>` for a non-existent ambient track, so every
  takeover 404d on her phone and showed a dead mute button. Now behind `AMBIENT_SRC`, null
  until a file exists. To add music: drop `public/anniversary/audio/ambient.mp3` and set
  that constant.
- E2E `probe-day.mjs` **12/12** on a local prod build: morning takeover fires with no input,
  seal opens on a real 2s hold, photo and voice modules land with the real jpg decoded and
  the real mp3 loaded, zero broken asset requests.
- Deploy verified live: all 15 assets return 200 with exact byte counts, content strings
  present in shared chunk `953-*.js`, and `ambient.mp3` is absent from the bundle.

### Letters dropped, music added, demo mode added (commit 135ce5b, live)
- **All three letters removed.** Panda: everything he wanted to say is in the voice notes, and
  a letter competing with his own voice is noise. The `message` kind and its hold-to-open seal
  renderer still exist in the code if a letter is ever wanted again; there are just no
  instances. The morning open is now the **banner alone**, then "the rest of today comes from
  me", then she closes it.
- **Ambient music:** `public/anniversary/audio/ambient.mp3`, a synthesised warm I-vi-IV-V pad,
  32s seamless loop, 513K. Generated with ffmpeg rather than sourced so there is no licensing
  question. Regenerate or replace freely; `AMBIENT_SRC` in AnniversaryStage points at it.
- **Demo mode** (`lib/anniversary/demo.ts` + toggle in Profile, Panda only, hidden once the
  day has passed):
  - **Device-local localStorage, deliberately NOT an account or DB flag.** That is what lets
    him enable it as himself, switch to her account on the SAME phone, watch her side, then
    switch back and turn it off. It also means her phone can never be put in demo mode.
  - While on: the stage ignores the date gate, ignores the once-per-device flag, and **never
    writes that flag**, so rehearsing cannot consume her real first open.
  - Her side becomes a full walkthrough of all 25 modules with Next/Back, under a loud DEMO
    badge with an Exit.
- E2E: `probe-demo.mjs` **13/13** (asserts the one-shot flag is identical before and after a
  full rehearsal, and that the switch survives the round trip back to his account) and
  `probe-day.mjs` **11/11**. Deploy verified live: ambient 200 with exact bytes, DEMO badge in
  the layout chunk, zero letter strings anywhere in the bundle.

### Round 3 of Panda's feedback (2026-07-31, commit 27a57d2, live)
- **Captions rewritten** with his real context (I had none: I was writing from the images
  alone). The night-out photo was NOT the eve of the anniversary, it is an ordinary night;
  the red sweater day had no photoshoot; the sideways photo she hates is now openly "the best
  photo I have of you". If a caption is ever wrong, it is one line in script.ts.
- **Guessing game deleted.** Blurred photos are unreadable on a phone and a wrong answer just
  feels bad. Replaced by three **question decks** (27 prompts, no right answers, no scoring):
  how we started, the year we had, the lighter round. New module kind `questions`.
- **The day is no longer a fixed itinerary.** No authored step numbers and no times, because
  he picks the order live. Sending an item appends it to `plan` (persisted under
  `amore-movies/anniv-plan`, broadcast with every `show`), and its POSITION in that list is the
  step number she sees, with everything already sent listed underneath. Re-sending keeps the
  original position. There is a "Today so far" strip and a Reset order button in his panel.
  Cocktails and dinner are separate, and there are **18 activities** including bowling, coffee,
  live music, cinema, a walk, dessert, arcade, spa, a view and a night drive.
- **Numbers became a slideshow**: photos crossfading behind, each number rising from below.
- **Music is his own song** (`ambient.mp3`, Dawit Tsige, 5:35, mono 96k, 3.8MB). Because it has
  vocals, `lib/anniversary/audio-bus.ts` pauses it whenever a voice note plays and resumes
  after; a deliberate mute is never overridden. Volume sits at 0.2.
- **Pulse was never broken.** Verified end to end: solo drives the motor, the receiver gets
  driven from the other phone, level 5 is one unbroken [4000] buzz, Stop silences. The real
  problem was that the controller phone never buzzes ITSELF, so "I am driving" with nobody
  receiving did nothing and read as broken. It now says so plainly and offers a one-tap
  "feel it on this phone instead".
- E2E **29/29** across three suites in the scratchpad: `probe-pulse.mjs` (5), `probe-demo.mjs`
  (13), `probe-day.mjs` (11).

### Rehearsal cleanup (2026-07-31, commit 2631ce2, live) READY FOR THE REAL THING
- Panda rehearsed with his phone as himself and his PC signed in as Hermi, confirmed it all
  works, and turned demo mode off.
- **Verified against the live database as her: 0 notifications, 0 activity rows, 0 unread,
  0 push subscriptions.** The anniversary feature writes nothing to the DB by design and that
  now has evidence behind it, so there was no server-side history to remove.
- **"Clear the rehearsal and start clean"** button added to the bottom of the director panel
  (blocking confirm, then a confirmation with an OK button, per the workspace rule). It clears
  the running order (`amore-movies/anniv-plan`), resets every module to unsent, and broadcasts
  `end`, which ALSO releases and clears the cached screen on any other device still signed in
  as her. That last part matters: a second logged-in device keeps answering the panel, and its
  ack can masquerade as her real phone in the "on her screen" indicator.
- **Known trap for the night:** if the PC stays signed in as Hermi it will receive every module
  and ack it, so the panel may show "Landed" from the PC rather than her phone. Sign it out or
  close that tab before the real run.
- E2E **39/39** across four suites: `probe-pulse.mjs` (5), `probe-demo.mjs` (13),
  `probe-day.mjs` (11), `probe-reset.mjs` (10, proves the plan is erased, the other device
  releases and drops its cache, and the next thing sent is numbered 1 again).

### Environment notes from this session
- Workspace moved to **pnpm**. `netlify.toml` now runs `pnpm run build` and it **works on
  Netlify** (verified: deploy landed ~2 min after push). Use `pnpm exec next start -p 3001`
  locally, NOT `pnpm start -- -p 3001` (pnpm forwards the `--` and next reads `-p` as a
  directory).
- `playwright-core` was a phantom npm dependency and is NOT reachable under pnpm. The probe
  now lives in the scratchpad with its own `pnpm add playwright-core`. Do not add it to the
  app's package.json.
- The disk filled completely mid-session and wiped the scratchpad plus the Playwright
  browser cache. Reinstall with `pnpm exec playwright-core install chromium` and update the
  chromium-XXXX path in the probe.

### Did Hermi see the accidental trigger? No.
Panda tapped into the anniversary flow on prod on 2026-07-30 and worried she was notified.
The whole feature has **exactly one** notification path, `pingPartnerDevice` at
`DirectorPanel.tsx:140` (the explicit "Ping her phone" button). Nothing else writes to the
DB or notifies. Opening the card or the panel does nothing to her device; firing a module is
an ephemeral broadcast that only lands if her app is open and joined at that second. Nothing
is consumed either: the one-shot flag is only ever set on HER device.

### PANDA MUST DO (in priority order)
1. **TONIGHT, BEFORE MIDNIGHT: get Hermi to open the app once.** She has not opened it since
   July 12, so her iPhone is running a stale bundle and none of this reaches her until it
   loads the new code. Any pretext works (nudge her about a movie). Then have her do
   **Profile > Turn on alerts** (she still has 0 push subscriptions) so "Ping her phone" works.
   **No amount of code covers this step.**
2. ~~Drop the content.~~ **DONE 2026-07-31**, see the section above.
3. **Dress rehearsal** before sleeping: open `/anniversary` on his phone against her phone (or
   a second browser), fire a few modules, confirm they land.
4. Test Pulse on her actual iPhone at some point today. The taptic path cannot be verified
   from this machine. If it feels like nothing, use Swap so his Android receives.

### Verification done
- `pnpm run build` green. Two-user Playwright probe **17/17** on a local prod build:
  lockout (card hidden + URL locked, no panel leak), module lands and acks, reload resumes
  mid-story, channel re-acks after reconnect, holding screen, release, pulse drives a real
  motor, auto-stop when hidden, her Stop wins, role swap flips both sides.
  Probe: `scratchpad/probe-anniv.mjs` (see instructions.md §8b for the two new flakiness
  rules it encodes).
- **Deploy VERIFIED LIVE** (commits 1043fd8 + 5f86294 on main). `/anniversary` returns 200 (a
  route that did not exist before), and all four bundles were grepped on the live site:
  anniversary page chunk ("You are the director", "Ping her phone", "Not this one"), after-dark
  chunk ("One of you drives", "I am holding it", "iPhone can only tap"), layout chunk
  ("Stay right here", "There is more"), and shared chunk 665 (the script.ts content).
  NOTE: Netlify's PAGE chunk hashes differ from a local build (local
  `page-ef14bd95092dbdf3.js` is `page-d76cf9021a8fd3be.js` live), so always pull the page chunk
  path out of the live HTML first. Shared chunks like `665-*.js` do match local.
- Known pre-existing noise, NOT a regression: React #418 hydration warning for Hermi on `/`
  and `/profile`, caused by useWhoami's server snapshot defaulting to "panda". Reproduced on
  pages with no anniversary code.

### Planned, deliberately NOT built (Panda asked to keep it in mind)
Two or three couple mini games tailored to them, most likely **Would You Rather** and
**Truth or Dare**, written specifically for Panda and Hermi rather than generic packs. Natural
home is a tile in Us or its own tab, reusing `lib/afterdark/deck.ts` card structure plus the
existing per-card timer and skip mechanics. Also considered and dropped: pulling their
conversation text out of Snapchat via API.

## Current phase (2026-07-24/25): Phase 12 "Notifications actually flow" SHIPPED + DEPLOY VERIFIED
Panda reported: Hermi's actions never appear in his in-app notification board; wanted a
nudge graphic; wanted Android push if possible. Live-DB diagnosis (scratchpad probes with
both PIN accounts) proved the backend was HEALTHY (inserts + realtime fire with the app's
exact filter) but **Hermi's phone wrote NOTHING to Supabase since Jul 12** (her last real
write: watchlist add Jul 7; the Jul 12 rows were probe residue).

**ROOT CAUSE (the big one): silent demo-mode trap in lib/auth.tsx.** loadAll raced an 8s
timeout and swallowed query errors, so a flaky boot left couple=null => live=false =>
the whole app silently ran demo mode while looking signed-in and normal. The loadedFor
dedup then marked that user "loaded", so hourly TOKEN_REFRESHED events skipped reloading
forever. One bad boot = nothing syncs until a full app restart. Fixed:
1. loadAll returns success/failure; a transient error can no longer read as "unpaired"
   or clear valid couple state; failed loads clear the dedup key.
2. Self-heal effect: while session exists but couple/partner unresolved, retry on 4s,
   every 20s, on `online`, and on foreground.
3. components/SyncStatus.tsx: unmissable red "Not synced" top strip (tap = refresh) after
   6s of signed-in-but-not-live. Silent demo mode is now impossible.
4. lib/live.ts realtime: partner-authored events (payload actor column vs ids.my) ALWAYS
   refetch, bypassing the 4s self-echo window (a rapid nudge exchange used to be
   swallowed — caught live by the E2E probe).

**Android push: WAS NEVER BROKEN.** Panda's FCM subscription (sole row in
push_subscriptions, Jul 12) delivered a live test push sent via POST /api/push
(sent:1) and Panda confirmed it arrived on his phone. He never got pushes because pushes
are sent by the PARTNER's app when it mirrors an action — and Hermi's app never mirrored
(see root cause). **Hermi's phone still needs: one fresh app open (new bundle), then
Profile > Turn on alerts** (she has 0 push subscriptions).

**Nudge graphics (new):** components/notifications/NudgeOverlay.tsx — full z-[60]
takeover on a fresh (<2 min) incoming nudge: waving-hand animation, rising hearts,
poster, strong vibrate, one-tap "Nudge back". Generic bell banner suppressed for nudges.
Sender side: TitleSheet nudge button flips to "Nudged {name}!" with a heart burst and
guards double-taps (real double-nudges existed in the DB from Jul 12).

**Notification coverage (Panda's ask: partner follows along on everything):** added
notify on rate/rateAs (incl. on partner's behalf), finished/paused/dropped status,
markWatched (both), love => "LOVED X 💖", seen votes, unsave, cancelPlan, watch-along
wrap-up. New NotificationType "watched" + "party" (DB type column is unconstrained text,
NO migration needed). Bell ICON map covers plan/ai/watched/party.

E2E: scratchpad probe-nudge.mjs, 10/10 green on local prod build (both users via PIN
gate; nudge => overlay; nudge-back inside the echo window; sender feedback; auto-dismiss;
SyncStatus appears when couple_members is blocked and SELF-HEALS when unblocked; healthy
mode shows no banner; test nudges auto-deleted). Commits 9c79332 + ba2061c pushed to main;
BOTH VERIFIED LIVE by grepping deployed chunks (layout chunk: "nudged you"/"Not synced";
chunk 695: "LOVED"/"cancelled the plan"). NOTE: Netlify posts NO GitHub commit status on
this repo — verify deploys by grepping deployed chunk JS, not CI.

**Next testing session (Panda said more testing/fixing coming):**
- Hermi's phone: open app fresh (kill + reopen; VPN if her route is bad), watch for the
  red "Not synced" strip — if it appears and won't clear, that phone's network to
  Supabase is the problem. Then Profile > Turn on alerts on her phone.
- Then a real cross-device test: she likes/rates/nudges => Panda's board + push.
- Residue: Panda's real nudge to Hermi (Reply 1988, Jul 24) left as-is. Test pushes were
  sent to Panda's phone during E2E (expected).

## Previous phase (2026-07-12): Phase 11 "The Smooth Update" SHIPPED, 2 manual steps
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

## 2026-07-30 — moved from npm to pnpm
This project now uses **pnpm**. Use `pnpm install` / `pnpm dev` / `pnpm build`, never npm.
Lockfile is `pnpm-lock.yaml` (converted from `package-lock.json` with `pnpm import`, so
dependency versions are unchanged). Full record + rollback steps:
`/Users/eyoel/vibecoding/PNPM-MIGRATION-2026-07-30.md`.
