# Contributing: database

Schema lives in `supabase/migrations/`; pgTAP tests in `supabase/tests/`.

## Creating a migration

```bash
npx supabase migration new <name>   # creates supabase/migrations/<timestamp>_<name>.sql
npx supabase db reset               # recreate the local DB from all migrations
npm run test:db                     # run pgTAP tests (needs the local DB running)
```

Start the local DB with `npx supabase db start` (Docker required).

## Rules for functions

- `security definer` only with a fixed `search_path` (e.g. `set search_path = ''`).
- Grants are explicit. The global default revokes EXECUTE from PUBLIC, so every new
  function needs its own `grant execute ... to ...`.
- Functions outside `public` need `grant execute ... to authenticated` as well.

## Writing pgTAP tests

- Do not call a function you lack permission for as `anon` inside pgTAP: it can crash
  Postgres (segfault on PG 17.6.1.104). Assert with `has_function_privilege` instead.
- Add a test for every new policy, constraint or function.

## Production

Apply to production only with `supabase db push`, and only after taking a backup.
