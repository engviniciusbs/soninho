-- NOTE: depends on supabase/tests/00_helpers.sql (schema `tests`) running first (alphabetical order).
begin;
create extension if not exists pgtap with schema extensions;
select plan(64);

-- ---------------------------------------------------------------- fixtures
-- F1: owner a1, caregiver a2, viewer a3 | F2: owner b1 | c1,c2,c3 no family
select tests.create_user(('00000000-0000-0000-0000-0000000000' || u.s)::uuid, u.s || '@example.test')
from (values ('a1'),('a2'),('a3'),('b1'),('c1'),('c2'),('c3')) as u(s);

insert into public.families (id, name, created_by) values
  ('00000000-0000-0000-0000-0000000000f1', 'Familia Um', '00000000-0000-0000-0000-0000000000a1'),
  ('00000000-0000-0000-0000-0000000000f2', 'Familia Dois', '00000000-0000-0000-0000-0000000000b1');
insert into public.family_members (family_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'caregiver'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a3', 'viewer'),
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000b1', 'owner');
insert into public.babies (id, user_id, name, birth_date, family_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Bebe1', '2026-01-01', '00000000-0000-0000-0000-0000000000f1'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-0000000000b1', 'Bebe2', '2026-01-01', '00000000-0000-0000-0000-0000000000f2');
insert into public.family_invites (id, family_id, token, role, created_by, expires_at, revoked_at) values
  ('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-0000000000f1', 'tok-i1', 'caregiver', '00000000-0000-0000-0000-0000000000a1', now() + interval '7 days', null),
  ('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-0000000000f1', 'tok-i2', 'caregiver', '00000000-0000-0000-0000-0000000000a1', now() - interval '1 day', null),
  ('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-0000000000f1', 'tok-i3', 'caregiver', '00000000-0000-0000-0000-0000000000a1', now() + interval '7 days', now()),
  ('00000000-0000-0000-0000-000000000014', '00000000-0000-0000-0000-0000000000f1', 'tok-i4', 'caregiver', '00000000-0000-0000-0000-0000000000a1', now() + interval '7 days', null);

insert into public.sleep_sessions (id, baby_id, type, start_time, end_time) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'NAP', now() - interval '2 hours', now() - interval '1 hour');

-- --------------------------------------------- function existence (RED guard)
select has_function('public', 'get_invite_preview', array['text'], 'get_invite_preview(text) exists');
select has_function('public', 'accept_family_invite', array['text','text'], 'accept_family_invite(text,text) exists');
select has_function('public', 'create_baby_with_family', array['text','date','text','text'], 'create_baby_with_family(...) exists');

-- ------------------------------------------------------------ invites RLS
select tests.login_anon();
select matches(tests.try_val('select count(*) from public.family_invites'), '^(0|ERR:42501)', 'anon_cannot_list_invites');
select tests.login_as('00000000-0000-0000-0000-0000000000a3');
select is(auth.uid()::text, '00000000-0000-0000-0000-0000000000a3', 'login_as sets auth.uid()');
select is(tests.try_val('select count(*) from public.family_invites'), '0', 'viewer_cannot_list_invites');

