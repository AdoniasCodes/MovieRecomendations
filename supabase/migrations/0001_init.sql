-- Amore Movies — initial schema (Phase 3).
-- Apply with: supabase db push   (or paste into the Supabase SQL editor).
-- Mirrors lib/store.tsx state so the mock layer swaps in 1:1.

-- ========================= identity & couples =========================

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'You',
  emoji text not null default '🐼',
  color text not null default '#7C3AED',
  taste jsonb not null default '{}'::jsonb,         -- genres, lovedTitleIds, maxViolence, …
  created_at timestamptz not null default now()
);

create table if not exists couples (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,                        -- the invite code (e.g. AMORE-7C3A)
  created_by uuid not null references profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists couple_members (
  couple_id uuid not null references couples(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member',              -- 'me' | 'her' semantics live in the app
  joined_at timestamptz not null default now(),
  primary key (couple_id, user_id)
);

-- membership helper used by every RLS policy
create or replace function is_couple_member(c uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from couple_members m
    where m.couple_id = c and m.user_id = auth.uid()
  );
$$;

-- ========================= title cache (from TMDB) =========================
-- Optional: cache enriched titles so recommendations/RLS don't depend on a live API.

create table if not exists titles (
  id text primary key,                              -- "movie:603" / "tv:1396"
  tmdb_id integer not null,
  media_type text not null check (media_type in ('movie','tv')),
  title text not null,
  year integer,
  data jsonb not null,                              -- full Title shape (genres, vibes, violence, country, …)
  violence smallint not null default 0,
  country text,
  international boolean not null default false,
  updated_at timestamptz not null default now()
);

-- ========================= couple-scoped content =========================

create table if not exists watchlist (
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  added_by uuid not null references profiles(id),
  status text not null default 'interested',
  cinema boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (couple_id, title_id)
);

create table if not exists votes (
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  user_id uuid not null references profiles(id) on delete cascade,
  value text not null check (value in ('like','love','pass','seen')),
  created_at timestamptz not null default now(),
  primary key (couple_id, title_id, user_id)
);

create table if not exists matches (
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  matched_at timestamptz not null default now(),
  primary key (couple_id, title_id)
);

create table if not exists watched (
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  watcher uuid not null references profiles(id) on delete cascade,  -- who watched it
  rating smallint check (rating between 0 and 10),
  created_at timestamptz not null default now(),
  primary key (couple_id, title_id, watcher)
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  author_id uuid not null references profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  type text not null,
  actor_id uuid not null references profiles(id),
  to_id uuid not null references profiles(id),
  title_id text,
  body text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- ========================= watch-along =========================

create table if not exists watch_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid not null references couples(id) on delete cascade,
  title_id text not null,
  host_id uuid not null references profiles(id),
  active boolean not null default true,
  started_at timestamptz not null default now()
);

create table if not exists reactions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references watch_sessions(id) on delete cascade,
  by_user uuid not null references profiles(id) on delete cascade,
  kind text not null check (kind in ('emoji','text')),
  content text not null,
  at timestamptz not null default now()
);

-- ========================= RLS =========================

alter table profiles            enable row level security;
alter table couples             enable row level security;
alter table couple_members      enable row level security;
alter table watchlist           enable row level security;
alter table votes               enable row level security;
alter table matches             enable row level security;
alter table watched             enable row level security;
alter table notes               enable row level security;
alter table notifications       enable row level security;
alter table watch_sessions      enable row level security;
alter table reactions           enable row level security;
alter table titles              enable row level security;

-- profiles: you can read couple-mates, write only yourself
create policy "profiles self read/write" on profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles read couple-mates" on profiles
  for select using (exists (
    select 1 from couple_members a join couple_members b on a.couple_id = b.couple_id
    where a.user_id = auth.uid() and b.user_id = profiles.id));

-- couples & membership
create policy "couples members read" on couples
  for select using (is_couple_member(id));
create policy "couples creator writes" on couples
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());
create policy "membership read" on couple_members
  for select using (is_couple_member(couple_id));
create policy "membership self insert" on couple_members
  for insert with check (user_id = auth.uid());

-- titles cache: readable by any authenticated user
create policy "titles read" on titles for select using (auth.role() = 'authenticated');

-- couple-scoped tables: full access to your couple's rows
create policy "watchlist couple" on watchlist for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "votes couple" on votes for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "matches couple" on matches for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "watched couple" on watched for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "notes couple" on notes for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "notifications couple" on notifications for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "sessions couple" on watch_sessions for all using (is_couple_member(couple_id)) with check (is_couple_member(couple_id));
create policy "reactions couple" on reactions for all using (exists (
  select 1 from watch_sessions s where s.id = reactions.session_id and is_couple_member(s.couple_id)
)) with check (exists (
  select 1 from watch_sessions s where s.id = reactions.session_id and is_couple_member(s.couple_id)
));

-- ========================= realtime =========================
-- Add the live tables to the realtime publication (presence/nudges/watch-along).
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table watch_sessions;
alter publication supabase_realtime add table reactions;
alter publication supabase_realtime add table matches;
