# Fase 1 · PR 3 — Correções da Aplicação: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os bugs de correção e os pontos de segurança restantes do Soninho: links de convite, cota da IA, push, alertas, relatórios no fuso certo, timer por bebê, validação e erros das APIs. Cada correção vem com teste.

**Architecture:**
- Lógica nova vai para helpers puros em `src/lib/**`, testados com Vitest.
- Regras de banco entram como migrations novas, testadas com pgTAP.
- As rotas ficam finas: validam a entrada com zod, chamam o helper e respondem com erro genérico.
- O store do timer passa a ser indexado por bebê, com migração do estado salvo no navegador.

**Tech Stack:** Next.js 16.4, React 19.3, Supabase (RLS, pgTAP), zod 4, zustand 5 (persist), Vitest, date-fns-tz.

**Spec:** `docs/superpowers/specs/2026-11-15-estabilizacao-design.md` §8.3 + seção "PR 3" de `docs/superpowers/plans/2026-11-15-fase1-backlog.md`.

## Global Constraints

- Branch `fase1/03-correcoes` (já existe, com `a88fc50`). Commits convencionais terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Mensagens ao usuário em PT-BR; código e comentários em inglês. Erros enviados ao cliente são genéricos; o detalhe vai só para `console.error`.
- Fuso padrão `America/Sao_Paulo`; o fuso do usuário vem de `notification_preferences.timezone`.
- Gates por task: `npm run lint` com 0 problemas, `npx tsc --noEmit`, `npm test` com saída limpa e, se a task tocar o banco, `npx supabase db reset && npx supabase test db`.
- Migrations:
  - nunca chamar como anon, dentro do pgTAP, uma função sem permissão (o PG 17.6.1.104 dá segfault); usar `has_function_privilege`;
  - função nova em `public` fica executável por `authenticated` por padrão; trigger e função interna precisam de `revoke … from public, anon, authenticated`;
  - em produção, só via `npx supabase db push --remote` após backup, e quem aplica é o controller na Task 12.
- Sem dados pessoais nos testes nem nas fixtures.
- Next 16: consultar `node_modules/next/dist/docs/` antes de mexer em rotas ou no proxy.

## Review Focus

1. **Convites antigos com `/` já enviados.** Os 13 tokens existentes continuam válidos. O link novo usa `encodeURIComponent`, e a rota decodifica uma única vez. Teste: `invite_link_roundtrip` (Task 1).
2. **Timer salvo no formato antigo (`soninho-timer`, versão 0) no navegador da família.** Depois do deploy, um sono em andamento continua aparecendo para o bebê certo. Teste: `migrates_v0_running_timer` (Task 7).
3. **Cota da IA no limite.** A 50ª chamada passa e a 51ª recebe 429 com mensagem em PT-BR. Chamadas concorrentes não furam a cota. Testes pgTAP: `ai_quota_atomic_limit` e `ai_quota_resets_next_day` (Task 3).
4. **Relatório de domingo à noite.** Um sono às 22:00 de São Paulo (01:00Z do dia seguinte) conta no dia local certo. Teste: `report_days_use_user_timezone` (Task 6).
5. **Alertas para outros cuidadores.** O caregiver com notificações ligadas também recebe, o viewer não recebe, e ninguém recebe duas vezes. Teste: `selects_owner_and_caregiver_only` e `dedupes_per_user` (Task 5).

---

## File Structure

```
src/lib/invites/inviteLink.ts (+ .test.ts)            # buildInviteLink, normalizeInviteToken
src/lib/ai/quota.ts (+ .test.ts)                       # AI_DAILY_LIMIT, consumeAiQuota wrapper
src/lib/ai/chatSchema.ts (+ .test.ts)                  # zod schema of the chat body
src/lib/notifications/webpush.ts                       # single lazy VAPID setup
src/lib/notifications/pushEndpoint.ts (+ .test.ts)     # isAllowedPushEndpoint
src/lib/notifications/selectAlerts.ts (+ .test.ts)     # pure alert selection for dispatch
src/lib/email/reportPeriod.ts (+ .test.ts)             # period/day keys in the user's timezone
src/lib/validation/common.ts (+ .test.ts)              # zUuid, zTimeZone, zLimit, zIsoRange
src/lib/http/errors.ts (+ .test.ts)                    # dbErrorToResponse, genericError
src/lib/export/csv.ts (+ .test.ts)                     # toCsvCell, toCsv
src/store/sleepStore.ts, feedingStore.ts (+ .test.ts)  # per-baby timers + persist migrate
supabase/migrations/20261116130000_invite_token_hex.sql
supabase/migrations/20261116130100_family_hardening.sql
supabase/migrations/20261116130200_ai_usage_quota.sql
supabase/tests/pr3.test.sql
```

