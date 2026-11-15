# Fase 1 · PR 1 — Segurança e Banco: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as falhas de autorização do Soninho, versionar o banco de produção como migrations testadas (pgTAP) e fazer os crons funcionarem, sem perder dados de produção.

**Architecture:** O histórico real de produção (1 schema inicial + 12 migrations) vai para `supabase/migrations/`. As correções entram como migrations novas, testadas num Supabase local (Docker) com pgTAP. O app passa a usar RPCs `SECURITY DEFINER` para os fluxos sensíveis: aceitar convite, preview de convite, criar bebê/família. A auditoria `security-audit` (Cloudflare) roda antes (define escopo extra) e depois (confirma). Produção recebe tudo via `supabase db push` após backup.

**Tech Stack:** Next.js 16.2→16.4, Supabase (Postgres 15+, RLS, pg_cron, pg_net, Vault), Supabase CLI 3.1.0 (`npx supabase`), pgTAP (`supabase test db`), zod 4.

**Spec:** `docs/superpowers/specs/2026-11-15-estabilizacao-design.md` (seções 6, 8.0, 8.1, 10)

## Global Constraints

- Branch: `fase1/01-seguranca` (já existe, contém o commit do design).
- Commits como `engviniciusbs` (config local do repo), mensagens convencionais, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- CLI: sempre `npx supabase …` (v3.1.0). Usar `--remote`, não `--linked`. DDL em produção **somente** via `npx supabase db push`; nunca `apply_migration` do MCP.
- **Nada de dados pessoais no repo**: nenhum UUID, e-mail ou nome real em migrations, testes, fixtures, PR ou docs. Fixtures de teste usam UUIDs fixos inventados (`00000000-0000-0000-0000-0000000000a1` etc.).
- Next 16: ler `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` antes de mexer em `middleware`/`proxy`.
- Mensagens ao usuário em PT-BR; código e comentários em inglês.
- Papéis: `owner | caregiver | viewer`. Convites só concedem `caregiver | viewer`.
- Antes de qualquer push para produção: backup em `~/soninho-backups/2026-11-15/` (fora do repo).
- Gate de cada task: `npm run lint` (sem novos erros), `npx tsc --noEmit`, e, a partir da Task 3, `npx supabase test db` verdes.

## Review Focus

1. **A família atual não pode perder acesso.** Owner e caregiver existentes continuam lendo e escrevendo sono e alimentação, e editando o próprio `display_name`/`family_relation` depois das novas políticas. Teste pgTAP `existing_family_access` (Task 4).
2. **Usuário novo cadastrando o primeiro bebê.** Com S2 fechado, `createBaby` não pode mais se auto-inserir; precisa funcionar via RPC. Teste pgTAP `create_baby_with_family_*` (Task 4) e smoke manual (Task 11).
3. **Link de convite aberto sem login.** O preview precisa mostrar nome da família e papel; aceitar sendo já membro não muda o papel. Testes `invite_preview_anon` e `accept_existing_member_noop` (Task 4).
4. **Timer iniciado com estado local velho** enquanto outro cuidador já iniciou: deve sincronizar com a sessão existente, nunca erro cru. Teste pgTAP `second_open_sleep_rejected` (Task 5) + verificação manual (Task 7).
5. **Registro manual de mamada** (FeedingForm) com um timer de amamentação ativo: não pode colidir com o índice de sessão aberta. Coberto pela Task 7 (insert já com `end_time`).

---

## File Structure

```
supabase/
├── config.toml                                   # supabase init
├── .gitignore                                    # gerado; ignora .temp/
├── migrations/
│   ├── 20260101000000_initial_schema.sql         # babies, sleep_sessions, calculate_duration (de supabase-schema.sql)
│   ├── 20260413105925_add_avatar_url_to_babies.sql            ┐
│   ├── … (as 12 de produção, SQL de schema_migrations.statements)│ histórico real
│   ├── 20260413155216_repair_family_data.sql     # no-op higienizado ┘
│   ├── 20261115120000_storage_baby_avatars.sql   # bucket + policies (idempotente)
│   ├── 20261115120100_fix_family_authorization.sql
│   ├── 20261115120200_integrity_constraints.sql
│   └── 20261115120300_schedule_notification_dispatch.sql
└── tests/
    ├── 00_helpers.sql                            # fixtures + funções de login simulado
    ├── family_authorization.test.sql
    └── integrity.test.sql
src/proxy.ts                                      # substitui src/middleware.ts
src/lib/supabase/queries.ts                       # convites/bebê via RPC
src/lib/supabase/sessionConflict.ts               # novo: detecção de 23505 + busca da sessão aberta
src/app/api/family/accept/[token]/route.ts
src/app/api/family/invite/route.ts
src/app/api/family/members/route.ts
src/app/api/ai/{chat,suggest,regression}/route.ts # auth explícita
src/hooks/useSleepTimer.ts, useBreastfeedingTimer.ts
src/lib/supabase/feedingQueries.ts, src/components/feeding/FeedingForm.tsx
src/types/database.ts                             # regenerado
```

