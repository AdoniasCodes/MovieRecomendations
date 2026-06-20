-- Pairing helpers. SECURITY DEFINER so a joiner can look up a couple by code
-- and insert their membership without tripping the couple-scoped RLS policies.

-- ensure a profile row exists for the current user (called after sign-in)
create or replace function ensure_profile(p_name text, p_emoji text, p_color text)
returns void language plpgsql security definer as $$
begin
  insert into profiles (id, name, emoji, color)
  values (auth.uid(), coalesce(p_name, 'You'), coalesce(p_emoji, '🐼'), coalesce(p_color, '#7C3AED'))
  on conflict (id) do update set
    name = coalesce(excluded.name, profiles.name),
    emoji = coalesce(excluded.emoji, profiles.emoji),
    color = coalesce(excluded.color, profiles.color);
end; $$;

-- create a couple and join it; returns the invite code
create or replace function create_couple()
returns text language plpgsql security definer as $$
declare c text; cid uuid;
begin
  -- reuse existing couple if already in one
  select cm.couple_id into cid from couple_members cm where cm.user_id = auth.uid() limit 1;
  if cid is not null then
    return (select code from couples where id = cid);
  end if;
  c := 'AM-' || upper(substr(md5(gen_random_uuid()::text), 1, 5));
  insert into couples (code, created_by) values (c, auth.uid()) returning id into cid;
  insert into couple_members (couple_id, user_id, role) values (cid, auth.uid(), 'me')
    on conflict do nothing;
  return c;
end; $$;

-- join an existing couple by code (max 2 members); returns the couple id
create or replace function join_couple(p_code text)
returns uuid language plpgsql security definer as $$
declare cid uuid; n int;
begin
  select id into cid from couples where code = upper(trim(p_code));
  if cid is null then raise exception 'No couple with that code'; end if;
  select count(*) into n from couple_members where couple_id = cid;
  if n >= 2 and not exists (select 1 from couple_members where couple_id = cid and user_id = auth.uid()) then
    raise exception 'That couple is already full';
  end if;
  insert into couple_members (couple_id, user_id, role) values (cid, auth.uid(), 'her')
    on conflict do nothing;
  return cid;
end; $$;

grant execute on function ensure_profile(text, text, text) to authenticated;
grant execute on function create_couple() to authenticated;
grant execute on function join_couple(text) to authenticated;