---

### Task 1: Links de convite que funcionam

**Files:** Create `supabase/migrations/20261116130000_invite_token_hex.sql`, `src/lib/invites/inviteLink.ts`, `src/lib/invites/inviteLink.test.ts`. Modify `src/components/settings/FamilySettings.tsx:130`, `src/app/invite/[token]/page.tsx`, `src/app/api/family/accept/[token]/route.ts`.

**Interfaces — Produces:**
- `buildInviteLink(origin: string, token: string): string`, que retorna `${origin}/invite/${encodeURIComponent(token)}`.
- `normalizeInviteToken(raw: string): string`, que aplica `decodeURIComponent` exatamente uma vez se houver `%`, com `try/catch` (se a decodificação falhar, retorna o valor original).

- [ ] **Step 1: testes Vitest.**
  - `invite_link_roundtrip`: para tokens `"abc+/="`, `"a/b/c"`, `"plain123"` e um hex de 48 caracteres, extrair o segmento de `buildInviteLink("https://soninho.baby", t)` e aplicar `normalizeInviteToken` devolve `t`.
  - O link nunca contém `/` dentro do token.
  - `normalizeInviteToken("%E0%A4%A")` (encoding inválido) retorna a entrada sem lançar.
- [ ] **Step 2:** Antes de usar `normalizeInviteToken` em `params`, verificar nos docs do Next 16 se `params` de rota dinâmica chega já decodificado. Se chegar, documentar isso no código e garantir que não haja dupla decodificação (`%2B` não pode virar espaço).
- [ ] **Step 3: migration.** `alter table public.family_invites alter column token set default encode(extensions.gen_random_bytes(24), 'hex');`. Conferir o schema real de `gen_random_bytes` no ambiente local; se não estiver em `extensions`, usar `gen_random_bytes` sem qualificar. Os tokens existentes não mudam.
- [ ] **Step 4:** pgTAP em `supabase/tests/pr3.test.sql`: `invite_token_default_is_hex`. Inserir um convite como superuser e verificar `token ~ '^[0-9a-f]{48}$'`.
- [ ] **Step 5: página `invite/[token]`.** Ler `status` da resposta 404 do GET e mostrar uma mensagem por caso:
  - `accepted` → "Este convite já foi utilizado.";
  - `expired` → "Este convite expirou. Peça um novo link.";
  - `revoked` → "Este convite foi cancelado.";
  - `not_found` → "Convite não encontrado.".
- [ ] **Step 6: aceite já feito.** No POST, quando o usuário já é membro (a RPC retorna o `family_id` sem consumir o convite), seguir o fluxo de sucesso atual: redirecionar para `/app`.
- [ ] **Step 7:** Gates (incluindo o banco). Commit `fix: make invite links safe for any token and show specific invite states`.

### Task 2: Endurecimento da família no banco

**Files:** Create `supabase/migrations/20261116130100_family_hardening.sql`. Modify `supabase/tests/pr3.test.sql`.

- [ ] **Step 1: testes pgTAP primeiro.** Use as fixtures de `00_helpers.sql` e o padrão de `family_authorization.test.sql`:
  - `owner_cannot_unset_baby_family`: como owner, `update babies set family_id = null` lança erro.
  - `removed_creator_cannot_read_family`: o criador removido de `family_members` vê 0 linhas em `families`.
  - `member_self_update_only_profile_fields`: como caregiver, atualizar o próprio `display_name`/`family_relation` funciona (OK:1); atualizar o próprio `email` lança `forbidden_member_field`.
  - `owner_cannot_add_member_directly_without_invite`: como owner, `insert into family_members(...)` de um uid que não aceitou convite lança erro. Fecha o item estacionado no PR 1 (owner inserindo uid arbitrário); toda entrada de membro passa por `accept_family_invite` ou `create_baby_with_family`.
  - `sleep_end_before_start_rejected`: inserir uma `sleep_session` com `end_time < start_time` lança `23514`. Fazer o mesmo para `breastfeeding_sessions`.

  Rodar e confirmar que todos estão RED.
