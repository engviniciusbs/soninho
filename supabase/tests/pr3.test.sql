begin;
create extension if not exists pgtap with schema extensions;
select plan(15);

select tests.create_user('33333333-0000-0000-0000-000000000001', 'pr3-owner@test.local');
insert into public.families (id, name, created_by)
  values ('33333333-0000-0000-0000-0000000000f1', 'PR3 Fam', '33333333-0000-0000-0000-000000000001');
insert into public.family_invites (id, family_id, created_by)
  values ('33333333-0000-0000-0000-0000000000a1', '33333333-0000-0000-0000-0000000000f1',
          '33333333-0000-0000-0000-000000000001');

select matches((select token from public.family_invites where id = '33333333-0000-0000-0000-0000000000a1'),
  '^[0-9a-f]{48}$', 'invite_token_default_is_hex');

-- ===================================================== Task 2: family hardening
-- Fixtures (superuser): owner ...01 of F1 (above); caregiver ...02 in F1;
-- outsider ...03; baby B1 in F1. F2 created by ...02, owned by ...01; ...02 is
-- then removed from F2 (service context) to model a removed creator.
select tests.logout();
select tests.create_user('33333333-0000-0000-0000-000000000002', 'pr3-care@test.local');
select tests.create_user('33333333-0000-0000-0000-000000000003', 'pr3-out@test.local');
insert into public.families (id, name, created_by)
  values ('33333333-0000-0000-0000-0000000000f2', 'PR3 Fam 2', '33333333-0000-0000-0000-000000000002');
insert into public.family_members (family_id, user_id, role, email) values
  ('33333333-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-000000000001', 'owner', 'pr3-owner@test.local'),
  ('33333333-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-000000000002', 'caregiver', 'pr3-care@test.local'),
  ('33333333-0000-0000-0000-0000000000f2', '33333333-0000-0000-0000-000000000001', 'owner', 'pr3-owner@test.local'),
  ('33333333-0000-0000-0000-0000000000f2', '33333333-0000-0000-0000-000000000002', 'caregiver', 'pr3-care@test.local');
insert into public.babies (id, user_id, name, birth_date, family_id) values
  ('33333333-0000-0000-0000-0000000000b1', '33333333-0000-0000-0000-000000000001', 'PR3 Bebe', '2026-01-01',
   '33333333-0000-0000-0000-0000000000f1');
delete from public.family_members
  where family_id = '33333333-0000-0000-0000-0000000000f2' and user_id = '33333333-0000-0000-0000-000000000002';

-- owner_cannot_unset_baby_family
select tests.login_as('33333333-0000-0000-0000-000000000001');
select matches(tests.try_exec($$update public.babies set family_id = null where id = '33333333-0000-0000-0000-0000000000b1'$$),
  '^ERR:42501:.*forbidden_baby_change', 'owner_cannot_unset_baby_family');

-- removed_creator_cannot_read_family
select tests.login_as('33333333-0000-0000-0000-000000000002');
select is(tests.try_val($$select count(*) from public.families where id = '33333333-0000-0000-0000-0000000000f2'$$), '0',
  'removed_creator_cannot_read_family');
select is(tests.try_val($$select count(*) from public.families where id = '33333333-0000-0000-0000-0000000000f1'$$), '1',
  'removed_creator_cannot_read_family: positive control, member still reads F1');

-- member_self_update_only_profile_fields (caregiver ...02 on own F1 row)
select is(tests.try_exec($$update public.family_members set display_name = 'Vovo', family_relation = 'avo'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000002'$$),
  'OK:1', 'member_self_update_only_profile_fields: display_name/family_relation allowed');
select is(tests.try_exec($$update public.family_members set display_name = 'Vovo', email = 'pr3-care@test.local'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000002'$$),
  'OK:1', 'member_self_update_only_profile_fields: unchanged forbidden column in SET is allowed');
select matches(tests.try_exec($$update public.family_members set email = 'evil@test.local'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000002'$$),
  '^ERR:42501:.*forbidden_member_field', 'member_self_update_only_profile_fields: email rejected');
select matches(tests.try_exec($$update public.family_members set joined_at = now() - interval '10 years'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000002'$$),
  '^ERR:42501:.*forbidden_member_field', 'member_self_update_only_profile_fields: joined_at rejected');
select tests.login_as('33333333-0000-0000-0000-000000000001');
select is(tests.try_exec($$update public.family_members set email = 'new-care@test.local'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000002'$$),
  'OK:1', 'member_self_update_only_profile_fields: owner may edit a member''s other fields');
select is(tests.try_exec($$update public.family_members set email = 'owner2@test.local'
  where family_id = '33333333-0000-0000-0000-0000000000f1' and user_id = '33333333-0000-0000-0000-000000000001'$$),
  'OK:1', 'member_self_update_only_profile_fields: owner may edit own row');

-- owner_cannot_add_member_directly_without_invite
select matches(tests.try_exec($$insert into public.family_members (family_id, user_id, role) values
  ('33333333-0000-0000-0000-0000000000f1', '33333333-0000-0000-0000-000000000003', 'viewer')$$),
  '^ERR:42501', 'owner_cannot_add_member_directly_without_invite');

-- sleep_end_before_start_rejected (as owner, through RLS)
select matches(tests.try_exec($$insert into public.sleep_sessions (baby_id, type, start_time, end_time) values
  ('33333333-0000-0000-0000-0000000000b1', 'NAP', now() - interval '1 hour', now() - interval '2 hours')$$),
  '^ERR:23514', 'sleep_end_before_start_rejected');
select matches(tests.try_exec($$insert into public.breastfeeding_sessions (baby_id, start_time, end_time) values
  ('33333333-0000-0000-0000-0000000000b1', now() - interval '1 hour', now() - interval '2 hours')$$),
  '^ERR:23514', 'breastfeeding_end_before_start_rejected');

-- guard_member_self_update exists and is not executable by clients
select tests.logout();
select has_function('public', 'guard_member_self_update', '{}'::name[], 'guard_member_self_update() exists');
select ok(coalesce(not has_function_privilege('authenticated', to_regprocedure('public.guard_member_self_update()'), 'execute')
               and not has_function_privilege('anon', to_regprocedure('public.guard_member_self_update()'), 'execute'), false),
  'guard_member_self_update_not_executable_by_clients');

select * from finish();
rollback;
