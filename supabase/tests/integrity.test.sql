-- NOTE: depends on supabase/tests/00_helpers.sql (schema `tests`) running first (alphabetical order).
begin;
create extension if not exists pgtap with schema extensions;
select plan(8);

select tests.create_user(('00000000-0000-0000-0000-0000000000' || u.s)::uuid, u.s || '@example.test')
from (values ('a1'),('a2')) as u(s);
insert into public.families (id, name, created_by) values
  ('00000000-0000-0000-0000-0000000000f1', 'Familia Um', '00000000-0000-0000-0000-0000000000a1');
insert into public.family_members (family_id, user_id, role) values
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000a2', 'caregiver');
insert into public.babies (id, user_id, name, birth_date, family_id) values
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000a1', 'Bebe1', '2026-01-01', '00000000-0000-0000-0000-0000000000f1');
insert into public.sleep_sessions (id, baby_id, type, start_time) values
  ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000b1', 'NAP', now() - interval '5 hours');
update public.sleep_sessions set end_time = now() - interval '4 hours' where id = '00000000-0000-0000-0000-0000000000e1';

-- dedupe fixtures (superuser; no user insert policy exists)
insert into public.notification_events (user_id, baby_id, session_id, event_type, dedupe_key) values
  ('00000000-0000-0000-0000-0000000000a1', '00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-0000000000e1', 'x', 'dk-1');
insert into public.email_log (user_id, kind, dedupe_key) values
  ('00000000-0000-0000-0000-0000000000a1', 'weekly', 'dk-1');

select tests.login_as('00000000-0000-0000-0000-0000000000a2');

select matches(tests.try_exec($$insert into public.sleep_sessions(baby_id,type,start_time) values
  ('00000000-0000-0000-0000-0000000000b1','NAP',now()-interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000b1','NAP',now()-interval '1 hour')$$),
  '^ERR:23505', 'second_open_sleep_rejected');

select is(tests.try_exec($$insert into public.sleep_sessions(baby_id,type,start_time,end_time) values
  ('00000000-0000-0000-0000-0000000000b1','NAP',now()-interval '3 hours',now()-interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000b1','NAP',now()-interval '2 hours',now()-interval '30 minutes')$$),
  'OK:2', 'closed_sessions_unrestricted');

select matches(tests.try_exec($$insert into public.breastfeeding_sessions(baby_id,start_time) values
  ('00000000-0000-0000-0000-0000000000b1',now()-interval '2 hours'),
  ('00000000-0000-0000-0000-0000000000b1',now()-interval '1 hour')$$),
  '^ERR:23505', 'second_open_breastfeeding_rejected');

select is(tests.try_exec($$insert into public.breastfeeding_sessions(baby_id,start_time,end_time) values
  ('00000000-0000-0000-0000-0000000000b1',now()-interval '3 hours',now()-interval '1 hour'),
  ('00000000-0000-0000-0000-0000000000b1',now()-interval '2 hours',now()-interval '30 minutes')$$),
  'OK:2', 'closed_breastfeeding_unrestricted');

select tests.logout();

select matches(tests.try_exec($$insert into public.notification_events (user_id, baby_id, session_id, event_type, dedupe_key) values
  ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000e1','x','dk-1')$$),
  '^ERR:23505', 'dedupe_key_unique_notification_events');

select matches(tests.try_exec($$insert into public.email_log (user_id, kind, dedupe_key) values
  ('00000000-0000-0000-0000-0000000000a1','weekly','dk-1')$$),
  '^ERR:23505', 'dedupe_key_unique_email_log');

select ok(exists (select 1 from pg_constraint where conrelid='public.notification_events'::regclass and contype='u' and conname='notification_events_dedupe_key_key'),
  'notification_events_dedupe_key_key unique constraint exists');
select ok(exists (select 1 from pg_constraint where conrelid='public.email_log'::regclass and contype='u' and conname='email_log_dedupe_key_key'),
  'email_log_dedupe_key_key unique constraint exists');

select * from finish();
rollback;