- [ ] **Step 2: migration.**
  - `guard_baby_change`: lançar erro quando `old.family_id is not null and new.family_id is null` e `auth.uid()` não for nulo. Manter o resto do corpo idêntico; partir do corpo atual em `20261116120000`.
  - Recriar a política "Members can read family" sem o fallback `created_by = auth.uid()`. Produção verificada pelo controller em 2026-11-16: 0 de 3 famílias têm criador que não é membro.
  - Novo trigger `guard_member_self_update` (security definer, `search_path=public`, EXECUTE revogado de `public, anon, authenticated`): quando o executor é o próprio membro e não é owner da família, só `display_name` e `family_relation` podem mudar; qualquer outra coluna lança `forbidden_member_field` (42501).
  - Remover a política "Owner can insert members". A inserção passa a ocorrer só via as funções `SECURITY DEFINER`, que ignoram RLS. Confirmar com `grep` em `src/` que nenhum código insere em `family_members` diretamente.
  - `check (end_time is null or end_time >= start_time)` em `sleep_sessions` e `breastfeeding_sessions` com `not valid`, seguido de `validate constraint` (produção: 0 violações).
- [ ] **Step 3:** Gates do banco 100% verdes, incluindo as suítes existentes. Commit `fix(db): close remaining family integrity gaps`.

### Task 3: Cota e limites da IA

**Files:** Create `supabase/migrations/20261116130200_ai_usage_quota.sql`, `src/lib/ai/quota.ts`, `src/lib/ai/chatSchema.ts` (+ testes). Modify `src/app/api/ai/chat/route.ts`, `src/app/api/ai/regression/route.ts`.

**Interfaces — Produces:**
- Tabela `public.ai_usage(user_id uuid references auth.users on delete cascade, day date, count int not null default 0, primary key(user_id, day))`, com RLS ligado e sem políticas para clientes.
- `public.consume_ai_quota(p_limit int) returns boolean` (security definer, `search_path=public`, executável só por `authenticated`). Usa `auth.uid()` e o dia em `America/Sao_Paulo`. Faz `insert … on conflict do update set count = ai_usage.count + 1 where ai_usage.count < p_limit returning count` e retorna `true` se o incremento aconteceu.
- `AI_DAILY_LIMIT = 50` em `src/lib/ai/quota.ts`.
- `consumeAiQuota(supabase): Promise<boolean>`.
- `chatRequestSchema`: zod com `messages` de 1 a 20 itens, cada um `{ role: "user" | "assistant", content: string 1..2000 }`, mais os campos que a rota já usa (ler a rota).

- [ ] **Step 1: pgTAP.**
  - `ai_quota_atomic_limit`: com `p_limit` 2, três chamadas retornam `true, true, false`.
  - `ai_quota_resets_next_day`: com uma linha de ontem em 2, a chamada de hoje retorna `true`.
  - `anon_cannot_execute_ai_quota`: verificar via `has_function_privilege`.
  - `clients_cannot_read_ai_usage`: como `authenticated`, `select count(*)` da tabela retorna 0.
- [ ] **Step 2: Vitest do schema.** 21 mensagens rejeitado; conteúdo com 2001 caracteres rejeitado; `role: "system"` rejeitado; caso válido aceito.
- [ ] **Step 3: rotas.**
  - `chat` e `regression` validam o corpo com o schema (400 genérico se falhar) e chamam `consumeAiQuota` depois de checar `getUser` e o papel.
  - Se a cota acabou: 429 com `{ error: "Limite diário de uso da IA atingido. Tente novamente amanhã." }`.
  - A rota `suggest` é determinística e não consome cota.
- [ ] **Step 4:** Gates (incluindo o banco). Commit `feat: add daily AI quota and request limits`.

### Task 4: Push confiável e seguro

