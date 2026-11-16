-- Fase 2 correcoes: babies.sex, breastfeeding_sessions.side_started_at,
-- create_baby_with_family(p_family_id) and delete_baby.
-- NOTE: depends on supabase/tests/00_helpers.sql (schema `tests`) running first (alphabetical order).
begin;
create extension if not exists pgtap with schema extensions;
select plan(33);

-- ---------------------------------------------------------------- fixtures
-- F1: owner o1, caregiver g1 | F2: owner o2 | F3, F4: owner o3 (two families)
-- n1: no family
select tests.create_user(('00000000-0000-0000-0000-0000000001' || u.s)::uuid, u.s || '@example.test')
from (values ('a1'),('a2'),('a3'),('a4'),('a5')) as u(s);
-- a1 = o1, a2 = g1, a3 = o2, a4 = o3, a5 = n1

insert into public.families (id, name, created_by) values
  ('00000000-0000-0000-0000-0000000001f1', 'F1', '00000000-0000-0000-0000-0000000001a1'),
  ('00000000-0000-0000-0000-0000000001f2', 'F2', '00000000-0000-0000-0000-0000000001a3'),
  ('00000000-0000-0000-0000-0000000001f3', 'F3', '00000000-0000-0000-0000-0000000001a4'),
  ('00000000-0000-0000-0000-0000000001f4', 'F4', '00000000-0000-0000-0000-0000000001a4');
