# Supabase backend (Phase 3)

The app runs entirely on the mock store today. This folder holds the schema to go live.

## Go-live checklist
1. Create a free project at https://supabase.com.
2. Project Settings → API → copy the **Project URL** + **anon public** key (and the
   **service_role** key for admin scripts). Put them in `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```
3. Apply the schema — either:
   - **SQL editor:** paste `migrations/0001_init.sql` and run, or
   - **CLI:** `npx supabase link --project-ref <ref>` then `npx supabase db push`.
4. Enable **Auth** (email or magic link) in the dashboard.
5. (Optional) Seed the `titles` cache from TMDB using `TMDB_READ_TOKEN`.

## How the swap works
`lib/supabase.ts` returns `null` until the env is set, so nothing breaks early.
Because every mutation already goes through the named action seam in `lib/store.tsx`,
flipping to Supabase = replacing each action's `dispatch` with a Supabase write +
subscribing the reducer to Realtime channels. Screens don't change.

Tables map 1:1 to the store: `watchlist`, `votes`, `matches`, `watched`, `notes`,
`notifications`, `watch_sessions`, `reactions`. RLS scopes everything to your couple.
`notifications`, `watch_sessions`, `reactions`, `matches` are in the realtime publication
(presence, nudges, watch-along).