**Files:** Create `src/lib/notifications/webpush.ts`, `src/lib/notifications/pushEndpoint.ts` (+ teste). Modify `src/lib/notifications/dispatch.ts`, `src/lib/notifications/familyActivity.ts`, `src/app/api/notifications/test/route.ts`, `src/app/api/notifications/subscribe/route.ts`, `src/app/api/family/sleep-activity/route.ts`, `src/app/api/family/feeding-activity/route.ts`, `public/` (ícone).

**Interfaces — Produces:**
- `getWebPush(): typeof import("web-push") | null`: configura VAPID na primeira chamada e retorna `null` (com um `console.warn`) se faltar alguma das 3 variáveis.
- `isAllowedPushEndpoint(url: string): boolean`: exige `https:`, porta padrão, e host `fcm.googleapis.com`, `updates.push.services.mozilla.com`, `web.push.apple.com`, ou terminando em `.notify.windows.com` ou `.push.apple.com`.
- `PUSH_ICON = "/brand/soninho-mark@2x.png"`, um asset que já existe.

- [ ] **Step 1: Vitest de `isAllowedPushEndpoint`.**
  - Aceita: `https://fcm.googleapis.com/fcm/send/x`, `https://updates.push.services.mozilla.com/wpush/v2/x`, `https://web.push.apple.com/x`, `https://wns2-bl2p.notify.windows.com/w/?token=x`.
  - Rejeita: `http://fcm.googleapis.com/x`, `https://fcm.googleapis.com.evil.com/x`, `https://evil.com/fcm.googleapis.com`, `https://169.254.169.254/`, `https://localhost/`, `https://fcm.googleapis.com:8443/x`, `not a url`.
- [ ] **Step 2:** `subscribe` rejeita endpoint fora da allowlist com 400 "Endpoint de notificação inválido".
- [ ] **Step 3:** Substituir os 3 `setVapidDetails` no carregamento do módulo por `getWebPush()`. Sem VAPID, as rotas de atividade continuam funcionando, só sem enviar push.
- [ ] **Step 4:** Em `familyActivity.ts`, tratar o erro de envio como o `dispatch.ts:207` já faz: `statusCode` 404 ou 410 marca a inscrição com `is_active=false`; outros erros só geram log.
- [ ] **Step 5:** Nas rotas `sleep-activity` e `feeding-activity`, ler o nome do bebê do banco (`babies.name`, pelo `babyId`, depois de checar o acesso) e ignorar o `babyName` enviado pelo cliente.
- [ ] **Step 6:** Trocar `/icons/icon-192.png` por `PUSH_ICON`.
- [ ] **Step 7:** Gates. Commit `fix: harden push delivery (endpoint allowlist, lazy VAPID, dead subscriptions, server-side baby name)`.

### Task 5: Alertas para todos os cuidadores

**Files:** Create `src/lib/notifications/selectAlerts.ts` (+ teste). Modify `src/lib/notifications/dispatch.ts`.

**Interfaces — Produces:** `selectAlerts(input: { now: Date; prefs: AlertPref[]; members: { family_id: string; user_id: string; role: "owner" | "caregiver" | "viewer" }[]; babies: { id: string; family_id: string; birth_date: string; name: string }[]; lastEnded: Record<string /*babyId*/, { sessionId: string; endTime: string } | undefined>; activeBabyIds: Set<string>; }): PlannedAlert[]`.
- `AlertPref = { user_id: string; enabled: boolean; alert_before_minutes: number | null; quiet_hours_start: string | null; quiet_hours_end: string | null; timezone: string | null }`.
- `PlannedAlert = { userId: string; babyId: string; sessionId: string; eventType: "NAP_SOON" | "OVERDUE"; dedupeKey: string; title: string; body: string; tag: string }`.
- `dedupeKey = ${babyId}:${sessionId}:${eventType}:${userId}`.
- Textos de `title`/`body` iguais aos atuais.

- [ ] **Step 1: Vitest com `now` fixo.**
  - `selects_owner_and_caregiver_only`: viewer com notificações ligadas não recebe.
  - `respects_quiet_hours_per_user_timezone`: considera o fuso de cada usuário, inclusive janela que cruza a meia-noite (22:00–07:00).
  - `skips_babies_with_active_sleep`.
  - `nap_soon_window`: dentro da janela de `alert_before_minutes` (padrão 15) antes do máximo da janela de vigília.
  - `overdue_after_max`.
  - `dedupes_per_user`: dois cuidadores geram duas chaves distintas, e o mesmo usuário gera só um alerta.
