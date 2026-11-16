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

## Rodar o app localmente com dados fictícios

`supabase/seed.sql` roda sozinho no `npx supabase db reset` e cria dados 100% fictícios
(nunca use contra produção):

- `teste@soninho.local` / `soninho-local`: owner da "Família da Lua".
- `baba@soninho.local` / `soninho-local`: membro `caregiver` com `user_profiles.ui_mode = 'nanny'`
  (o schema não tem coluna `nanny_mode`; o modo babá é o `ui_mode`).
- Bebê "Lua", 9 meses, com 21 noites (~19:10 a ~06:05), 2 a 3 sonecas por dia, mamadeiras
  a cada ~3h (150 a 200 ml) e mamadas no peito. Aleatoriedade determinística via `setseed(0.42)`.
  O schema não tem coluna de despertares, então eles não são modelados.

Passos:

```bash
npx supabase start
npx supabase db reset                 # aplica migrations + seed (local)
npx supabase status -o env            # API_URL, ANON_KEY, SERVICE_ROLE_KEY locais
cp .env.example .env.local            # troque URL e chaves pelas locais; chaves de IA ficam vazias
npm run dev                           # http://localhost:3000, login com teste@soninho.local
```

`.env.local` e `.hallmark/` não são versionados (`.env*` no `.gitignore`; `.hallmark/` em
`.git/info/exclude`). Atenção: `npm run dev` reescreve o `AGENTS.md`; descarte com
`git checkout AGENTS.md` antes de commitar.

### Registro "antes" da Hallmark com sessão

O `sloplint.mjs --render` não tem opção de cookies e precisa de `puppeteer-core`, que não vem
instalado. O que funcionou, sem alterar a skill nem o repositório:

1. `npm i puppeteer-core` num diretório fora do repo e um módulo-ponte `puppeteer-core` nesse
   diretório (apontado por `HALLMARK_PUPPETEER`) que repassa ao `puppeteer-core` real, mas faz
   `page.setCookie(...)` em toda página nova.
2. Os cookies vêm de `@supabase/ssr` (`createServerClient` + `signInWithPassword` com o usuário
   de teste), que gera `sb-127-auth-token` com `domain: localhost`.
3. Com o dev server rodando:

```bash
HALLMARK_PUPPETEER=<dir-da-ponte> CHROME_PATH=/usr/bin/google-chrome \
  node ~/.claude/skills/hallmark/scripts/sloplint.mjs src/app --scope app --render --before \
  --url http://localhost:3000/app --url http://localhost:3000/feeding --url http://localhost:3000/history \
  --url http://localhost:3000/analytics --url http://localhost:3000/settings --url http://localhost:3000/ai-insights
```

Os cookies expiram com o token (1h); gere de novo se o registro redirecionar para `/login`.
