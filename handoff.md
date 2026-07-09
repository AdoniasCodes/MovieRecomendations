# handoff.md — Amore Movies

_Updated: 2026-07-06_

## Current phase (2026-07-09): Phase 8 "Fix the couple loop" SHIPPED, 2 manual steps pending
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
