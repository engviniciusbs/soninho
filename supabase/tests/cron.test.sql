begin;
create extension if not exists pgtap with schema extensions;
select plan(6);

select is((select schedule from cron.job where jobname = 'soninho-notification-dispatch'),
  '*/5 * * * *', 'dispatch job scheduled every 5 minutes');
select is((select count(*)::int from cron.job where jobname = 'soninho-notification-dispatch'),
  1, 'exactly one dispatch job');
select ok((select command !~* '(bearer|token|eyj)' from cron.job where jobname = 'soninho-notification-dispatch'),
  'job command contains no literal bearer/token');
select ok(not has_function_privilege('anon', 'private.dispatch_notifications()', 'EXECUTE'),
  'anon cannot execute helper');
select ok(not has_function_privilege('authenticated', 'private.dispatch_notifications()', 'EXECUTE'),
  'authenticated cannot execute helper');
select ok(not has_schema_privilege('anon', 'private', 'USAGE'), 'anon has no usage on private schema');

select * from finish();
rollback;
