-- Persistent test helpers (installed outside any transaction; wiped by `db reset`).
create extension if not exists pgtap with schema extensions;
create schema if not exists tests;
grant usage on schema tests to anon, authenticated;

create or replace function tests.create_user(uid uuid, email text) returns void
language sql as $$
  insert into auth.users (id, email, raw_user_meta_data, aud, role, instance_id)
  values (uid, email, '{}'::jsonb, 'authenticated', 'authenticated',
          '00000000-0000-0000-0000-000000000000');
$$;

create or replace function tests.login_as(uid uuid) returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  set local role authenticated;
end $$;

create or replace function tests.login_anon() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  set local role anon;
end $$;

create or replace function tests.logout() returns void
language plpgsql as $$
begin
  reset role;
  perform set_config('request.jwt.claims', '', true);
end $$;

-- Runs a statement, ALWAYS rolls its effects back, returns 'OK:<rowcount>'
-- or 'ERR:<sqlstate>:<message>' so a missing function fails an assertion
-- instead of aborting the file.
create or replace function tests.try_exec(q text) returns text
language plpgsql as $$
declare n bigint; res text;
begin
  begin
    execute q;
    get diagnostics n = row_count;
    res := 'OK:' || n;
    raise exception 'rollback' using errcode = 'RBACK';
  exception
    when sqlstate 'RBACK' then null;
    when others then res := 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
  return res;
end $$;

-- Runs a scalar query, KEEPS its effects, returns the value as text
-- or 'ERR:<sqlstate>:<message>'.
create or replace function tests.try_val(q text) returns text
language plpgsql as $$
declare v text;
begin
  begin
    execute q into v;
    return coalesce(v, 'NULL');
  exception when others then
    return 'ERR:' || sqlstate || ':' || sqlerrm;
  end;
end $$;

grant execute on all functions in schema tests to anon, authenticated;

select plan(1);
select pass('test helpers installed');
select * from finish();
