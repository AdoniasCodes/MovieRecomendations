# handoff.md: Amore Movies

_Updated: 2026-10-18_

## Current: notifications + pause fix (2026-10-18)
Panda: "most things aren't working, login says wrong PIN, no notifications on Android/iOS."
**Root causes (all proven live):**
1. **Supabase free project had paused** (a quiet week). Login, sync and push all died. Panda
   resumed it. Login for both with PIN 9009 returns 200; realtime verified with a two-user probe
   (first event after resume was missed while replication was cold, every later one in ~1.4s).
2. **"Wrong PIN" lied:** `lib/auth.tsx` mapped EVERY sign-in error to it. Now only
   `invalid_credentials` says wrong PIN; anything else says the server is unreachable.
3. **Push depended on the SENDER's phone reaching Netlify** (his ISP drops Netlify). Fixed by
   migration `0008_server_push.sql`: an AFTER INSERT trigger on `notifications` queues a
   `push_jobs` row and calls `/api/push` via pg_net with a nonce. The sender's phone still sends a
   backup call (after the insert, carrying the client-generated notification id). `claim_push()`
   is single-use, so exactly one of the two sends. Route falls back to the old path if 0008 is
   missing (PGRST202), so nothing broke before it is applied.
4. **Every push shared tag `amore-notif`**, so a new one silently replaced the last (no sound).
   Now tag per notification + `renotify` in `public/sw.js`, and `urgency: high`, TTL 1 day.
5. **Per-person push choices:** `notify_prefs.muted` (default mutes watchlisted, started,
   watched, ai), enforced server-side in `claim_push()`. UI: `components/notifications/NotifyPrefs.tsx`
   in Profile, with "Send me a test notification". Watch-along start is now type `party`.
6. **Keepalive:** `netlify/functions/keepalive.mts`, Netlify cron every 3 days, inserts a
   `client_logs` row with `session_id = 'keepalive'` (anon insert, no new secrets). GitHub
   Actions + a bot user was the first plan; writing GitHub secrets was blocked, and this needs none.

Commit `81739c5`. Direct test pushes from the server: Panda's current FCM sub 201, Hermi's Apple
sub 201, Panda's old FCM sub 410 (pruned).

### PANDA MUST DO (guide: `guides/fix-notifications.html`)
1. Paste 0008 into the Supabase SQL editor and Run. Then verify from here: notify_prefs exists,
   insert a notification and see push_jobs drained (claimed) within seconds.
2. Galaxy: Chrome to Never sleeping apps + Battery Unrestricted. Hermi: open from Home Screen
   icon, notifications allowed, Focus allow-list.
3. Both: Profile > Turn on alerts > Send me a test.

### Open / next
- First keepalive row should appear within 3 days of the deploy: check
  `client_logs?session_id=eq.keepalive`. One manual row from 2026-10-18 already exists (the probe).
- Notification tap opens `/`. Deep link to the title is a possible next step (asked Panda).
- Junk rows to delete via SQL editor someday: `client_logs` `probe-verify` and the 2026-10-18 keepalive probe (harmless).
- Pre-existing em-dash debt in code comments and the three docs (not touched here).
- Hosting: stay on Netlify. The push path no longer depends on the sender reaching Netlify.

## Taste brief (still current, carried over from the retired context.md)
This drives `lib/recommend.ts` and has not changed:
- **Panda (id `"me"`):** crime, psychological thriller, mystery, detective, dark drama. Fine
  with blood, gore and brutal action (John Wick, The Boys), sometimes prefers it. Loved-title
  seed: True Detective, Mindhunter, Breaking Bad, Dark, Severance, Fargo, Prisoners, Zodiac,
  Se7en, The Boys.
- **Hermi (id `"her"`):** dislikes blood, gore and heavy action. Hard filter for her and for
  "together". Loves wholesome: animation, comedy, drama, feel-good. Crime is OK only if
  low-violence and cerebral (the mental game, not the carnage). Loves international film:
  Turkish, Korean, Japanese, Chinese, not just Hollywood.
- **Neither likes Bollywood / Indian cinema:** excluded (`EXCLUDED_COUNTRIES`).
- **Together mode:** blend both tastes BUT hard-filter high gore/violence (her rule wins),
  lean toward cerebral crime, wholesome and international titles.

## Credentials
Paths only, never values: `.env.local` (dev keys: Supabase, TMDB, Gemini, web push) and
`.env.netlify.local`. Both gitignored. Production values live in the Netlify env UI.

## Where the history went
- `archive/handoff-2026-08.md`: the 2026-08-16 sync wedge fix (root cause, probes, deploy check).
handoff.md is the ONLY living state file (context.md is retired; do not recreate it).
- `docs/handoff-archive-phases-6-13.md`: verbatim phase history (Phases 6 to 13, the
  2026-08-01 anniversary day, the July sync bug hunts, the npm-to-pnpm note).
- `docs/context-archive.md`: the retired context.md, kept verbatim for history.
- `docs/instructions-archive.md`: instructions.md as it was before the 2026-08-17 prune.
