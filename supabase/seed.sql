-- Seed LOCAL com dados fictícios. Roda no `npx supabase db reset`. Nunca aplicar em produção.
-- Usuários (senha soninho-local): teste@soninho.local (owner), baba@soninho.local (babá) e
-- viewer@soninho.local (só visualizar).
-- Horários em America/Sao_Paulo.

select setseed(0.42);

do $seed$
declare
  v_owner uuid := '00000000-0000-4000-8000-000000000001';
  v_nanny uuid := '00000000-0000-4000-8000-000000000002';
  v_viewer uuid := '00000000-0000-4000-8000-000000000003';
  v_family uuid := '00000000-0000-4000-8000-0000000000f1';
  v_baby uuid := '00000000-0000-4000-8000-0000000000b1';
  v_pw text := crypt('soninho-local', gen_salt('bf'));
  u record;
begin
  for u in
    select * from (values
      (v_owner, 'teste@soninho.local'),
      (v_nanny, 'baba@soninho.local'),
      (v_viewer, 'viewer@soninho.local')
    ) as t(id, email)
  loop
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change,
      email_change_token_current, phone_change, phone_change_token, reauthentication_token
    ) values (
      '00000000-0000-0000-0000-000000000000', u.id, 'authenticated', 'authenticated', u.email, v_pw, now(),
      '{"provider":"email","providers":["email"]}', '{}', now(), now(),
      '', '', '', '', '', '', '', ''
    );
    insert into auth.identities (
      id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
    ) values (
      gen_random_uuid(), u.id, u.id::text, 'email',
      jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
      now(), now(), now()
    );
  end loop;

  insert into public.families (id, name, created_by) values (v_family, 'Família da Lua', v_owner);
  insert into public.family_members (family_id, user_id, role, display_name, email) values
    (v_family, v_owner, 'owner', 'Teste', 'teste@soninho.local'),
    (v_family, v_nanny, 'caregiver', 'Babá', 'baba@soninho.local'),
    (v_family, v_viewer, 'viewer', 'Avó', 'viewer@soninho.local');

  insert into public.user_profiles (user_id, display_name, family_relation, ui_mode) values
    (v_owner, 'Teste', 'mãe', 'standard'),
    (v_nanny, 'Babá', 'babá', 'nanny'),
    (v_viewer, 'Avó', 'avó', 'standard');

  insert into public.babies (id, user_id, family_id, name, birth_date, avatar_emoji)
  values (v_baby, v_owner, v_family, 'Lua', (current_date - interval '9 months')::date, '🌙');

  -- Noites: ~19:10 a ~06:05, uma por dia nos últimos 21 dias
  insert into public.sleep_sessions (baby_id, type, start_time, end_time, quality)
  select v_baby, 'NIGHT_SLEEP',
         ((current_date - i)::timestamp + interval '19 hours 10 minutes' + (random() * 30 - 15) * interval '1 minute') at time zone 'America/Sao_Paulo',
         ((current_date - i + 1)::timestamp + interval '6 hours 5 minutes' + (random() * 30 - 15) * interval '1 minute') at time zone 'America/Sao_Paulo',
         (3 + floor(random() * 3))::int
  from generate_series(1, 21) as i;

  -- Sonecas: 2 a 3 por dia, só as que já terminaram
  insert into public.sleep_sessions (baby_id, type, start_time, end_time, quality)
  select v_baby, 'NAP', s, s + dur * interval '1 minute', (3 + floor(random() * 3))::int
  from (
    select ((current_date - d)::timestamp + n.base + (random() * 30 - 15) * interval '1 minute') at time zone 'America/Sao_Paulo' as s,
           (40 + floor(random() * 60))::int as dur
    from generate_series(0, 20) as d
    cross join (values (1, interval '9 hours 15 minutes'), (2, interval '12 hours 45 minutes'), (3, interval '16 hours 10 minutes')) as n(k, base)
    where n.k <= 2 or (extract(day from current_date - d)::int % 2 = 0)
  ) x
  where s + dur * interval '1 minute' < now();

  -- Mamadeiras a cada ~3h (07h às 22h), 150 a 200 ml
  insert into public.bottle_feedings (baby_id, start_time, volume_ml, milk_type)
  select v_baby,
         ((current_date - d)::timestamp + interval '7 hours' + h * interval '3 hours' + (random() * 30 - 15) * interval '1 minute') at time zone 'America/Sao_Paulo',
         150 + (floor(random() * 11) * 5)::int,
         (array['FORMULA','FORMULA','BREAST_MILK'])[1 + floor(random() * 3)::int]
  from generate_series(0, 20) as d, generate_series(0, 5) as h
  where ((current_date - d)::timestamp + interval '7 hours' + h * interval '3 hours') at time zone 'America/Sao_Paulo' < now() - interval '15 minutes';

  -- Algumas mamadas no peito (manhã e fim de tarde, dias alternados)
  insert into public.breastfeeding_sessions (baby_id, start_time, end_time, side_left_sec, side_right_sec, last_side)
  select v_baby, s, s + (l + r) * interval '1 second', l, r, case when random() < 0.5 then 'LEFT' else 'RIGHT' end
  from (
    select ((current_date - d)::timestamp + b.base + (random() * 20 - 10) * interval '1 minute') at time zone 'America/Sao_Paulo' as s,
           (300 + floor(random() * 300))::int as l, (300 + floor(random() * 300))::int as r
    from generate_series(0, 20) as d
    cross join (values (interval '5 hours 50 minutes'), (interval '18 hours 20 minutes')) as b(base)
    where d % 2 = 0
  ) x
  where s + (l + r) * interval '1 second' < now();
end
$seed$;
