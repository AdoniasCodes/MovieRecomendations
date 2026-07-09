-- 0004: fix cross-device sync + web push subscriptions
-- Panda applies this via the Supabase SQL editor (MCP is read-only).

-- 1) These tables were never added to the realtime publication, so a partner's
--    status / rating / vote / note changes fired no event on the other device.
--    (notifications, matches, watch_sessions, reactions, ai_messages were
--    already in; cinema only "worked" by piggybacking on notifications.)
alter publication supabase_realtime add table watchlist;
alter publication supabase_realtime add table watched;
alter publication supabase_realtime add table votes;
alter publication supabase_realtime add table notes;

-- 2) Web push: one row per registered device.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table push_subscriptions enable row level security;

-- you manage your own devices
create policy "push own" on push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- your couple partner may read your subscriptions (to send you a push)
-- and delete them (to prune dead endpoints on 404/410)
create policy "push couple read" on push_subscriptions
  for select using (
    exists (
      select 1
      from couple_members m1
      join couple_members m2 on m1.couple_id = m2.couple_id
      where m1.user_id = auth.uid()
        and m2.user_id = push_subscriptions.user_id
    )
  );

create policy "push couple prune" on push_subscriptions
  for delete using (
    exists (
      select 1
      from couple_members m1
      join couple_members m2 on m1.couple_id = m2.couple_id
      where m1.user_id = auth.uid()
        and m2.user_id = push_subscriptions.user_id
    )
  );