---

### Task 0: Ferramentas

**Files:** Create `supabase/config.toml`, `supabase/.gitignore`; Modify `package.json` (devDependency `supabase@3.1.0`).

- [ ] **Step 1:** `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit --global`. Resultado esperado: a skill `security-audit` aparece entre as skills disponíveis (pode exigir reiniciar a sessão; se não aparecer, ler `SKILL.md` direto do diretório instalado e seguir manualmente).
- [ ] **Step 2:** `npm i -D supabase@3.1.0` e depois `npx supabase init` (responder "não" a gerar settings de VS Code/IntelliJ). Esperado: `supabase/config.toml` criado e `supabase/.gitignore` contendo `.temp`. O `link` existente (`supabase/.temp/project-ref`) continua.
- [ ] **Step 3:** Em `config.toml`: `project_id = "soninho"`, `[db] major_version` igual ao de produção (`select current_setting('server_version_num')` via MCP), `[auth] site_url = "http://localhost:3000"`, `additional_redirect_urls = ["http://localhost:3000/auth/callback"]`.
- [ ] **Step 4:** `npx supabase start` sobe sem erro; `npx supabase stop`.
- [ ] **Step 5:** `git status` não mostra `supabase/.temp`. Commit `chore: add supabase cli and local config` incluindo `.mcp.json` e as edições pendentes de `README.md`/`README.en.md` (correção do template de confirmação, já no working tree).

### Task 1: Auditoria de entrada (security-audit run-1)

**Files:** nenhuma no repo. Saída em `~/security-audit-skill/soninho/run-1/`.

- [ ] **Step 1:** Exportar o contexto de produção para `~/security-audit-skill/soninho/context/` (fora do repo): `pg_policies` de `public` e `storage`, `pg_get_functiondef` das funções `public.*` e lista de grants de `EXECUTE` (via MCP `execute_sql`, só leitura). Sem dados de linhas.
- [ ] **Step 2:** Invocar a skill `security-audit` em **full audit mode**, perfil `standard`, target `/mnt/dados/dev/soninho`, output `~/security-audit-skill/soninho/run-1`, apontando o diretório `context/` como evidência adicional da RLS de produção. Respeitar as regras dela: só código-fonte, nada contra soninho.baby/produção.
- [ ] **Step 3:** Ao concluir, ler `REPORT.md`/`findings.json`. Para cada `confirmed`:
  - se já coberto por S1–S8 ou pelas Tasks 2–10 → anotar o ID do achado na task correspondente;
  - se for de banco/autorização → nova task neste plano (seção "Tasks da auditoria", no fim), antes da Task 11;
  - se for de aplicação, sem relação com autorização → anotar para o plano do PR 3.
  - Listar `needs_validation` no resumo do PR.
- [ ] **Step 4:** Commit deste plano atualizado: `docs: add security audit findings to PR1 plan`.

### Task 2: Versionar o banco (sem mudar produção)

**Files:** Create `supabase/migrations/20260101000000_initial_schema.sql`, as 12 de produção, `20261115120000_storage_baby_avatars.sql`; Delete `supabase-schema.sql`.

- [ ] **Step 1:** Extrair as 12 migrations via MCP: `select version, name, array_to_string(statements, E';\n') from supabase_migrations.schema_migrations order by version`. Gravar cada uma em `supabase/migrations/<version>_<name>.sql`.
- [ ] **Step 2:** Higienizar: `20260413155216` vira `20260413155216_repair_family_data.sql` com só o comentário `-- One-off production data repair (2026-04-13). Removed: contained personal data. Intentionally a no-op.`. Varrer as outras 11 com `grep -nEi "[0-9a-f]{8}-[0-9a-f]{4}-|@|insert into|update .* set"` e higienizar qualquer dado de linha real da mesma forma (manter DDL).
- [ ] **Step 3:** `20260101000000_initial_schema.sql` = conteúdo de `supabase-schema.sql` (extensão uuid-ossp, `babies`, `sleep_sessions`, RLS e políticas legadas, trigger `calculate_duration`, índices). As políticas legadas são exatamente as que `20260413155743_drop_legacy_babies_sleep_rls_policies` remove: conferir que os nomes batem.
- [ ] **Step 4:** `20261115120000_storage_baby_avatars.sql`: `insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values ('baby-avatars','baby-avatars',true,5242880,'{image/jpeg,image/png,image/webp,image/gif}') on conflict (id) do nothing;` mais as 4 políticas de `storage.objects` (`Public can read avatars`, `Users can upload/update/delete their own avatars`, com o texto atual de produção), cada uma precedida de `drop policy if exists`. Idempotente, para rodar em produção sem efeito.
- [ ] **Step 5:** `npx supabase db reset` termina sem erro. Se uma migration antiga falhar localmente (ex.: depende de algo criado pelo SQL Editor), corrigir **só** a `initial_schema` para conter o que faltava; não editar o SQL das 12.
- [ ] **Step 6:** Comparar local × produção: `npx supabase db diff --remote --schema public,storage`. Esperado: diff vazio, ou só a política/bucket de storage que a migration 120000 recria de forma idempotente. Qualquer outra diferença → ajustar `initial_schema`.
- [ ] **Step 7:** `npx supabase migration repair --status applied 20260101000000` (só a tabela de histórico de produção). `npx supabase migration list --remote` mostra local = remoto para as 13; `20261115120000` aparece pendente.
- [ ] **Step 8:** Apagar `supabase-schema.sql`; README PT/EN: trocar as instruções de schema por `npx supabase start` / `npx supabase db reset` / `npx supabase test db`. Commit `chore(db): version production schema as supabase migrations`.

