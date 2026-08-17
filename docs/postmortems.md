# Post-mortems

Long-form incident write-ups moved out of instructions.md. The standing rules each one
produced stay in instructions.md; this file keeps the full story for when the context of a
rule matters.

## THE WEDGE: why "not synced" needed a force-quit (2026-08-16, was instructions.md §8g)

The longest-running bug in this project. Symptom: the red "Not synced" strip, tapping
reconnect does nothing, VPN makes no difference, and only force-quitting and reopening the
app fixes it. Root cause, confirmed by probe:

**supabase-js ships no fetch timeout, so a request that HANGS never settles.** On a route
that black-holes packets (Panda's ISP does this) a request does not fail, it hangs. If the
hung request is the token refresh, auth-js parks its single-flight promise
(`refreshingDeferred`) and never resolves it. Every later `getSession()` returns that same
dead promise, and since supabase-js calls `_getAccessToken()` (which calls `getSession()`)
before EVERY REST request, all reads and writes hang forever, with no error, for the life of
the page. Destroying the JS context is the only escape, which is exactly why reopening the
app worked and every in-app retry did not.

Four defects were fixed together on 2026-08-16 (see handoff.md and
docs/handoff-archive-phases-6-13.md for the fix-by-fix account):
1. No fetch deadline on the Supabase client.
2. The recovery paths themselves awaited un-timed calls, so they hung with everything else
   (the self-heal loop's `busy` flag stayed true forever; the reconnect spinner span until a
   restart).
3. "Tap to reconnect" re-ran the same queries with the same stale token instead of doing
   what a restart does (fresh token, reload, rebuild sockets).
4. The main couple-sync channel (`subscribeCoupleChanges`, `trackPresence`) had a bare
   `.subscribe()` with no retry or rejoin, so one screen lock silenced partner updates until
   a remount.

Reproduction: a local HTTP server that accepts the connection and never answers
(`scratchpad/probe-wedge.mjs`). That is what a black-holed route looks like to fetch, and it
is deterministic. A stock client stays pending forever; the fixed one settles at 20s. A
healthy route still answers in about 1.4s, so the deadline costs nothing.

The standing rules distilled from this live in instructions.md §8g: fetch deadline on the
client, bounded awaits on every recovery path, reconnect as a real repair (token first),
`managedChannel` for every realtime channel, and phone-side diagnostics that never depend on
the possibly-broken supabase-js client.
