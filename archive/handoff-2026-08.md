# handoff archive: 2026-08 (sync wedge fix, verified)

## THE SYNC BUG IS ROOT-CAUSED AND FIXED (2026-08-16)
Panda: "it says not synced and tap to reconnect, tapping does nothing, the VPN does not help,
but closing the app and reopening it works." Months of this. It was never the network on its
own and it was never the host.

**Root cause: a hung request, not a failed one.** supabase-js creates its client with no fetch
timeout. On a route that black-holes packets (his ISP does exactly this) a request does not
fail, it hangs. When the hung request is the token refresh, auth-js parks its single-flight
promise `refreshingDeferred` and never settles it. Every later `getSession()` returns that same
dead promise, and supabase-js calls `_getAccessToken()` (which calls `getSession()`) before
EVERY REST request. So one hang froze every read and write for the life of the page, with no
error and no rejection. Only destroying the JS context escaped it, which is precisely why
force-quitting worked, why tapping reconnect never did, and why the VPN was irrelevant: the jam
was inside the tab, not on the wire.

Four defects fixed, all real, all proven:
1. **No fetch deadline.** `lib/supabase.ts` now passes `global: { fetch: timedFetch }`, a 20s
   AbortController wrapper. auth-js treats an abort as a retryable fetch error, so the deferred
   settles and the app can heal instead of needing a restart. Slow and failed requests are
   logged with timings.
2. **The recovery paths could hang too.** The self-heal loop and the reconnect handler awaited
   un-timed calls, so they hung with everything else: the loop's `busy` flag stayed true forever
   (killing the 20s retry after its FIRST stall) and the reconnect spinner span until a restart.
   Everything now goes through `withTimeout` in `lib/auth.tsx`. The loop also ESCALATES: from
   the third attempt it forces a token refresh first, which is the one thing a restart did that
   a retry never did.
3. **"Tap to reconnect" could not fix what it reported.** It re-ran the same six queries with
   the same stale token. New `auth.reconnect()` does what a restart does, in order: fresh token,
   reload the couple slice, rebuild the realtime socket and every channel. The strip now
   escalates honestly, offering "Restart the app" when repair genuinely fails, instead of
   spinning.
4. **The main sync channel had NO recovery at all.** `subscribeCoupleChanges` and
   `trackPresence` were opened with a bare `.subscribe()`: no status callback, no retry, no
   rejoin. `lib/broadcast.ts` was hardened on 2026-08-01 but this file, which carries the actual
   couple sync, never was. A phone drops its websocket on every screen lock, so one lock stopped
   partner updates until a remount. Both now go through `managedChannel` (backoff rejoin, kick
   on online/foreground, forced rebuild after >4s hidden), and a REjoin triggers a refetch since
   anything she did during the gap was never delivered.

**New maintenance surface (Panda asked for logs he could hand over):**
- `lib/diag.ts` a flight recorder: 300-entry ring buffer of connection events, mirrored to
  localStorage so it survives a force-quit. By contract it never records tokens, PINs or
  message bodies, so it can always be uploaded without thinking about it.
- `lib/health.ts` tests the four legs separately and IN PARALLEL (auth / data / realtime /
  host), so a wedged leg can never hide the others.
- `components/ConnectionCard.tsx` in Profile: live status, Test connection, Repair now, Send
  log, Copy log, Restart the app.
- The strip auto-uploads the log once per app-open when it appears, so the next failure is
  readable from the DB without Panda doing anything.

### PANDA MUST DO: ALL DONE (2026-08-16)
1. ~~Apply migration 0007.~~ **APPLIED by Panda and VERIFIED against the live DB from here:**
   anon INSERT returns 201 (the exact call `diag.upload` makes) and an authenticated SELECT
   reads the row back. Both halves of the logging path work, so a phone's log really can be
   read from the database later.
2. ~~Open the app once on the phone.~~ **DONE.** Panda cleared the phone's site data, reloaded,
   and confirmed the fix works **both in the browser and in the installed PWA**. First load took
   2 to 3 seconds (normal cold load, nothing was cached).

### Known warts from this session
- **One junk row in `client_logs`** (`session_id = 'probe-verify'`), written from this machine to
  prove the insert path. It CANNOT be removed by the app or by an authenticated user, because
  the delete policy in 0007 is `using (created_at < now() - interval '30 days')`. Remove it from
  the Supabase SQL editor (service role bypasses RLS):
  `delete from public.client_logs where session_id = 'probe-verify';`
  It ages out by itself after 30 days and is harmless until then.
- Optional, low priority: if pruning debug logs on demand is ever wanted, relax that policy to
  `using (true)`. Nothing depends on it today, so this was deliberately NOT turned into another
  migration for Panda to run.
- **Clearing site data is a one-time tool, not a habit.** It signs the device out (PIN again on
  next open) and wipes the on-device `diag` log, which is exactly the evidence needed if the
  sync ever misbehaves again. The service worker updates itself on its own now.
- Pre-existing em-dash debt, NOT introduced this session and deliberately not bundled into a
  bugfix commit: 42 in code comments (incl. `lib/ai.ts` lines 27 to 28, which feed the AI system
  prompt and so can shape user-visible output) and 49 across the three docs. Worth its own sweep.

### Verification
- `scratchpad/probe-wedge.mjs` 8/8 against the REAL `lib/supabase.ts`, using a local server that
  accepts the connection and never answers (what a black-holed route looks like to fetch).
  The two BASELINE checks reproduce the bug on a stock client: a query stays pending forever,
  and after a hung refresh every later query jams forever. The fixed client settles at 20s and
  stays usable. A healthy route still answers in ~1.4s, so the deadline costs nothing.
- `scratchpad/probe-sync.mjs`: browser E2E on a local prod build against the real project.
- `pnpm run build` green, typecheck clean, em-dash check clean on every touched file.
- **Deploy VERIFIED LIVE** (commit a17adf4). Netlify page-chunk hashes differ from local as
  always, so this was checked by CONTENT, per instructions §6: the profile chunk
  (`page-7af950cc45ad9ac9.js`) carries "Test connection", "Repair now", "Live updates",
  "App server", "Restart the app"; the layout chunk has "Still not syncing"; and shared chunk
  `176-7602f6c13a6e2571.js` carries the recovery internals ("rt.rejoined", "repair.start",
  "net.timeout", "heal.token", "rt.revive", "amore-movies/diag").
- Two probes kept in the session scratchpad: `probe-wedge.mjs` (node, needs esbuild +
  @supabase/supabase-js) and `probe-sync.mjs` (playwright-core + chromium). Both are
  rerunnable and each check maps to a real reported symptom.

### Hosting: do NOT move yet
He offered to switch to Vercel or Cloudflare. Moving would not have fixed this: the wedge was
in the client, and Supabase (which carries all couple sync) is already behind Cloudflare and
reachable from his ISP. Netlify is the flaky leg, and it only affects loading the app and
`/api/*` (Discover refresh, AI, sending push). Vercel geo-routes to Frankfurt too, so it is
likely the same route. The real durable fix remains the already-approved, still-unbuilt one: a
cheap domain proxied through Cloudflare in front of the same Netlify site. Ship this first and
read the "App server" leg in the Connection test before spending a day on it.


