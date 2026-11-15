begin;
create extension if not exists pgtap with schema extensions;
select plan(1);

select tests.create_user('33333333-0000-0000-0000-000000000001', 'pr3-owner@test.local');
insert into public.families (id, name, created_by)
  values ('33333333-0000-0000-0000-0000000000f1', 'PR3 Fam', '33333333-0000-0000-0000-000000000001');
insert into public.family_invites (id, family_id, created_by)
  values ('33333333-0000-0000-0000-0000000000a1', '33333333-0000-0000-0000-0000000000f1',
          '33333333-0000-0000-0000-000000000001');

select matches((select token from public.family_invites where id = '33333333-0000-0000-0000-0000000000a1'),
  '^[0-9a-f]{48}$', 'invite_token_default_is_hex');

select * from finish();
rollback;