- [ ] **Step 2: `dispatch.ts`.**
  - Fazer poucas consultas em lote: prefs ligadas, membros dessas famílias, bebês, última sessão concluída por bebê, sessões abertas.
  - Chamar `selectAlerts`.
  - Para cada alerta, fazer `insert into notification_events … on conflict (dedupe_key) do nothing returning id` e só enviar o push se inseriu.
  - Usar `getWebPush()` da Task 4 e manter a desativação em 404/410.
- [ ] **Step 3:** Gates. Commit `feat: send nap alerts to every owner and caregiver with batched queries`.

### Task 6: Relatórios no fuso do usuário

**Files:** Create `src/lib/email/reportPeriod.ts` (+ teste). Modify `src/lib/email/sleepReport.ts`, `src/lib/email/weekly.ts`, `src/app/api/email/report/route.ts`.

**Interfaces — Produces:**
- `getReportPeriod(now: Date, days: number, timeZone: string): { startUtc: Date; endUtc: Date; startKey: string; endKey: string; label: string }`. As chaves são `yyyy-MM-dd` no fuso. O `label` é `de dd/MM a dd/MM (últimos N dias)`, com as datas locais.
- `groupSessionsByLocalDay(sessions, timeZone): Map<string, …>`, ou equivalente reaproveitando `allocateSessionToLocalDays` com o fuso explícito. Se a função atual depender do fuso do processo, criar a variante com `timeZone` e manter a antiga como wrapper.

- [ ] **Step 1: Vitest.**
  - `report_days_use_user_timezone`: sono de 2026-05-24T01:00Z a 2026-05-24T03:00Z, com `timeZone` SP, cai no dia `2026-05-23`.
  - `period_keys_local`: `now = 2026-05-25T02:00Z` (23:00 do dia 24 em SP) com 7 dias dá `endKey = "2026-05-24"`.
  - Rodar também com `process.env.TZ` = UTC dentro do teste (`vi.stubEnv` não altera o fuso do Date; usar a função com `timeZone` explícito e afirmar que o resultado não depende do TZ do processo).
- [ ] **Step 2:** Usar essas funções em `sleepReport.ts`/`weekly.ts`. O fuso vem de `notification_preferences.timezone`, com padrão SP.
- [ ] **Step 3:** O relatório sob demanda deduplica pela constraint única: inserir em `email_log` com `on conflict (dedupe_key) do nothing` antes de enviar; se não inseriu, retornar 429 com a mensagem atual.
- [ ] **Step 4:** Gates. Commit `fix: compute email report days in the user's timezone`.

### Task 7: Timer por bebê e sincronização robusta

**Files:** Modify `src/store/sleepStore.ts`, `src/store/feedingStore.ts`, `src/hooks/useSleepTimer.ts`, `src/hooks/useBreastfeedingTimer.ts`, e os consumidores dos stores. Create `src/store/sleepStore.test.ts`, `src/store/feedingStore.test.ts`.

**Interfaces — Produces:**
- `sleepStore` com `timers: Record<string /*babyId*/, { sessionId: string; startTime: string; sleepType: "NAP" | "NIGHT_SLEEP"; notes…drafts }>`.
- Seletores `useActiveSleepTimer(babyId)` e ações `startTimer(babyId, …)`, `stopTimer(babyId)` e `restoreFromSession(babyId, …)`.
- Mesma ideia no `feedingStore`.
- `persist`: `version: 1` com `migrate(persisted, version)`. Na versão 0, se havia `isRunning && sessionId && activeBabyId`, gerar `timers[activeBabyId]`; sem `activeBabyId`, descartar (a sincronização com o banco restaura).

- [ ] **Step 1: Vitest dos stores.**
  - `migrates_v0_running_timer`: o estado v0 com sessão do bebê B1 vira `timers.B1`.
  - `migrates_v0_without_baby_drops_timer`.
  - `timers_are_independent_per_baby`: parar B2 não afeta B1.
  - `sync_resets_drafts`: `restoreFromSession` limpa os rascunhos locais.
