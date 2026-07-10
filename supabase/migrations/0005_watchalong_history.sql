-- 0005: watch-along history
-- Sessions become durable records with a lifecycle status. Conversations
-- (reactions) already persist and cascade-delete with their session.

alter table watch_sessions
  add column if not exists status text not null default 'in_progress'
  check (status in ('in_progress', 'completed', 'dropped'));

-- Backfill rows ended before this migration: a session that ran 45+ minutes
-- counts as completed, anything shorter was abandoned.
update watch_sessions
set status = case
  when ended_at is not null and ended_at - started_at >= interval '45 minutes' then 'completed'
  else 'dropped'
end
where active = false and status = 'in_progress';
