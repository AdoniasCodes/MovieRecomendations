-- 0008: server-side push + per-person notification choices.
-- Panda applies this via the Supabase SQL editor (paste the whole file, Run).
--
-- Why: until now the SENDER's phone called /api/push to knock on the partner's
-- phone. Panda's ISP drops Netlify on and off, so his knocks silently never
-- left. Now the database itself calls /api/push the moment a notification row
-- lands (pg_net, from Supabase's servers, which always reach Netlify). The
-- client still calls too, as a backup; claim_push() makes sure only ONE of
-- the two actually sends.

create extension if not exists pg_net;

-- 1) What each person wants on their lock screen. No row = the defaults below.
--    The bell inside the app still shows everything; this only filters pushes.
create table if not exists public.notify_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  muted text[] not null default '{watchlisted,started,watched,ai}',
  updated_at timestamptz not null default now()
);
alter table public.notify_prefs enable row level security;
drop policy if exists "prefs own" on public.notify_prefs;
create policy "prefs own" on public.notify_prefs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 2) One pending knock per notification. No policies on purpose: only the
--    security definer functions below may touch it.
create table if not exists public.push_jobs (
  notification_id uuid primary key references public.notifications(id) on delete cascade,
  nonce text not null,
  created_at timestamptz not null default now()
);
alter table public.push_jobs enable row level security;

-- 3) On every new notification: queue a job and ask the server to send it.
--    A pg_net failure must never block the notification itself.
create or replace function public.enqueue_push() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare
  n text := encode(gen_random_bytes(18), 'hex');
begin
  delete from push_jobs where created_at < now() - interval '1 day';
  insert into push_jobs (notification_id, nonce) values (new.id, n)
    on conflict (notification_id) do nothing;
  begin
    perform net.http_post(
      url := 'https://amoremovies.netlify.app/api/push',
      body := jsonb_build_object('notificationId', new.id, 'nonce', n),
      headers := '{"Content-Type": "application/json"}'::jsonb,
      timeout_milliseconds := 15000
    );
  exception when others then
    null; -- the client's backup call can still claim the job
  end;
  return new;
end $$;

drop trigger if exists notifications_push on public.notifications;
create trigger notifications_push after insert on public.notifications
  for each row execute function public.enqueue_push();

-- 4) Single-use claim. The database's own call proves itself with the nonce;
--    the client's backup call proves itself by being the notification's actor.
--    Whoever deletes the job row first sends; the other gets null and stops.
create or replace function public.claim_push(p_id uuid, p_nonce text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  n notifications;
  claimed uuid;
  m text[];
  subs jsonb;
begin
  delete from push_jobs j
   where j.notification_id = p_id
     and (
       (p_nonce is not null and j.nonce = p_nonce)
       or exists (select 1 from notifications x where x.id = p_id and x.actor_id = auth.uid())
     )
  returning j.notification_id into claimed;
  if claimed is null then return null; end if;

  select * into n from notifications where id = p_id;
  if not found or n.created_at < now() - interval '1 hour' then return null; end if;

  select muted into m from notify_prefs where user_id = n.to_id;
  if not found then m := '{watchlisted,started,watched,ai}'; end if;
  if n.type = any (m) then
    return jsonb_build_object('muted', true, 'subs', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('endpoint', endpoint, 'p256dh', p256dh, 'auth', auth)), '[]'::jsonb)
    into subs from push_subscriptions where user_id = n.to_id;

  return jsonb_build_object(
    'id', n.id, 'type', n.type, 'body', n.body, 'title_id', n.title_id, 'subs', subs
  );
end $$;

-- dead endpoints (404/410 from Apple/Google) get pruned by the sender
create or replace function public.prune_push(p_endpoint text) returns void
language sql security definer set search_path = public as $$
  delete from push_subscriptions where endpoint = p_endpoint;
$$;

revoke all on function public.claim_push(uuid, text) from public;
revoke all on function public.prune_push(text) from public;
grant execute on function public.claim_push(uuid, text) to anon, authenticated;
grant execute on function public.prune_push(text) to anon, authenticated;
