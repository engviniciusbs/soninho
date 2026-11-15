-- Close remaining family integrity gaps (PR3 correcoes).
--  1. guard_baby_change: a client may no longer detach a baby from its family
--     (family_id -> null). Rest of the body identical to 20261116120000.
--  2. "Members can read family": drop the created_by fallback; only members read.
--  3. guard_member_self_update: a non-owner member editing their own row may
--     only change display_name / family_relation.
--  4. Drop "Owner can insert members": membership is created only by the
--     SECURITY DEFINER RPCs accept_family_invite / create_baby_with_family.
--  5. end_time >= start_time on sleep_sessions and breastfeeding_sessions.

-- ---------------------------------------------------------------------------
-- 1. guard_baby_change
-- ---------------------------------------------------------------------------
create or replace function public.guard_baby_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    return new;
  end if;

  if new.user_id is distinct from old.user_id then
    raise exception 'forbidden_baby_change' using errcode = '42501';
  end if;

  -- A baby that belongs to a family can never be detached by a client.
  if old.family_id is not null and new.family_id is null then
    raise exception 'forbidden_baby_change' using errcode = '42501';
  end if;

  if new.family_id is distinct from old.family_id then
    if (old.family_id is null and old.user_id <> v_uid)
       or (old.family_id is not null
           and old.family_id not in (select get_user_owned_family_ids(v_uid)))
       or (new.family_id is not null
           and new.family_id not in (select get_user_owned_family_ids(v_uid))) then
      raise exception 'forbidden_baby_change' using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_baby_change() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. families: members only (no created_by fallback)
-- ---------------------------------------------------------------------------
drop policy if exists "Members can read family" on public.families;
create policy "Members can read family" on public.families
  for select using (
    id in (select get_user_family_ids(auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- 3. guard_member_self_update
-- ---------------------------------------------------------------------------
-- Compares OLD vs NEW per column (as jsonb minus the allowed keys), so an UPDATE
-- that lists a forbidden column with its unchanged value still passes, and any
-- column added later is forbidden by default.
create or replace function public.guard_member_self_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  -- Service context (service role, crons, cascades).
  if v_uid is null then
    return new;
  end if;

  -- Only the member editing their own row, and only when not an owner of it.
  if old.user_id <> v_uid
     or old.family_id in (select get_user_owned_family_ids(v_uid)) then
    return new;
  end if;

  if (to_jsonb(new) - 'display_name' - 'family_relation')
     is distinct from (to_jsonb(old) - 'display_name' - 'family_relation') then
    raise exception 'forbidden_member_field' using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_member_self_update() from public, anon, authenticated;

drop trigger if exists guard_member_self_update on public.family_members;
create trigger guard_member_self_update
  before update on public.family_members
  for each row execute function public.guard_member_self_update();

-- ---------------------------------------------------------------------------
-- 4. no direct member inserts by clients
-- ---------------------------------------------------------------------------
drop policy if exists "Owner can insert members" on public.family_members;

-- ---------------------------------------------------------------------------
-- 5. session time ordering (production: 0 violations, checked 2026-11-16)
-- ---------------------------------------------------------------------------
alter table public.sleep_sessions
  add constraint sleep_sessions_end_after_start
  check (end_time is null or end_time >= start_time) not valid;
alter table public.sleep_sessions validate constraint sleep_sessions_end_after_start;

alter table public.breastfeeding_sessions
  add constraint breastfeeding_sessions_end_after_start
  check (end_time is null or end_time >= start_time) not valid;
alter table public.breastfeeding_sessions validate constraint breastfeeding_sessions_end_after_start;