### Task 3: Testes pgTAP de segurança (vermelhos)

**Files:** Create `supabase/tests/00_helpers.sql`, `supabase/tests/family_authorization.test.sql`.

**Interfaces — Produces:**
- `tests.create_user(uid uuid, email text)`: insere em `auth.users`.
- `tests.login_as(uid uuid)`: `set local role authenticated` + `set local request.jwt.claims = json_build_object('sub', uid, 'role','authenticated')::text`.
- `tests.login_anon()`: `set local role anon` + claims `{"role":"anon"}`.
- `tests.logout()`: `reset role`.
- Fixture fixa: família F1 com owner `…a1`, caregiver `…a2`, viewer `…a3`; família F2 com owner `…b1`; usuário sem família `…c1`; bebê B1 em F1, B2 em F2; convite I1 (F1, caregiver, válido), I2 (F1, expirado), I3 (F1, revogado).

- [ ] **Step 1:** `create extension if not exists pgtap with schema extensions;` no topo de cada arquivo de teste. Cada arquivo: `begin; select plan(N); … select * from finish(); rollback;`.
- [ ] **Step 2:** Escrever em `family_authorization.test.sql` (nomes = descrição do `ok`/`throws_ok`):
  - `anon_cannot_list_invites`: como anon, `select count(*) from family_invites` = 0.
  - `viewer_cannot_list_invites`: como `…a3`, `select count(*) from family_invites` = 0.
  - `outsider_cannot_self_insert_member`: como `…c1`, `insert into family_members(family_id,user_id,role) values (F1,'…c1','owner')` → throws `42501`.
  - `outsider_cannot_self_insert_as_viewer`: idem com `role='viewer'` → throws.
  - `viewer_cannot_change_own_role`: como `…a3`, `update family_members set role='owner' where user_id='…a3'` → throws (mensagem do trigger) **ou** 0 linhas afetadas e role continua `viewer`.
  - `member_can_update_own_relation`: como `…a2`, `update … set family_relation='avo', display_name='X'` → afeta 1 linha.
  - `last_owner_cannot_demote_self`: como `…a1`, `update … set role='caregiver' where user_id='…a1'` → throws.
  - `last_owner_cannot_leave`: como `…a1`, `delete from family_members where user_id='…a1' and family_id=F1` → throws.
  - `owner_can_change_member_role`: como `…a1`, rebaixar `…a2` para viewer → 1 linha.
  - `invite_preview_anon`: como anon, `select status, family_name, role from get_invite_preview(<token I1>)` = `('valid', <nome F1>, 'caregiver')`; a função não tem coluna `token`.
  - `invite_preview_expired` / `invite_preview_revoked` / `invite_preview_not_found`: status `expired` / `revoked` / `not_found`.
  - `accept_invite_grants_role`: como `…c1`, `select accept_family_invite(<I1>, 'Fulano')` retorna F1; `…c1` vira `caregiver` em F1; I1 tem `accepted_at` e `accepted_by='…c1'`.
  - `accept_invite_twice_rejected`: outro usuário novo `…c2` tenta I1 → throws `invite_not_valid`.
  - `accept_expired_rejected`, `accept_revoked_rejected` → throw.
  - `accept_existing_member_noop`: como `…a3` (viewer de F1), aceitar um convite caregiver novo I4 de F1 → retorna F1, role continua `viewer`, I4 **não** é consumido.
  - `anon_cannot_accept`: como anon, `accept_family_invite` → throws `42501`.
  - `anon_cannot_execute_helpers`: como anon, `select get_user_family_ids('…a1')` → throws `42501` (o mesmo para `get_user_owned_family_ids`, `user_can_write_family`).
  - `existing_family_access`: como `…a2`, insert e update de `sleep_sessions` de B1 funcionam; como `…a3`, insert → throws; como `…b1`, `select count(*) from sleep_sessions where baby_id=B1` = 0.
  - `create_baby_with_family_new_user`: como `…c3` (novo), `select * from create_baby_with_family('Bebê', '2026-01-01', '🍼', null)` retorna bebê com `family_id` não nulo; `…c3` é `owner` dessa família.
  - `calculate_duration_search_path`: `select proconfig from pg_proc where proname='calculate_duration'` contém `search_path=public`.