insert into public.family_members (family_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001a1', 'owner'),
  ('00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001a2', 'caregiver'),
  ('00000000-0000-0000-0000-0000000001f2', '00000000-0000-0000-0000-0000000001a3', 'owner'),
  ('00000000-0000-0000-0000-0000000001f3', '00000000-0000-0000-0000-0000000001a4', 'owner'),
  ('00000000-0000-0000-0000-0000000001f4', '00000000-0000-0000-0000-0000000001a4', 'owner');
insert into public.babies (id, user_id, name, birth_date, family_id) values
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000001a1', 'Bebe1', '2026-02-10', '00000000-0000-0000-0000-0000000001f1'),
  ('00000000-0000-0000-0000-0000000001b2', '00000000-0000-0000-0000-0000000001a3', 'Bebe2', '2026-02-10', '00000000-0000-0000-0000-0000000001f2');
insert into public.family_invites (family_id, token, role, created_by, expires_at) values
  ('00000000-0000-0000-0000-0000000001f1', 'tok-f2c-1', 'caregiver', '00000000-0000-0000-0000-0000000001a1', now() + interval '7 days');
insert into public.family_notes (family_id, author_id, body) values
  ('00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001a1', 'recado');
insert into public.sleep_activity_log (baby_id, family_id, actor_user_id, action) values
  ('00000000-0000-0000-0000-0000000001b1', '00000000-0000-0000-0000-0000000001f1', '00000000-0000-0000-0000-0000000001a1', 'started');

-- ------------------------------------------------------------------ columns
select has_column('public', 'babies', 'sex', 'babies.sex exists');
select col_is_null('public', 'babies', 'sex', 'babies.sex is nullable');
select has_column('public', 'breastfeeding_sessions', 'side_started_at', 'breastfeeding_sessions.side_started_at exists');
select col_type_is('public', 'breastfeeding_sessions', 'side_started_at', 'timestamp with time zone', 'side_started_at is timestamptz');
select col_is_null('public', 'breastfeeding_sessions', 'side_started_at', 'side_started_at is nullable');

select matches(tests.try_exec($$update public.babies set sex = 'X' where id = '00000000-0000-0000-0000-0000000001b1'$$),
  '^ERR:23514', 'sex_check_rejects_X');
select is(tests.try_exec($$update public.babies set sex = 'F' where id = '00000000-0000-0000-0000-0000000001b1'$$),
  'OK:1', 'sex_check_accepts_F');
select is(tests.try_exec($$update public.babies set sex = 'M' where id = '00000000-0000-0000-0000-0000000001b1'$$),
  'OK:1', 'sex_check_accepts_M');
select is((select sex from public.babies where id = '00000000-0000-0000-0000-0000000001b1'), null,
  'existing babies keep sex null');

-- -------------------------------------------------- create_baby_with_family
select has_function('public', 'create_baby_with_family', array['text','date','text','text','uuid'],
  'create_baby_with_family(text,date,text,text,uuid) exists');
select hasnt_function('public', 'create_baby_with_family', array['text','date','text','text'],
  'old 4-arg overload is gone (no ambiguous calls)');
select ok(not has_function_privilege('anon', 'public.create_baby_with_family(text,date,text,text,uuid)', 'execute'),
  'anon_cannot_execute: create_baby_with_family');
select ok(has_function_privilege('authenticated', 'public.create_baby_with_family(text,date,text,text,uuid)', 'execute'),
  'authenticated_can_execute: create_baby_with_family');

-- owner with p_family_id -> same family
select tests.login_as('00000000-0000-0000-0000-0000000001a1');
select is(tests.try_val($$select family_id::text from public.create_baby_with_family('Segundo', '2026-03-01', '🍼', null, '00000000-0000-0000-0000-0000000001f1')$$),
  '00000000-0000-0000-0000-0000000001f1', 'owner_second_baby_with_p_family_id_joins_family');
-- owner of exactly one family, without p_family_id -> that family
select is(tests.try_val($$select family_id::text from public.create_baby_with_family('Terceiro', '2026-03-01')$$),
  '00000000-0000-0000-0000-0000000001f1', 'owner_of_one_family_without_p_family_id_joins_it');
select tests.logout();
select is((select count(*)::int from public.families where created_by = '00000000-0000-0000-0000-0000000001a1'), 1,
  'no new family created for an owner');

-- non-owner (caregiver) with p_family_id -> error
select tests.login_as('00000000-0000-0000-0000-0000000001a2');
select matches(tests.try_exec($$select public.create_baby_with_family('X', '2026-03-01', '🍼', null, '00000000-0000-0000-0000-0000000001f1')$$),
  '^ERR:42501', 'caregiver_with_p_family_id_rejected');
-- foreign owner with p_family_id -> error
select tests.login_as('00000000-0000-0000-0000-0000000001a3');
select matches(tests.try_exec($$select public.create_baby_with_family('X', '2026-03-01', '🍼', null, '00000000-0000-0000-0000-0000000001f1')$$),
  '^ERR:42501', 'foreign_owner_with_p_family_id_rejected');
-- owner of two families, without p_family_id -> must choose
select tests.login_as('00000000-0000-0000-0000-0000000001a4');
select matches(tests.try_exec($$select public.create_baby_with_family('X', '2026-03-01')$$),
  '^ERR:22023:.*family_required', 'owner_of_two_families_must_pass_p_family_id');
select is(tests.try_val($$select family_id::text from public.create_baby_with_family('Y', '2026-03-01', '🍼', null, '00000000-0000-0000-0000-0000000001f4')$$),
  '00000000-0000-0000-0000-0000000001f4', 'owner_of_two_families_picks_one');
-- no family -> new family, caller owner
select tests.login_as('00000000-0000-0000-0000-0000000001a5');
select doesnt_match(tests.try_val($$select family_id::text from public.create_baby_with_family('Novo', '2026-03-01')$$),
  '^(ERR|NULL)', 'user_without_family_gets_new_family');
select tests.logout();
select is((select count(*)::int from public.family_members fm join public.babies b on b.family_id = fm.family_id
           where fm.user_id = '00000000-0000-0000-0000-0000000001a5' and fm.role = 'owner' and b.name = 'Novo'), 1,
  'user_without_family_is_owner_of_new_family');

-- ------------------------------------------------------------- delete_baby
select has_function('public', 'delete_baby', array['uuid'], 'delete_baby(uuid) exists');
select ok(not has_function_privilege('anon', 'public.delete_baby(uuid)', 'execute'), 'anon_cannot_execute: delete_baby');
select ok(has_function_privilege('authenticated', 'public.delete_baby(uuid)', 'execute'), 'authenticated_can_execute: delete_baby');

select tests.login_as('00000000-0000-0000-0000-0000000001a2');
select matches(tests.try_exec($$select public.delete_baby('00000000-0000-0000-0000-0000000001b1')$$),
  '^ERR:42501', 'caregiver_cannot_delete_baby');
select tests.login_as('00000000-0000-0000-0000-0000000001a3');
select matches(tests.try_exec($$select public.delete_baby('00000000-0000-0000-0000-0000000001b1')$$),
  '^ERR:42501', 'foreign_owner_cannot_delete_baby');

-- F1 has three babies: deleting one keeps the family
select tests.login_as('00000000-0000-0000-0000-0000000001a1');
select doesnt_match(tests.try_val($$select 'ok' from public.delete_baby('00000000-0000-0000-0000-0000000001b1')$$),
  '^ERR', 'owner_deletes_one_of_several_babies');
select tests.logout();
select is((select count(*)::int from public.babies where id = '00000000-0000-0000-0000-0000000001b1'), 0, 'baby deleted');
select is((select count(*)::int from public.families where id = '00000000-0000-0000-0000-0000000001f1'), 1,
  'family kept while it still has babies');

-- delete the remaining babies -> family and its members/invites/notes/logs gone
select tests.login_as('00000000-0000-0000-0000-0000000001a1');
select is(tests.try_val($$select count(*)::text from (select public.delete_baby(id) from public.babies where family_id = '00000000-0000-0000-0000-0000000001f1') d$$),
  '2', 'owner_deletes_last_babies');
select tests.logout();
select is((select count(*)::int from public.families where id = '00000000-0000-0000-0000-0000000001f1'), 0,
  'family deleted with its last baby');
select is((select (select count(*) from public.family_members where family_id = '00000000-0000-0000-0000-0000000001f1')
              + (select count(*) from public.family_invites where family_id = '00000000-0000-0000-0000-0000000001f1')
              + (select count(*) from public.family_notes where family_id = '00000000-0000-0000-0000-0000000001f1')
              + (select count(*) from public.sleep_activity_log where family_id = '00000000-0000-0000-0000-0000000001f1'))::int, 0,
  'members, invites, notes and activity of the deleted family are gone');

select * from finish();
rollback;
