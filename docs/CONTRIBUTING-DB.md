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
- New `public` functions are executable by `authenticated` by default (the default
  privileges only revoke from PUBLIC and anon). This is what RLS helpers and RPCs need.
- Trigger/internal functions must run `revoke execute on function ... from public, anon,
  authenticated`.
- Functions in non-public schemas need an explicit `grant execute ... to authenticated`
  if clients or RLS must call them.

## Writing pgTAP tests

- Do not call a function you lack permission for as `anon` inside pgTAP: it can crash
  Postgres (segfault on PG 17.6.1.104). Assert with `has_function_privilege` instead.
- Add a test for every new policy, constraint or function.

## Production

Apply to production only after taking a backup. In Supabase CLI 3.x `db push` targets the
local DB by default; production needs `--remote`. Preview first with `--dry-run`:

```bash
npx supabase db push --remote --dry-run
npx supabase db push --remote
```
