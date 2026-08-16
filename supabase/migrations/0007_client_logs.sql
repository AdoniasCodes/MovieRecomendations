-- 0007: client_logs, the flight recorder for "it says not synced on my phone".
--
-- Why this table exists. The sync failure only ever happened on Panda's phone,
-- and a phone has no console anyone can read. lib/diag.ts keeps a small ring
-- buffer of connection events on the device and posts it here, so the failure
-- can be read out of the database afterwards instead of guessed at.
--
-- Deliberate design choice: INSERT is allowed to the ANON role, not just to
-- authenticated users. The single most important moment to capture is the one
-- where auth itself is wedged, and a logger that needs a working session is
-- useless exactly when it is needed. Reading is authenticated-only, so the logs
-- are write-only from the outside.
--
-- Nothing sensitive goes in here by contract (see the header of lib/diag.ts):
-- event kinds, short details, timings and a device summary. No tokens, no PINs,
-- no message bodies.

create table if not exists public.client_logs (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  -- one app-open, so a single incident can be read as a unit
  session_id  text,
  -- "panda" | "hermi" | null, best effort
  who         text,
  -- why the log was sent: "not-synced", "repair-failed", "manual"
  reason      text,
  device      jsonb,
  entries     jsonb
);

create index if not exists client_logs_created_idx on public.client_logs (created_at desc);
create index if not exists client_logs_session_idx on public.client_logs (session_id);

alter table public.client_logs enable row level security;

-- write-only from the app, including when signed out or auth-wedged
drop policy if exists client_logs_insert on public.client_logs;
create policy client_logs_insert on public.client_logs
  for insert to anon, authenticated
  with check (true);

-- readable only by a signed-in user (in practice: the two of them, and the
-- Supabase dashboard)
drop policy if exists client_logs_select on public.client_logs;
create policy client_logs_select on public.client_logs
  for select to authenticated
  using (true);

-- Housekeeping: this is debug data, it should not accumulate forever. Deleting
-- old rows is allowed so a maintenance pass can prune, and the app's own
-- Connection screen prunes nothing.
drop policy if exists client_logs_delete on public.client_logs;
create policy client_logs_delete on public.client_logs
  for delete to authenticated
  using (created_at < now() - interval '30 days');