- [ ] **Step 3:** `npx supabase db reset && npx supabase test db`. Esperado: FALHAS nos testes de S1/S2/S3/S6/S7 e nas funções inexistentes; `existing_family_access` e `member_can_update_own_relation` já passam.
- [ ] **Step 4:** Commit `test(db): add failing pgTAP authorization tests`.

### Task 4: Migration `fix_family_authorization`

**Files:** Create `supabase/migrations/20261115120100_fix_family_authorization.sql`.

**Interfaces — Produces (consumidas pela Task 6):**
- `public.get_invite_preview(p_token text) returns table(status text, family_name text, role text, family_relation text, inviter_name text, expires_at timestamptz)`: `security definer`, `set search_path = public`, `stable`, grant `anon, authenticated`. `status ∈ {'valid','expired','revoked','accepted','not_found'}`. `inviter_name` = `family_members.display_name` do `created_by` naquela família (pode ser null).
- `public.accept_family_invite(p_token text, p_display_name text default null) returns uuid` (family_id): `security definer`, `set search_path = public`, `volatile`, grant só `authenticated`. Erro com `raise exception 'invite_not_valid' using errcode = 'P0001'` quando inválido; `'not_authenticated'` (errcode `42501`) sem `auth.uid()`.
- `public.create_baby_with_family(p_name text, p_birth_date date, p_avatar_emoji text default '🍼', p_avatar_url text default null) returns public.babies`: `security definer`, `set search_path = public`, grant só `authenticated`. Cria família (`name = p_name || '''s familia'`, como o código atual), membro owner (`display_name` e `email` vindos de `auth.users`) e bebê, numa transação.

- [ ] **Step 1:** S1: `drop policy "Anyone can read invite by token" on family_invites;`.
- [ ] **Step 2:** S2: `drop policy "Self or owner can insert members" on family_members;` e `create policy "Owner can insert members" … for insert with check (family_id in (select get_user_owned_family_ids(auth.uid())));`.
- [ ] **Step 3:** S3: função de trigger `public.guard_family_member_change()` (`security definer`, `search_path=public`) em `before update or delete on family_members`:
  - UPDATE que muda `role`, `family_id` ou `user_id` exige que `auth.uid()` seja owner da família (via `get_user_owned_family_ids`); caso contrário `raise exception 'forbidden_role_change' using errcode='42501'`.
  - UPDATE ou DELETE que deixaria a família sem nenhum `owner` → `raise exception 'family_needs_owner' using errcode='P0001'`.
  - Quando `auth.uid()` é null (service role, migrations), o trigger permite a mudança, mas mantém a regra de "família precisa de owner" **só** para chamadas com `auth.uid()` não nulo. Assim o `ON DELETE CASCADE` de `families` não é bloqueado.
- [ ] **Step 4:** As 3 funções RPC da interface acima. `accept_family_invite`:
  1. `select … for update` em `family_invites where token = p_token`;
  2. inválido (não existe, revogado, aceito ou expirado) → `invite_not_valid`;
  3. já é membro de `family_id` → `return family_id` sem tocar convite nem papel;
  4. senão, insert em `family_members` com `role = invite.role`, `display_name = coalesce(p_display_name, auth.users.raw_user_meta_data->>'full_name')`, `email` de `auth.users`, `family_relation`, `invited_by`;
  5. update do convite (`accepted_at = now()`, `accepted_by = auth.uid()`);
  6. `return family_id`.
- [ ] **Step 5:** S6: para as 3 helpers e as 3 RPCs: `revoke execute … from public, anon;` e `grant execute … to authenticated;` (exceto `get_invite_preview`: grant também a `anon`). Também `alter default privileges in schema public revoke execute on functions from public, anon;`.
- [ ] **Step 5a (S10, lead `caller-supplied-uid`):** as 3 helpers passam a ignorar consultas sobre outro usuário: `create or replace` mantendo assinatura, com corpo filtrando também `uid = auth.uid()` **quando `auth.uid()` não é nulo** (service role/cron continua funcionando). Teste pgTAP `helpers_ignore_foreign_uid`: como `…c1`, `select count(*) from get_user_family_ids('…a1')` = 0; como `…a1` → 1.
- [ ] **Step 6:** S7: `alter function public.calculate_duration() set search_path = public;`.
- [ ] **Step 6a (S9, achado `rls/babies/insert-update-unbound-family-id`):** substituir as políticas de INSERT e UPDATE de `babies`:
  - INSERT `with check (auth.uid() = user_id and (family_id is null or family_id in (select get_user_owned_family_ids(auth.uid()))))`;
  - UPDATE `using (...atual...) with check (family_id is null or user_can_write_family(auth.uid(), family_id))`, mais `user_id` imutável (trigger ou `with check (user_id = <valor antigo>)` via trigger `BEFORE UPDATE` que rejeita mudança de `user_id`/`family_id` por não-owner).
  - Testes pgTAP (adicionar na Task 3/4): `outsider_cannot_insert_baby_into_foreign_family`, `caregiver_cannot_move_baby_to_foreign_family`.

