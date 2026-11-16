-- Fase 2 correcoes (PR 1). Additive only.
--  1. babies.sex ('F' | 'M' | null). Existing rows stay null; the production
--     baby of the author's family is filled by the controller as a data step.
--  2. breastfeeding_sessions.side_started_at: start of the side in progress,
--     so another device can restore and stop a session without losing time.
--  3. create_baby_with_family(..., p_family_id): a second baby joins the
--     caller's family instead of always creating a new one.
--  4. delete_baby(p_baby_id): owner-only; deleting the last baby of a family
--     deletes the family (members, invites, notes and activity logs).
--  5. guard_family_member_change: members removed by the cascade of a family
--     that no longer exists do not need a remaining owner.

-- ---------------------------------------------------------------------------
-- 1. babies.sex
-- ---------------------------------------------------------------------------
alter table public.babies
  add column if not exists sex text null;

alter table public.babies
  add constraint babies_sex_check check (sex in ('F', 'M'));

-- ---------------------------------------------------------------------------
-- 2. breastfeeding_sessions.side_started_at
-- ---------------------------------------------------------------------------
alter table public.breastfeeding_sessions
  add column if not exists side_started_at timestamptz null;

-- ---------------------------------------------------------------------------
-- 3. create_baby_with_family with optional p_family_id
-- ---------------------------------------------------------------------------
-- Adding a parameter creates a new overload; the 4-arg version is dropped so
-- that calls with the old named arguments are not ambiguous. The first four
-- parameters, their defaults and the grants are unchanged.
drop function if exists public.create_baby_with_family(text, date, text, text);

create or replace function public.create_baby_with_family(
  p_name text,
  p_birth_date date,
  p_avatar_emoji text default '🍼',
  p_avatar_url text default null,
  p_family_id uuid default null
)
returns public.babies
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_user auth.users%rowtype;
  v_family_id uuid;
  v_owned uuid[];
  v_baby public.babies;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or p_birth_date is null then
    raise exception 'invalid_baby' using errcode = '22023';
  end if;

  select coalesce(array_agg(f), '{}') into v_owned
  from get_user_owned_family_ids(v_uid) as f;

  if p_family_id is not null then
    if not (p_family_id = any(v_owned)) then
      raise exception 'forbidden_family' using errcode = '42501';
    end if;
    v_family_id := p_family_id;
  elsif cardinality(v_owned) = 1 then
    v_family_id := v_owned[1];
  elsif cardinality(v_owned) > 1 then
    -- Owner of several families: the client must say which one.
    raise exception 'family_required' using errcode = '22023';
  else
    select * into v_user from auth.users where id = v_uid;

    insert into families (name, created_by)
    values (p_name || '''s familia', v_uid)
    returning id into v_family_id;

    insert into family_members (family_id, user_id, role, display_name, email)
    values (v_family_id, v_uid, 'owner', v_user.raw_user_meta_data->>'full_name', v_user.email);
  end if;

  insert into babies (user_id, name, birth_date, avatar_emoji, avatar_url, family_id)
  values (v_uid, p_name, p_birth_date, coalesce(p_avatar_emoji, '🍼'), p_avatar_url, v_family_id)
  returning * into v_baby;

  return v_baby;
end;
$$;

revoke execute on function public.create_baby_with_family(text, date, text, text, uuid) from public, anon;
grant execute on function public.create_baby_with_family(text, date, text, text, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. guard_family_member_change: skip the owner check when the family itself
--    is gone (cascade from a family deletion). Rest identical to
--    20261115120100_fix_family_authorization.sql.
-- ---------------------------------------------------------------------------
create or replace function public.guard_family_member_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Service context (service role, crons, cascades from families/auth.users).
  if v_uid is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE' then
    if new.role is distinct from old.role
       or new.family_id is distinct from old.family_id
       or new.user_id is distinct from old.user_id then
      if old.family_id not in (select get_user_owned_family_ids(v_uid))
         or new.family_id not in (select get_user_owned_family_ids(v_uid)) then
        raise exception 'forbidden_role_change' using errcode = '42501';
      end if;
    end if;

    if old.role = 'owner'
       and (new.role <> 'owner' or new.family_id is distinct from old.family_id) then
      -- Serialize concurrent owner demotions/removals in the same family.
      perform 1 from families where id = old.family_id for update;
    end if;

    if old.role = 'owner'
       and (new.role <> 'owner' or new.family_id is distinct from old.family_id)
       and not exists (
         select 1 from family_members
         where family_id = old.family_id and role = 'owner' and id <> old.id
       ) then
      raise exception 'family_needs_owner' using errcode = 'P0001';
    end if;

    return new;
  end if;

  -- DELETE
  -- The family row is already gone: this is the cascade of a family deletion
  -- (only delete_baby deletes families; clients have no DELETE policy on it).
  if not exists (select 1 from families where id = old.family_id) then
    return old;
  end if;

  if old.role = 'owner' then
    -- Serialize concurrent owner demotions/removals in the same family.
    perform 1 from families where id = old.family_id for update;
  end if;

  if old.role = 'owner'
     and not exists (
       select 1 from family_members
       where family_id = old.family_id and role = 'owner' and id <> old.id
     ) then
    raise exception 'family_needs_owner' using errcode = 'P0001';
  end if;

  return old;
end;
$$;

revoke execute on function public.guard_family_member_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. delete_baby
-- ---------------------------------------------------------------------------
create or replace function public.delete_baby(p_baby_id uuid)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_baby public.babies;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_baby from babies where id = p_baby_id;

  -- Same answer for "does not exist" and "not yours": no existence leak.
  if v_baby.id is null
     or (v_baby.family_id is null and v_baby.user_id <> v_uid)
     or (v_baby.family_id is not null
         and v_baby.family_id not in (select get_user_owned_family_ids(v_uid))) then
    raise exception 'forbidden_baby_delete' using errcode = '42501';
  end if;

  if v_baby.family_id is not null then
    -- Serialize concurrent deletions of the family's babies.
    perform 1 from families where id = v_baby.family_id for update;
  end if;

  delete from babies where id = p_baby_id;

  if v_baby.family_id is not null
     and not exists (select 1 from babies where family_id = v_baby.family_id) then
    -- sleep_activity_log.family_id has no ON DELETE action.
    delete from sleep_activity_log where family_id = v_baby.family_id;
    -- Cascades to family_members, family_invites, family_notes, feeding_activity_log.
    delete from families where id = v_baby.family_id;
  end if;
end;
$$;

revoke execute on function public.delete_baby(uuid) from public, anon;
grant execute on function public.delete_baby(uuid) to authenticated;
