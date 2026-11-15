-- Fix family authorization holes (PR1 seguranca, findings S1, S2, S3, S6, S7, S9, S10)
-- and add server-side RPCs for invites and baby/family creation.
--
-- Safe to apply once on top of production as-is: only policies/functions/triggers
-- change; no row data is touched.
--
-- Convention for "service context": auth.uid() IS NULL (service role, crons,
-- admin client, GoTrue admin deletes, migrations). Those paths are never
-- blocked by the new triggers/helper filters.

-- ---------------------------------------------------------------------------
-- S6 (part 1): stop granting EXECUTE on new public functions to anon by default.
-- (Explicit per-function revokes below cover PUBLIC, whose built-in default
-- cannot be removed by a per-schema ALTER DEFAULT PRIVILEGES.)
-- ---------------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from public, anon;

-- ---------------------------------------------------------------------------
-- S10: helpers ignore questions about another user when called by a user.
-- Signatures, SECURITY DEFINER and search_path unchanged (used inside RLS).
-- ---------------------------------------------------------------------------
create or replace function public.get_user_family_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from family_members
  where user_id = uid
    and (auth.uid() is null or uid = auth.uid());
$$;

create or replace function public.get_user_owned_family_ids(uid uuid)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from family_members
  where user_id = uid and role = 'owner'
    and (auth.uid() is null or uid = auth.uid());
$$;

create or replace function public.user_can_write_family(uid uuid, fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from family_members
    where user_id = uid and family_id = fid and role in ('owner', 'caregiver')
      and (auth.uid() is null or uid = auth.uid())
  );
$$;

-- ---------------------------------------------------------------------------
-- S1: invites are no longer world-readable. Owners keep "Owner can manage
-- invites"; token holders use get_invite_preview / accept_family_invite.
-- ---------------------------------------------------------------------------
drop policy if exists "Anyone can read invite by token" on public.family_invites;

-- Same name and expression as production, now scoped to authenticated so anon
-- gets zero rows instead of evaluating a helper it can no longer execute.
drop policy if exists "Owner can manage invites" on public.family_invites;
create policy "Owner can manage invites" on public.family_invites
  for all to authenticated
  using (family_id in (select get_user_owned_family_ids(auth.uid())));

-- ---------------------------------------------------------------------------
-- S2: only owners can insert members (self-join goes through accept_family_invite,
-- family bootstrap through create_baby_with_family).
-- ---------------------------------------------------------------------------
drop policy if exists "Self or owner can insert members" on public.family_members;
drop policy if exists "Owner can insert members" on public.family_members;
create policy "Owner can insert members" on public.family_members
  for insert with check (
    family_id in (select get_user_owned_family_ids(auth.uid()))
  );

-- ---------------------------------------------------------------------------
-- S3: guard role/family/user changes and keep at least one owner per family.
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

drop trigger if exists guard_family_member_change on public.family_members;
create trigger guard_family_member_change
  before update or delete on public.family_members
  for each row execute function public.guard_family_member_change();

-- ---------------------------------------------------------------------------
-- S9: babies insert/update bound to the caller's families.
-- ---------------------------------------------------------------------------
drop policy if exists "Family members can insert babies" on public.babies;
create policy "Family members can insert babies" on public.babies
  for insert with check (
    auth.uid() = user_id
    and (
      family_id is null
      or family_id in (select get_user_owned_family_ids(auth.uid()))
    )
  );

drop policy if exists "Family owners and caregivers can update babies" on public.babies;
create policy "Family owners and caregivers can update babies" on public.babies
  for update
  using (
    auth.uid() = user_id
    or user_can_write_family(auth.uid(), family_id)
  )
  with check (
    family_id is null
    or user_can_write_family(auth.uid(), family_id)
  );

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

drop trigger if exists guard_baby_change on public.babies;
create trigger guard_baby_change
  before update on public.babies
  for each row execute function public.guard_baby_change();