- [ ] **Step 7:** `npx supabase db reset && npx supabase test db`. Esperado: todos os testes da Task 3 PASS.
- [ ] **Step 8:** Commit `fix(db): close family authorization holes and add invite/baby RPCs`.

### Task 5: Migration `integrity_constraints`

**Files:** Create `supabase/migrations/20261115120200_integrity_constraints.sql`, `supabase/tests/integrity.test.sql`.

- [ ] **Step 1:** Antes de escrever, checar produção via MCP: duplicatas de `dedupe_key` em `notification_events` e `email_log`, e `end_time < start_time` em `breastfeeding_sessions`. Se houver duplicata de `dedupe_key`, a migration apaga as mais novas, mantendo `min(ctid)`, antes de criar o unique. Se não houver, sem limpeza.
- [ ] **Step 2:** Testes (vermelhos):
  - `second_open_sleep_rejected`: como caregiver `…a2`, inserir duas `sleep_sessions` com `end_time null` para B1 → a 2ª throws `23505`.
  - `closed_sessions_unrestricted`: duas sessões fechadas sobrepostas para B1 → ok.
  - `second_open_breastfeeding_rejected`: idem com `breastfeeding_sessions`.
  - `dedupe_key_unique_notification_events` e `dedupe_key_unique_email_log`: segundo insert com a mesma chave → `23505`.
- [ ] **Step 3:** Migration:
  - `create unique index sleep_sessions_one_open_per_baby on sleep_sessions(baby_id) where end_time is null;`
  - o mesmo para `breastfeeding_sessions_one_open_per_baby`;
  - `alter table notification_events add constraint notification_events_dedupe_key_key unique (dedupe_key);` e o mesmo para `email_log`. Se a coluna puder ser nula, unique permite vários nulls, o que é ok.
- [ ] **Step 4:** `npx supabase db reset && npx supabase test db` PASS. Commit `fix(db): enforce one open session per baby and unique dedupe keys`.

### Task 6: App usa as RPCs; rotas de família endurecidas

**Files:** Modify `src/lib/supabase/queries.ts` (`createBaby`, `getInviteByToken`, `acceptFamilyInvite`), `src/app/api/family/accept/[token]/route.ts`, `src/app/invite/[token]/page.tsx`, `src/app/api/family/invite/route.ts`, `src/app/api/family/members/route.ts`, `src/types/database.ts`.

**Interfaces — Consumes:** RPCs da Task 4. **Produces:** `getInvitePreview(supabase, token)` → `{ data: InvitePreview | null, error }`; `acceptFamilyInvite(supabase, token, displayName)` → `{ data: { family_id: string } | null, error }`; `createBaby` mantém a assinatura atual e passa a chamar `rpc('create_baby_with_family', …)`.

- [ ] **Step 1:** Regenerar tipos: `npx supabase gen types typescript --local > src/types/database.ts`. Corrigir os pontos que quebrarem no `tsc` (o arquivo antigo era escrito à mão; manter os aliases de `src/types/index.ts` funcionando).
- [ ] **Step 2:** `queries.ts`: `createBaby` → `supabase.rpc("create_baby_with_family", { p_name, p_birth_date, p_avatar_emoji, p_avatar_url })`; remover os inserts diretos em `families`/`family_members`. Trocar `getInviteByToken` por `getInvitePreview` (rpc) e `acceptFamilyInvite` pela rpc.
- [ ] **Step 3:** `accept/[token]/route.ts`:
  - GET devolve `{ data: { status, family_name, role, family_relation, inviter_name, expires_at } }`; 404 se `status !== 'valid'`, com `{ error, status }`;
  - POST mapeia `invite_not_valid` → 410 com mensagem PT-BR "Convite inválido ou expirado", e outros erros → 500 genérico.
  - Remover o `as any`.
  - Ajustar `invite/[token]/page.tsx` ao novo formato: não usa mais `id`/`family_id`.
- [ ] **Step 4:** `invite/route.ts`:
  - GET exige `role === "owner"` (403 caso contrário);
  - DELETE: além de owner, conferir que o `inviteId` pertence à família do `babyId` (`.eq("family_id", family.id)` no revoke).
