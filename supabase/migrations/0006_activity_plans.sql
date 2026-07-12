-- 0006: couple activity feed + watch night plans

-- Every couple-visible action lands here so the Us feed survives refetches
-- and both partners see the same history.
create table if not exists activity (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  actor_id uuid not null references profiles(id) on delete cascade,
  type text not null,
  title_id text,
  detail text,
  created_at timestamptz not null default now()
);
alter table activity enable row level security;
create policy "activity couple" on activity for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create index if not exists activity_couple_created on activity (couple_id, created_at desc);

-- Planned movie nights. reminded_at is the atomic single-flight lock for the
-- opportunistic push reminder (update ... where reminded_at is null).
create table if not exists watch_plans (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  planned_by uuid not null references profiles(id),
  scheduled_at timestamptz not null,
  status text not null default 'planned' check (status in ('planned', 'done', 'cancelled')),
  reminded_at timestamptz,
  created_at timestamptz not null default now()
);
alter table watch_plans enable row level security;
create policy "plans couple" on watch_plans for all
  using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

alter publication supabase_realtime add table activity;
alter publication supabase_realtime add table watch_plans;