-- ---------------------------------------------------------------------------
-- RPC: invite preview (anon + authenticated). Never exposes the token.
-- Details are only returned for a valid invite.
-- ---------------------------------------------------------------------------
create or replace function public.get_invite_preview(p_token text)
returns table (
  status text,
  family_name text,
  role text,
  family_relation text,
  inviter_name text,
  expires_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_inv family_invites%rowtype;
begin
  select * into v_inv from family_invites fi where fi.token = p_token;

  if not found then
    return query select 'not_found'::text, null::text, null::text, null::text, null::text, null::timestamptz;
    return;
  end if;

  if v_inv.accepted_at is not null then
    return query select 'accepted'::text, null::text, null::text, null::text, null::text, null::timestamptz;
  elsif v_inv.revoked_at is not null then
    return query select 'revoked'::text, null::text, null::text, null::text, null::text, null::timestamptz;
  elsif v_inv.expires_at <= now() then
    return query select 'expired'::text, null::text, null::text, null::text, null::text, v_inv.expires_at;
  else
    return query
      select 'valid'::text,
             f.name,
             v_inv.role,
             v_inv.family_relation,
             (select fm.display_name from family_members fm
               where fm.family_id = v_inv.family_id and fm.user_id = v_inv.created_by
               limit 1),
             v_inv.expires_at
      from families f
      where f.id = v_inv.family_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: accept invite (authenticated only).
-- ---------------------------------------------------------------------------
create or replace function public.accept_family_invite(p_token text, p_display_name text default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_inv family_invites%rowtype;
  v_user auth.users%rowtype;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv from family_invites where token = p_token for update;

  if not found
     or v_inv.revoked_at is not null
     or v_inv.accepted_at is not null
     or v_inv.expires_at <= now() then
    raise exception 'invite_not_valid' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from family_members
    where family_id = v_inv.family_id and user_id = v_uid
  ) then
    return v_inv.family_id;
  end if;

  select * into v_user from auth.users where id = v_uid;

  insert into family_members (family_id, user_id, role, display_name, email, family_relation, invited_by)
  values (
    v_inv.family_id,
    v_uid,
    v_inv.role,
    coalesce(nullif(btrim(p_display_name), ''), v_user.raw_user_meta_data->>'full_name'),
    v_user.email,
    v_inv.family_relation,
    v_inv.created_by
  )
  on conflict (family_id, user_id) do nothing;

  update family_invites
     set accepted_at = now(), accepted_by = v_uid
   where id = v_inv.id;

  return v_inv.family_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: create family + owner membership + baby atomically (authenticated only).
-- ---------------------------------------------------------------------------
create or replace function public.create_baby_with_family(
  p_name text,
  p_birth_date date,
  p_avatar_emoji text default '🍼',
  p_avatar_url text default null
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
  v_baby public.babies;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_name is null or btrim(p_name) = '' or p_birth_date is null then
    raise exception 'invalid_baby' using errcode = '22023';
  end if;

  select * into v_user from auth.users where id = v_uid;

  insert into families (name, created_by)
  values (p_name || '''s familia', v_uid)
  returning id into v_family_id;

  insert into family_members (family_id, user_id, role, display_name, email)
  values (v_family_id, v_uid, 'owner', v_user.raw_user_meta_data->>'full_name', v_user.email);

  insert into babies (user_id, name, birth_date, avatar_emoji, avatar_url, family_id)
  values (v_uid, p_name, p_birth_date, coalesce(p_avatar_emoji, '🍼'), p_avatar_url, v_family_id)
  returning * into v_baby;

  return v_baby;
end;
$$;

-- ---------------------------------------------------------------------------
-- S6 (part 2): explicit execute privileges.
-- ---------------------------------------------------------------------------
revoke execute on function public.get_user_family_ids(uuid) from public, anon;
revoke execute on function public.get_user_owned_family_ids(uuid) from public, anon;
revoke execute on function public.user_can_write_family(uuid, uuid) from public, anon;
grant execute on function public.get_user_family_ids(uuid) to authenticated, service_role;
grant execute on function public.get_user_owned_family_ids(uuid) to authenticated, service_role;
grant execute on function public.user_can_write_family(uuid, uuid) to authenticated, service_role;

revoke execute on function public.get_invite_preview(text) from public;
grant execute on function public.get_invite_preview(text) to anon, authenticated, service_role;

revoke execute on function public.accept_family_invite(text, text) from public, anon;
grant execute on function public.accept_family_invite(text, text) to authenticated, service_role;

revoke execute on function public.create_baby_with_family(text, date, text, text) from public, anon;
grant execute on function public.create_baby_with_family(text, date, text, text) to authenticated, service_role;

-- Trigger functions are not meant to be called directly.
revoke execute on function public.guard_family_member_change() from public, anon;
revoke execute on function public.guard_baby_change() from public, anon;

-- ---------------------------------------------------------------------------
-- S7: pin search_path of calculate_duration.
-- ---------------------------------------------------------------------------
alter function public.calculate_duration() set search_path = public;