- [ ] **Step 5:** `members/route.ts`:
  - body validado com zod: PATCH `{ babyId: uuid, targetUserId: uuid, role: z.enum(["caregiver","viewer"]) }`, DELETE `{ babyId, targetUserId }`;
  - PATCH com `targetUserId === user.id` → 400 "Você não pode alterar o próprio papel";
  - erro do trigger `family_needs_owner` → 409 "A família precisa de pelo menos um responsável";
  - erros genéricos sem `error.message` para o cliente.
- [ ] **Step 6:** Smoke local: `npx supabase start`, `.env.local` apontando para o local (`npx supabase status -o env`), `npm run dev`. Verificar: cadastro novo → criar bebê; owner gera convite; janela anônima abre `/invite/<token>` e vê preview; segunda conta aceita e vira caregiver; reabrir o mesmo link dá "Convite inválido ou expirado".
- [ ] **Step 7:** lint + tsc. Commit `fix: use secure RPCs for invites and baby creation, harden family routes`.

### Task 7: Conflito de sessão aberta no app

**Files:** Create `src/lib/supabase/sessionConflict.ts`; Modify `src/hooks/useSleepTimer.ts` (handleStart), `src/hooks/useBreastfeedingTimer.ts:102-121`, `src/lib/supabase/feedingQueries.ts` (insert manual), `src/components/feeding/FeedingForm.tsx:211-225`, `src/app/api/sleep/route.ts` (POST).

**Interfaces — Produces:** `isUniqueViolation(error: { code?: string } | null): boolean` (true para `code === "23505"`).

- [ ] **Step 1:** `useSleepTimer.handleStart`:
  - se `startSleepSession` retornar `isUniqueViolation(error)`, buscar `getActiveSleepSession(supabase, baby.id)`;
  - se achar, chamar `startTimer` com o `id`, `start_time` e `type` dela (mesma ação usada hoje na sincronização), sem registrar atividade;
  - toast `"Já existe um sono em andamento — sincronizado ✨"`;
  - outros erros mantêm o comportamento atual.
- [ ] **Step 2:** `useBreastfeedingTimer.handleStart`: mesma lógica com a sessão de amamentação aberta e toast `"Já existe uma mamada em andamento — sincronizada 🤱"`.
- [ ] **Step 3:** Registro manual no `FeedingForm`: nova função `insertBreastfeedingSession(supabase, babyId, { start_time, end_time, side_left_sec, side_right_sec, last_side, notes })` em `feedingQueries.ts`, que insere já fechada. `FeedingForm` usa essa função no lugar de start+update. O POST de `/api/sleep` com `end_time` ausente e conflito → 409 `{ error: "Já existe um sono em andamento" }`.
- [ ] **Step 4:** Verificação local: com o app em duas abas (mesma família), iniciar sono na aba A; na aba B, com o estado velho (limpar a chave `soninho-timer` do localStorage antes), iniciar → a aba B mostra o toast e o timer da sessão da A. Registro manual de mamada com timer de amamentação ativo → salva.
- [ ] **Step 5:** lint + tsc. Commit `fix: sync with existing open session instead of failing on conflict`.

### Task 8: `proxy.ts` e autenticação explícita nas APIs

**Files:** Delete `src/middleware.ts`; Create `src/proxy.ts`; Modify `src/app/api/ai/chat/route.ts`, `src/app/api/ai/suggest/route.ts`, `src/app/api/ai/regression/route.ts` e qualquer outro handler sem `getUser()`.

- [ ] **Step 1:** Ler o guia de upgrade do Next 16 (seção proxy). Criar `src/proxy.ts` com `export async function proxy(request: NextRequest)` e o mesmo `config.matcher`, ampliado para excluir também `sw.js`, `manifest.webmanifest` e `robots.txt`.
- [ ] **Step 2:** Regras:
  - `pathname.startsWith("/api/")` → só renova a sessão e devolve `supabaseResponse`, **nunca** redireciona;
  - páginas: mesmas regras de hoje (`/`, `/login`, `/register`, `/auth/*`, `/invite/*` públicos; o resto redireciona para `/login?redirect=`; logado em `/`, `/login` ou `/register` vai para `/app`; `/landing` vai para `/`).
