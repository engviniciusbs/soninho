-- Harden the guard trigger functions (PR2 qualidade).
--  * The owner-serialization lock on families uses FOR NO KEY UPDATE instead of
--    FOR UPDATE: same mutual exclusion between concurrent owner demotions, but it
--    does not conflict with the FOR KEY SHARE locks taken by FK inserts that
--    reference the family.
--  * EXECUTE is revoked from public/anon/authenticated. `create or replace` keeps
--    existing ACLs and authenticated still had the default grant. Triggers keep
--    firing: EXECUTE is not checked when a trigger fires.
--  * guard_baby_change is re-created unchanged (only for the explicit revoke);
--    guard_family_member_change changes only the lock clause (plus the revoke).

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
      perform 1 from families where id = old.family_id for no key update;
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
  if old.role = 'owner' then
    -- Serialize concurrent owner demotions/removals in the same family.
    perform 1 from families where id = old.family_id for no key update;
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

-- user_id is immutable for users; family_id may only be changed by an owner of
-- both the old and the new family (or the creator of a family-less baby).
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

revoke execute on function public.guard_family_member_change(), public.guard_baby_change()
  from public, anon, authenticated;