- [ ] **Step 2: hooks.**
  - O poll só considera "parado por outro cuidador" quando recebe uma resposta **sem erro** e sem linha para aquele `sessionId`, ou com `end_time` preenchido. Erro de rede mantém o timer.
  - Em 23505 seguido de sessão ativa nula: tentar o início **uma** vez mais; se falhar de novo, mostrar o toast genérico atual.
  - `restoreBreastSession` passa a definir o bebê.
  - Ao sincronizar com a sessão de outro cuidador, limpar os rascunhos locais.
- [ ] **Step 3:** Teste manual com o Supabase local:
  - duas abas, sono iniciado na aba A, bebê trocado na aba B: o timer de A continua;
  - com um estado v0 colado no `localStorage`, o app abre mostrando o timer do bebê certo.
- [ ] **Step 4:** Gates. Commit `fix: per-baby timers with persisted state migration and safer sync`.

### Task 8: Validação e erros das APIs

**Files:** Create `src/lib/validation/common.ts`, `src/lib/http/errors.ts` (+ testes). Modify `src/app/api/family/notes/route.ts`, `src/app/api/profile/route.ts`, `src/app/api/family/activity/route.ts`, `src/app/api/sleep/route.ts`, `src/app/api/sleep/[id]/route.ts`, `src/app/api/ai/suggest/route.ts`, `src/app/api/feeding/suggest/route.ts`, e os demais arquivos da lista do grep de `error.message` em `src/app/api`.

**Interfaces — Produces:**
- `zUuid`, `zTimeZone` (aceita só fusos que `Intl.supportedValuesOf("timeZone")` reconhece, ou que `new Intl.DateTimeFormat("en", { timeZone })` não rejeita; padrão `"America/Sao_Paulo"`) e `zLimit(max: number, def: number)` (inteiro de 1 a `max`, com `def` quando ausente ou NaN).
- `zIsoRange`: objeto `{ start_time, end_time? }` com `end_time >= start_time` (mensagem "O fim não pode ser antes do início").
- `genericError(status = 500): NextResponse`, com o corpo `{ error: "Ocorreu um erro. Tente novamente." }`.
- `dbErrorToResponse(error: { code?: string; message?: string }): NextResponse`:
  - `23505` → 409 "Registro duplicado";
  - `42501` → 403 "Sem permissão";
  - `P0001` + `family_needs_owner` → 409 "A família precisa de pelo menos um responsável";
  - `P0001` + `invite_not_valid` → 410 "Convite inválido ou expirado";
  - qualquer outro → `genericError()`.
  - Sempre faz `console.error` do erro original.

- [ ] **Step 1: Vitest.** `zTimeZone` aceita `"America/Sao_Paulo"` e `"UTC"` e rejeita `"Mars/Base"`; `zLimit(100, 20)` com `"abc"` → 20, `"500"` → 100 (limita ao máximo), `"5"` → 5; `zIsoRange` rejeita fim antes do início; `dbErrorToResponse` cobre cada código, o caso padrão e confirma que a mensagem crua nunca aparece no corpo.
- [ ] **Step 2:** Aplicar nas rotas listadas. Nenhuma rota pode devolver `error.message` ao cliente: depois da mudança, `grep -rn "error.message" src/app/api` só pode aparecer dentro de `console.error`. Trocar os `as` por zod nos corpos e queries. Padronizar as mensagens restantes em PT-BR.
- [ ] **Step 3:** Gates. Commit `fix: validate API input with zod and stop leaking database errors`.

### Task 9: Semântica das rotas de família

**Files:** Modify `src/app/api/family/members/route.ts`, `src/app/api/family/invite/route.ts`, `src/lib/supabase/queries.ts` (`createBaby`, revogação), `src/types/index.ts` (`Baby.avatar_emoji`), `src/components/settings/FamilySettings.tsx`.

