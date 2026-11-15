-- Schedules GET /api/notifications/dispatch every 5 minutes via pg_cron + pg_net.
-- URL and bearer token are read from Supabase Vault at run time (secrets 'dispatch_url'
-- and 'cron_secret'); nothing sensitive lives in this repo or in cron.job.command.
-- If either secret is missing the job is a no-op, so the secrets can be created
-- after this migration has run.

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.dispatch_notifications()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'dispatch_url' limit 1;
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'cron_secret' limit 1;

  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    raise notice 'dispatch_notifications: vault secrets dispatch_url/cron_secret missing; skipping';
    return;
  end if;

  perform net.http_get(
    url := v_url,
    headers := jsonb_build_object('Authorization', 'Bearer ' || v_secret),
    timeout_milliseconds := 25000
  );
end $$;

revoke execute on function private.dispatch_notifications() from public, anon, authenticated;

-- cron.schedule upserts by job name; unschedule first anyway for clarity/idempotency.
do $$
begin
  if exists (select 1 from cron.job where jobname = 'soninho-notification-dispatch') then
    perform cron.unschedule('soninho-notification-dispatch');
  end if;
  perform cron.schedule(
    'soninho-notification-dispatch',
    '*/5 * * * *',
    'select private.dispatch_notifications()'
  );
end $$;