-- ------------------------------------------------- outsider (c1) insertions
select tests.login_as('00000000-0000-0000-0000-0000000000c1');
select matches(tests.try_exec($$insert into public.family_members(family_id,user_id,role) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1','owner')$$),
  '^ERR:42501', 'outsider_cannot_self_insert_member');
select matches(tests.try_exec($$insert into public.family_members(family_id,user_id,role) values ('00000000-0000-0000-0000-0000000000f1','00000000-0000-0000-0000-0000000000c1','viewer')$$),
  '^ERR:42501', 'outsider_cannot_self_insert_as_viewer');
select matches(tests.try_exec($$insert into public.babies(user_id,name,birth_date,family_id) values ('00000000-0000-0000-0000-0000000000c1','X','2026-01-01','00000000-0000-0000-0000-0000000000f1')$$),
  '^ERR:42501', 'outsider_cannot_insert_baby_into_foreign_family');
select is(tests.try_val($$select count(*) from public.get_user_family_ids('00000000-0000-0000-0000-0000000000a1')$$), '0',
  'helpers_ignore_foreign_uid: outsider asking about a1 gets 0');

-- ------------------------------------------------------- caregiver / owner
select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select is(tests.try_val($$select count(*) from public.get_user_family_ids('00000000-0000-0000-0000-0000000000a1')$$), '1',
  'helpers_ignore_foreign_uid: a1 asking about self gets 1');

select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select matches(tests.try_exec($$update public.babies set family_id='00000000-0000-0000-0000-0000000000f2' where id='00000000-0000-0000-0000-0000000000b1'$$),
  '^(OK:0|ERR:42501)', 'caregiver_cannot_move_baby_to_foreign_family: update denied or 0 rows');
select tests.try_val($$update public.babies set family_id='00000000-0000-0000-0000-0000000000f2' where id='00000000-0000-0000-0000-0000000000b1' returning 1$$);
select tests.logout();
select is((select family_id::text from public.babies where id='00000000-0000-0000-0000-0000000000b1'),
  '00000000-0000-0000-0000-0000000000f1', 'caregiver_cannot_move_baby_to_foreign_family: family_id unchanged (real run, checked as superuser)');

select tests.login_as('00000000-0000-0000-0000-0000000000a3');
select matches(tests.try_exec($$update public.family_members set role='owner' where user_id='00000000-0000-0000-0000-0000000000a3'$$),
  '^ERR:42501:.*forbidden_role_change', 'viewer_cannot_change_own_role');

select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select is(tests.try_exec($$update public.family_members set family_relation='avo', display_name='X' where user_id='00000000-0000-0000-0000-0000000000a2'$$),
  'OK:1', 'member_can_update_own_relation');

select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select matches(tests.try_exec($$update public.family_members set role='caregiver' where user_id='00000000-0000-0000-0000-0000000000a1'$$),
  '^ERR:P0001:.*family_needs_owner', 'last_owner_cannot_demote_self');
select matches(tests.try_exec($$delete from public.family_members where user_id='00000000-0000-0000-0000-0000000000a1' and family_id='00000000-0000-0000-0000-0000000000f1'$$),
  '^ERR:P0001:.*family_needs_owner', 'last_owner_cannot_leave');

-- existing family access (before a2 is demoted below)
select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select is(tests.try_exec($$insert into public.sleep_sessions(baby_id,type,start_time) values ('00000000-0000-0000-0000-0000000000b1','NAP',now())$$),
  'OK:1', 'existing_family_access: caregiver inserts sleep_session');
select is(tests.try_exec($$update public.sleep_sessions set notes='n' where id='00000000-0000-0000-0000-0000000000e1'$$),
  'OK:1', 'existing_family_access: caregiver updates seeded sleep_session');
select tests.login_as('00000000-0000-0000-0000-0000000000a3');
select matches(tests.try_exec($$insert into public.sleep_sessions(baby_id,type,start_time) values ('00000000-0000-0000-0000-0000000000b1','NAP',now())$$),
  '^ERR:42501', 'existing_family_access: viewer cannot insert sleep_session');
select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select is(tests.try_val($$select count(*) from public.sleep_sessions where baby_id='00000000-0000-0000-0000-0000000000b1'$$), '1',
  'existing_family_access: caregiver sees 1 session of B1 (positive control)');
select tests.login_as('00000000-0000-0000-0000-0000000000b1');
select is(tests.try_val($$select count(*) from public.sleep_sessions where baby_id='00000000-0000-0000-0000-0000000000b1'$$), '0',
  'existing_family_access: foreign owner sees 0 sessions of B1');

select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select is(tests.try_exec($$update public.babies set name='Bebe1x', avatar_emoji='👶' where id='00000000-0000-0000-0000-0000000000b1'$$),
  'OK:1', 'owner_and_caregiver_can_update_baby_profile: owner');
select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select is(tests.try_exec($$update public.babies set name='Bebe1y', avatar_emoji='🧸' where id='00000000-0000-0000-0000-0000000000b1'$$),
  'OK:1', 'owner_and_caregiver_can_update_baby_profile: caregiver');

select tests.login_as('00000000-0000-0000-0000-0000000000a1');
select is(tests.try_exec($$update public.family_members set role='viewer' where user_id='00000000-0000-0000-0000-0000000000a2'$$),
  'OK:1', 'owner_can_change_member_role');

-- --------------------------------------------------------- invite preview
select tests.login_anon();
select is(tests.try_val($$select status || '|' || family_name || '|' || role from public.get_invite_preview('tok-i1')$$),
  'valid|Familia Um|caregiver', 'invite_preview_anon');
select ok(exists(select 1 from pg_proc where proname='get_invite_preview' and pronamespace='public'::regnamespace
                 and not ('token' = any(coalesce(proargnames, '{}')))),
  'invite_preview_anon: function exposes no token column');
select is(tests.try_val($$select status from public.get_invite_preview('tok-i2')$$), 'expired', 'invite_preview_expired');
select is(tests.try_val($$select status from public.get_invite_preview('tok-i3')$$), 'revoked', 'invite_preview_revoked');
select is(tests.try_val($$select status from public.get_invite_preview('tok-nope')$$), 'not_found', 'invite_preview_not_found');

-- ----------------------------------------------------------- anon denials
-- Privilege checks instead of direct calls: invoking a function without EXECUTE
-- as anon segfaults supabase/postgres 17.6.1.104 when session_user=postgres
-- (supautils hint_roles hook; affects this test runner only). Verified at the API
-- layer that PostgREST returns 42501 for anon on these RPCs (curl /rest/v1/rpc/*).
select ok(not has_function_privilege('anon', 'public.accept_family_invite(text,text)', 'execute'), 'anon_cannot_accept');
select ok(not has_function_privilege('anon', 'public.get_user_family_ids(uuid)', 'execute'), 'anon_cannot_execute_helpers: get_user_family_ids');
select ok(not has_function_privilege('anon', 'public.get_user_owned_family_ids(uuid)', 'execute'), 'anon_cannot_execute_helpers: get_user_owned_family_ids');
select ok(not has_function_privilege('anon', 'public.user_can_write_family(uuid,uuid)', 'execute'), 'anon_cannot_execute_helpers: user_can_write_family');
select ok(not has_function_privilege('anon', 'public.create_baby_with_family(text,date,text,text)', 'execute'), 'anon_cannot_execute: create_baby_with_family');
select ok(has_function_privilege('anon', 'public.get_invite_preview(text)', 'execute'), 'anon_can_execute: get_invite_preview');
select ok(has_function_privilege('authenticated', 'public.accept_family_invite(text,text)', 'execute'), 'authenticated_can_execute: accept_family_invite');
select ok(has_function_privilege('authenticated', 'public.create_baby_with_family(text,date,text,text)', 'execute'), 'authenticated_can_execute: create_baby_with_family');
select ok(has_function_privilege('authenticated', 'public.get_user_family_ids(uuid)', 'execute'), 'authenticated_can_execute: get_user_family_ids');
select ok(has_function_privilege('authenticated', 'public.get_user_owned_family_ids(uuid)', 'execute'), 'authenticated_can_execute: get_user_owned_family_ids');
select ok(has_function_privilege('authenticated', 'public.user_can_write_family(uuid,uuid)', 'execute'), 'authenticated_can_execute: user_can_write_family');

-- ----------------------------------------------------------- accept invite
select tests.login_as('00000000-0000-0000-0000-0000000000c2');
select matches(tests.try_exec($$select public.accept_family_invite('tok-i2', 'Z')$$), '^ERR:P0001:.*invite_not_valid', 'accept_expired_rejected');
select matches(tests.try_exec($$select public.accept_family_invite('tok-i3', 'Z')$$), '^ERR:P0001:.*invite_not_valid', 'accept_revoked_rejected');

select tests.login_as('00000000-0000-0000-0000-0000000000c1');
select is(tests.try_val($$select public.accept_family_invite('tok-i1', 'Fulano')::text$$),
  '00000000-0000-0000-0000-0000000000f1', 'accept_invite_grants_role: returns F1');
select tests.logout();
select is((select role from public.family_members where user_id='00000000-0000-0000-0000-0000000000c1' and family_id='00000000-0000-0000-0000-0000000000f1'),
  'caregiver', 'accept_invite_grants_role: c1 is caregiver in F1');
select is((select accepted_by::text from public.family_invites where token='tok-i1' and accepted_at is not null),
  '00000000-0000-0000-0000-0000000000c1', 'accept_invite_grants_role: invite consumed by c1');

select tests.login_as('00000000-0000-0000-0000-0000000000c2');
select matches(tests.try_exec($$select public.accept_family_invite('tok-i1', 'Z')$$), '^ERR:P0001:.*invite_not_valid', 'accept_invite_twice_rejected');

select tests.login_as('00000000-0000-0000-0000-0000000000a3');
select is(tests.try_val($$select public.accept_family_invite('tok-i4', 'V')::text$$),
  '00000000-0000-0000-0000-0000000000f1', 'accept_existing_member_noop: returns F1');
select tests.logout();
select is((select role from public.family_members where user_id='00000000-0000-0000-0000-0000000000a3'), 'viewer',
  'accept_existing_member_noop: role stays viewer');
select is((select accepted_at is null from public.family_invites where token='tok-i4'), true,
  'accept_existing_member_noop: invite not consumed');

-- ------------------------------------------------------ create baby + family
select tests.login_as('00000000-0000-0000-0000-0000000000c3');
select doesnt_match(tests.try_val($$select family_id::text from public.create_baby_with_family('Bebê', '2026-01-01', '🍼', null)$$), '^(ERR|NULL)',
  'create_baby_with_family_new_user: baby has a family_id');
select tests.logout();
select is((select count(*)::int from public.family_members fm join public.babies b on b.family_id = fm.family_id
           where fm.user_id='00000000-0000-0000-0000-0000000000c3' and fm.role='owner' and b.name='Bebê'), 1,
  'create_baby_with_family_new_user: c3 is owner of the new family');

-- ------------------------------------------------------------ search_path
select ok(exists(select 1 from pg_proc where proname='calculate_duration' and pronamespace='public'::regnamespace
                 and (coalesce(proconfig::text,'') like '%search_path=public%' or coalesce(proconfig::text,'') like '%search_path=""%')),
  'calculate_duration_search_path');

-- ------------------------------------------------- removed creator (M2)
-- B3 created by a2 inside F1; a2 is then removed from F1 (as service context).
select tests.logout();
insert into public.babies (id, user_id, name, birth_date, family_id) values
  ('00000000-0000-0000-0000-0000000000b3', '00000000-0000-0000-0000-0000000000a2', 'Bebe3', '2026-01-01', '00000000-0000-0000-0000-0000000000f1');
insert into public.sleep_sessions (id, baby_id, type, start_time) values
  ('00000000-0000-0000-0000-0000000000e3', '00000000-0000-0000-0000-0000000000b3', 'NAP', now() - interval '1 hour');
delete from public.family_members where user_id='00000000-0000-0000-0000-0000000000a2' and family_id='00000000-0000-0000-0000-0000000000f1';
select tests.login_as('00000000-0000-0000-0000-0000000000a2');
select is(tests.try_val($$select count(*) from public.babies where id='00000000-0000-0000-0000-0000000000b3'$$), '0',
  'removed_creator_loses_access: cannot read own-created baby');
select is(tests.try_val($$select count(*) from public.sleep_sessions where baby_id='00000000-0000-0000-0000-0000000000b3'$$), '0',
  'removed_creator_loses_access: cannot read sleep_sessions');
select matches(tests.try_exec($$insert into public.sleep_sessions(baby_id,type,start_time) values ('00000000-0000-0000-0000-0000000000b3','NAP',now())$$),
  '^ERR:42501', 'removed_creator_loses_access: cannot insert sleep_session');
select is(tests.try_exec($$update public.sleep_sessions set notes='x' where id='00000000-0000-0000-0000-0000000000e3'$$),
  'OK:0', 'removed_creator_loses_access: cannot update sleep_session');
select is(tests.try_exec($$delete from public.sleep_sessions where id='00000000-0000-0000-0000-0000000000e3'$$),
  'OK:0', 'removed_creator_loses_access: cannot delete sleep_session');
select is(tests.try_exec($$update public.babies set name='hacked' where id='00000000-0000-0000-0000-0000000000b3'$$),
  'OK:0', 'removed_creator_loses_access: cannot update baby');

-- ------------------------------------------- default privileges (I1)
select tests.logout();
create function public.zz_default_acl_probe() returns int language sql as 'select 1';
select ok(not has_function_privilege('anon', 'public.zz_default_acl_probe()', 'execute'),
  'default_privileges: new public function not executable by anon');

-- ------------------------------------------- guard functions not executable by clients
select tests.logout();
select ok(not has_function_privilege('authenticated', 'public.guard_family_member_change()', 'execute'),
  'guard_fns_not_executable_by_clients: authenticated / guard_family_member_change');
select ok(not has_function_privilege('authenticated', 'public.guard_baby_change()', 'execute'),
  'guard_fns_not_executable_by_clients: authenticated / guard_baby_change');
select ok(not has_function_privilege('anon', 'public.guard_family_member_change()', 'execute'),
  'guard_fns_not_executable_by_clients: anon / guard_family_member_change');
select ok(not has_function_privilege('anon', 'public.guard_baby_change()', 'execute'),
  'guard_fns_not_executable_by_clients: anon / guard_baby_change');

select * from finish();
rollback;