- [ ] **Step 1:** As mutações que não afetam nenhuma linha retornam 404 "Não encontrado": PATCH e DELETE de membro (por `targetUserId` da família) e DELETE de convite (por `inviteId` da família). Usar `.select("id")` e checar o tamanho.
- [ ] **Step 2:** DELETE de membro que é o último owner → 409, com checagem no app antes do banco (defesa em profundidade), e mapear `family_needs_owner` via `dbErrorToResponse` (Task 8). O `FamilySettings` mostra o erro em toast em vez de ignorar.
- [ ] **Step 3:** POST de convite valida `role` com `z.enum(["caregiver","viewer"])` e `family_relation` opcional com tamanho máximo de 40.
- [ ] **Step 4:** `createBaby` perde o parâmetro `user_id`; atualizar o único chamador.
- [ ] **Step 5:** `Baby.avatar_emoji` volta a ser `string | null` (sem override) e os pontos de exibição usam `?? "🍼"` (achar com `grep -rn "avatar_emoji" src`).
- [ ] **Step 6:** Gates. Commit `fix: precise family route semantics and typed baby avatar`.

### Task 10: Segurança diversa (proxy, export CSV)

**Files:** Create `src/lib/export/csv.ts` (+ teste). Modify `src/proxy.ts`, `src/lib/supabase/server.ts`, `src/app/(dashboard)/settings/page.tsx` (export).

**Interfaces — Produces:** `toCsvCell(v: unknown): string` e `toCsv(rows: unknown[][]): string`. O valor vira string; se começar com `=`, `+`, `-`, `@`, `\t` ou `\r`, recebe o prefixo `'`. Aspas viram `""` e a célula vai entre aspas quando contém `,`, `"`, `\n` ou `;`.

- [ ] **Step 1: Vitest de `toCsvCell`.**
  - `"=1+1"` → `"'=1+1"`;
  - `'-2'` → `"'-2"`;
  - `'a,b'` → `'"a,b"'`;
  - `'diz "oi"'` → `'"diz ""oi"""'`;
  - `null` → `""`;
  - `42` → `"42"`.

  Ler o export atual para manter colunas e separador (se for `;`, `toCsv` usa `;`).
- [ ] **Step 2:** O export de `settings/page.tsx` passa a usar `toCsv`. O conteúdo para valores comuns fica igual.
- [ ] **Step 3: `proxy.ts` e `server.ts`.**
  - O `setAll(cookiesToSet, headers)` aplica os `headers` recebidos à resposta (consultar `node_modules/@supabase/ssr` para a semântica exata).
  - A rota pública `/auth` passa a ser `pathname === "/auth" || pathname.startsWith("/auth/")`.
  - O redirect para o login preserva a query: `redirect` = `pathname + search`. O `safeRedirectPath` continua validando no destino.
- [ ] **Step 4:** Gates mais `curl` local: `/app?x=1` sem sessão → `/login?redirect=%2Fapp%3Fx%3D1`; `/authors` → redireciona para o login.
- [ ] **Step 5:** Commit `fix: csv formula injection, auth path matching, cache headers and redirect query`.

### Task 11: Documentação

**Files:** Modify `README.md`, `README.en.md`, `docs/superpowers/plans/2026-11-15-fase1-backlog.md`.

- [ ] **Step 1:** README PT e EN, mantidos em sincronia:
  - seção da IA com a cota diária de 50 por usuário e os limites do chat;
  - alertas de soneca enviados a owners e caregivers;
  - convites com token hex;
  - remover a nota "dispatch não agendado", substituída pelo `pg_cron` desde o PR 1, se ainda existir.
- [ ] **Step 2:** Backlog: marcar a seção PR 3 como concluída e listar o que ficou de fora com o motivo.
- [ ] **Step 3:** Commit `docs: document AI quota, alerts and invites`.

### Task 12: Publicar (controller)

- [ ] **Step 1:** Push e `gh pr create` (título `Fase 1 · PR 3 — Correções da aplicação`, corpo com o que mudou e como foi testado, rodapé `🤖 Generated with [Claude Code](https://claude.com/claude-code)`). Aguardar o CI e o preview verdes.
- [ ] **Step 2:** Backup em `~/soninho-backups/2026-11-16-pr3/`. Rodar `npx supabase db push --remote --dry-run` (deve listar só as 3 migrations `20261116130*`), depois `npx supabase db push --remote`, e fazer o merge logo em seguida.
- [ ] **Step 3: smoke em produção.**
  - `/` retorna 200, `/app` retorna 307 e o cron segue em 200;
  - `get_advisors` não mostra nada novo;
  - as contagens de dados batem com o backup;
  - um convite novo no banco tem token hex.