- [ ] **Step 3:** Varredura: `grep -L "getUser\|CRON_SECRET" src/app/api/**/route.ts`. Cada arquivo listado ganha `getUser()` → 401. As rotas de IA também checam `getUserRoleForBaby(...)` não nulo → 403. Exceção documentada: `api/family/accept/[token]` GET (preview público via RPC).
- [ ] **Step 3a (achados `auth/login-page/unvalidated-redirect-param` e `auth/callback/next-param-origin-concat`):** criar `src/lib/safeRedirect.ts` com `safeRedirectPath(value: string | null | undefined, fallback = "/app"): string`. Aceita só strings que começam com `/`, não começam com `//` nem `/\\`, e não contêm `\r`/`\n`; caso contrário devolve o `fallback`. Usar em `src/app/(auth)/auth/callback/route.ts` (`next`) e `src/app/(auth)/login/page.tsx` (`redirect`). Sem Vitest ainda (PR 2): cobrir com um teste rápido em `node --test` em `src/lib/safeRedirect.test.mjs`? Não: manter só a verificação curl/manual aqui e registrar o teste Vitest como obrigatório no PR 2. Curl: `curl -i "localhost:3000/auth/callback?next=@evil.com"` não pode redirecionar para outro host.
- [ ] **Step 4:** Verificação: `npm run build` (com env fictícia, ver Task 9) sem o warning de middleware depreciado. `npm run dev` + `curl -i localhost:3000/api/email/weekly` → **401 JSON** (não 307); `curl -i -H "Authorization: Bearer $CRON_SECRET" …` → 200; `curl -i localhost:3000/api/ai/suggest -X POST` → 401; `curl -i localhost:3000/app` → 307 para `/login?redirect=%2Fapp`.
- [ ] **Step 5:** Commit `fix: migrate middleware to proxy and stop redirecting API routes`.

### Task 9: Bump de segurança `next` e `zod`

**Files:** Modify `package.json`, `package-lock.json`.

- [ ] **Step 1:** `npm i next@^16.4.6 eslint-config-next@^16.4.6 zod@^4.6.6`.
- [ ] **Step 2:** `npm run lint`, `npx tsc --noEmit`, e build com env fictícia: `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x SUPABASE_SERVICE_ROLE_KEY=x OPENAI_API_KEY=x RESEND_API_KEY=x NEXT_PUBLIC_VAPID_PUBLIC_KEY=BElf… VAPID_PRIVATE_KEY=… VAPID_CONTACT_EMAIL=mailto:dev@example.com CRON_SECRET=x npm run build`. Gerar um par VAPID válido com `npx web-push generate-vapid-keys` só para o build.
- [ ] **Step 3:** `npm audit --omit=dev`: nenhuma vulnerabilidade **crítica** vinda de `next`/`zod`. As restantes, vindas de `shadcn`, ficam para o PR 2; listar no PR.
- [ ] **Step 4:** Commit `chore(deps): bump next and zod for security fixes`.

### Task 10: Agendar o dispatch de notificações (pg_cron + pg_net + Vault)

**Files:** Create `supabase/migrations/20261115120300_schedule_notification_dispatch.sql`.

- [ ] **Step 1:** Migration:
  - `create extension if not exists pg_cron; create extension if not exists pg_net;`;
  - `select cron.schedule('soninho-notification-dispatch', '*/5 * * * *', $$ select net.http_get(url := (select decrypted_secret from vault.decrypted_secrets where name='dispatch_url'), headers := jsonb_build_object('Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name='cron_secret')), timeout_milliseconds := 25000) $$);`;
  - envolver em `do $$ … $$` que só agenda se os dois segredos existirem no Vault e avisa com `raise notice` caso contrário. Assim `db reset` local não falha. Sem segredos em texto.
- [ ] **Step 2:** `npx supabase db reset` OK (notice de segredo ausente no local).
- [ ] **Step 3:** Commit `feat(db): schedule notification dispatch with pg_cron`.

### Task 11: Aplicar em produção e publicar

- [ ] **Step 1: Backup.** `mkdir -p ~/soninho-backups/2026-11-15`, depois `npx supabase db dump --remote -f ~/soninho-backups/2026-11-15/schema.sql` e `npx supabase db dump --remote --data-only -f ~/soninho-backups/2026-11-15/data.sql`. Conferir que `data.sql` tem `sleep_sessions` com cerca de 965 linhas.
- [ ] **Step 2: Rotacionar `CRON_SECRET` (Vercel + Vault).** Projeto Vercel `prj_luHjWmaCj0RLusRH1RdMbU0803NT` (team `team_6eAS3Y1o8vCDs3oiR4Vy6Uc4`), env `CRON_SECRET` id `H6O2Z9FeaCQuySXF`. Não descriptografar o valor antigo.
  1. Gerar um novo valor com `openssl rand -hex 32`, guardando-o apenas em variável de shell.
  2. Vercel MCP: atualizar `CRON_SECRET` (development, preview, production) para o novo valor, recriando como `sensitive`.
  3. Supabase MCP `execute_sql`: `select vault.create_secret('<novo>', 'cron_secret'); select vault.create_secret('https://soninho.baby/api/notifications/dispatch', 'dispatch_url');`.
  4. Nunca escrever o valor no repo, no PR nem em logs.
  5. O novo valor só vale para a Vercel após um deploy: o merge do Step 5 já faz isso.
  6. Hardening extra *(decisão do Claude)*: recriar também como `sensitive` as envs marcadas `readable-secret` (`SUPABASE_SERVICE_ROLE_KEY`, `VAPID_PRIVATE_KEY`, `OPENAI_API_KEY`), com o mesmo valor. Isso exige ler o valor uma única vez via MCP com decrypt, sem imprimir. Se o MCP não permitir trocar o tipo sem expor o valor no contexto, pular e listar no resumo.
