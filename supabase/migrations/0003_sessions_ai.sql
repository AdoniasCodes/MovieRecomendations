-- Amore Movies — watch-session hygiene + AI assistant messages (Group C).
-- Apply after 0001_init.sql (paste into the Supabase SQL editor or `supabase db push`).
-- Fixes watch-along "resurrection" bugs and lands the ai_messages table up front
-- so a single migration covers the assistant feature too.

-- ========================= watch-session lifecycle =========================

alter table watch_sessions add column if not exists ended_at timestamptz;

-- one-time hygiene: retire any session that's been "active" for over 4 hours,
-- so stale rows can never auto-open the watch-along overlay on next load.
update watch_sessions
  set active = false, ended_at = now()
  where active = true and started_at < now() - interval '4 hours';

-- ========================= couple-scoped reactions =========================
-- reactions had no couple_id, forcing an unfiltered realtime listen (refetch
-- storms from any couple). Add it, backfill from the parent session, index it.

alter table reactions
  add column if not exists couple_id uuid references couples(id) on delete cascade;

update reactions r
  set couple_id = s.couple_id
  from watch_sessions s
  where r.session_id = s.id and r.couple_id is null;

create index if not exists reactions_couple_id_idx on reactions (couple_id);

-- ========================= AI assistant messages =========================

create table if not exists ai_messages (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  author_id uuid not null references profiles(id) on delete cascade,
  role text not null check (role in ('user','ai')),
  body text not null,
  picks jsonb,
  source text,
  created_at timestamptz not null default now()
);

create index if not exists ai_messages_couple_created_idx on ai_messages (couple_id, created_at);

-- ========================= RLS =========================

alter table ai_messages enable row level security;

create policy "ai_messages couple" on ai_messages
  for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));

-- ========================= realtime =========================

alter publication supabase_realtime add table ai_messages;
