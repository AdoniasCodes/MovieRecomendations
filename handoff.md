# handoff.md — Amore Movies

_Updated: 2026-07-06_

## Current phase
Phase 6 ("Real two-user UX") is SHIPPED: migration 0003 applied by Panda (verified: ai_messages,
reactions.couple_id, watch_sessions.ended_at all live), all commits pushed, Netlify deploy from
main. Next session starts from "Next steps" below.

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