- [ ] **Step 3: Push.** `npx supabase db push --dry-run` (deve listar só `20261115120000…120300`), depois `npx supabase db push`.
- [ ] **Step 4: Verificar produção** via MCP:
  - `get_advisors(security)`: sem `anon_security_definer_function_executable` para as helpers e sem `function_search_path_mutable`;
  - `select count(*) from sleep_sessions` igual ao do backup;
  - `select * from cron.job`: o job existe;
  - depois de ~5 min, `select status_code from net._http_response order by created desc limit 3`: 401 até o deploy (ver Step 5), 200 depois.
- [ ] **Step 5: PR e deploy.** `git push -u origin fase1/01-seguranca`, depois `gh pr create` com título `Fase 1 · PR 1 — Segurança e banco`. Corpo:
  - resumo de S1–S8 e achados da auditoria;
  - SQL das migrations novas (resumo + links dos arquivos);
  - como foi testado (pgTAP, smoke, curl);
  - itens `needs_validation`;
  - rodapé `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
  
  Merge (`gh pr merge --squash --delete-branch`) logo após o Step 3, para minimizar a janela em que o fluxo antigo de convite está quebrado. Aguardar o deploy da Vercel (`gh pr view --json mergeCommit` + checar `https://soninho.baby` responder 200).
- [ ] **Step 6: Smoke em produção** (só leitura, sem criar dados):
  - `curl -s -o /dev/null -w "%{http_code}" https://soninho.baby/api/email/weekly` → `401`;
  - `https://soninho.baby/` → 200;
  - `/app` sem cookie → 307 para `/login`.
  - Em seguida o `net._http_response` do cron passa a 200.
- [ ] **Step 7: Leaked password protection.** Tentar via Management API: `curl -X PATCH https://api.supabase.com/v1/projects/<ref>/config/auth -H "Authorization: Bearer $(cat ~/.supabase/access-token)" -H "Content-Type: application/json" -d '{"password_hibp_enabled": true}'`. Se o token não estiver nesse caminho ou o plano não permitir (402/400), registrar no resumo final.

### Task 12: Auditoria de saída (security-audit run-2)

- [ ] **Step 1:** Rodar a skill de novo, full audit, output `~/security-audit-skill/soninho/run-2`, com o run-1 como run anterior (a skill revalida achados e foca no código alterado), sobre a `main` já com o merge.
- [ ] **Step 2:** Todo `confirmed` do run-1 deve estar resolvido. Se algum `confirmed` novo for de autorização ou banco: hotfix em `fase1/01b-seguranca-hotfix` seguindo o mesmo ciclo (teste pgTAP vermelho → migration → push → PR → merge). Se for de aplicação: anotar no plano do PR 3.
- [ ] **Step 3:** Resumo ao autor: o que foi corrigido, o que ficou `needs_validation` e qualquer ação que não deu para automatizar (ex.: `CRON_SECRET` na Vercel, HIBP).

## Tasks da auditoria

Run-1: `~/security-audit-skill/soninho/run-1/` (status `incomplete`/`validation_budget_exhausted`; 4 confirmed, 2 needs_validation, 5 leads não validados).

| Achado (ID) | Sev. | Destino |
|---|---|---|
| `rls/babies/insert-update-unbound-family-id` | medium | **Task 4, Step 6a (S9)** |
| `logic/invite-accept/accepted-update-blocked-by-rls-invite-reusable` | medium | coberto pela Task 4 (`accept_family_invite` atômica) + teste `accept_invite_twice_rejected` |
| `auth/login-page/unvalidated-redirect-param` | low | **Task 8, Step 3a** (antecipado do PR 3) |
| `auth/callback/next-param-origin-concat` (needs_validation) | — | **Task 8, Step 3a** (mesmo helper) |
| `notifications/subscribe/unvalidated-push-endpoint-ssrf` | low | PR 3 (push) — allowlist de hosts de push |
| `ai/chat/unbounded-messages-no-per-user-quota` (needs_validation) | — | PR 3 (cota da IA, já planejada) |
| lead `rls/family_members/self-insert-arbitrary-family-and-role` | (high na fase 3) | coberto: S2, Task 4 |
| lead `rls/family_invites/select-using-true` | — | coberto: S1, Task 4 |
| lead `rls/family_members/self-update-role-unrestricted` | — | coberto: S3, Task 4 |
| lead `rpc/security-definer-membership-helpers/caller-supplied-uid` | — | **Task 4, Step 5a (S10)** |
| lead `storage/baby-avatars/no-server-side-type-size-enforcement` | — | coberto: bucket com `file_size_limit` 5 MB + mime types, versionado na Task 2 Step 4 |
| deferred: CSV formula injection no export de settings | — | PR 3 (verificar e neutralizar `= + - @` no export) |
