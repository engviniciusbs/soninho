# Fase 1 · PR 2 — Base de Qualidade: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao Soninho testes unitários (Vitest), CI no GitHub Actions, dependências atualizadas e limpas (sem críticas/altas no audit), lint zerado e os arquivos de projeto que um repositório open source precisa — sem mudar o comportamento do app.

**Architecture:** Vitest roda as funções puras de `src/lib/**` com `TZ=America/Sao_Paulo` fixo; o CI repete o gate local (lint → tsc → vitest → build com env fictícia → `supabase start` + `supabase test db`). Dependências sobem em commits isolados (uma major por commit) para que um revisor consiga rejeitar cada uma separadamente. Uma única migration pequena endurece os guard triggers (backlog do PR 1).

**Tech Stack:** Next.js 16.4, React 19, TypeScript 5, Vitest 3/4 (+ `vite-tsconfig-paths`), GitHub Actions, Supabase CLI 3.1.0, pgTAP.

**Spec:** `docs/superpowers/specs/2026-11-15-estabilizacao-design.md` (seção 8.2, 8.0) + itens "PR 2" de `docs/superpowers/plans/2026-11-15-fase1-backlog.md`.

## Global Constraints

- Branch: `fase1/02-qualidade` (já existe, com o commit do backlog `cff9750`). Commits convencionais terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Sem mudança de comportamento do app** (spec §3 não-objetivos): só testes, tooling, deps, lint e a migration da Task 8.
- Testes não acessam rede nem produção. Banco de teste = Supabase local (`npx supabase start`).
- Datas nos testes sempre com instantes ISO explícitos (`2026-05-23T21:30:00Z`), nunca `new Date()` implícito; `now` injetado quando a função aceita.
- Uma major por commit, com lint/tsc/test/build verdes; se uma major exigir reescrita desproporcional (> ~1h de mudanças fora de imports/tipos), não fazer e registrar no PR (spec §8.2).
- Meta `npm audit --omit=dev`: 0 críticas e 0 altas.
- `next` passa a versão exata (sem `^`), alinhada com `eslint-config-next`.
- DDL em produção só via `npx supabase db push --linked` após backup (spec §8.0); executado pelo controller na Task 9.
- Next 16: consultar `node_modules/next/dist/docs/` ao mexer em config/build.

## Review Focus

1. **CI roda em UTC**: testes de dia/horário não podem depender do fuso da máquina → `vitest.config.ts` fixa `process.env.TZ = "America/Sao_Paulo"` e um teste sentinela verifica `new Date("2026-05-23T03:00:00Z").getHours() === 0` (Task 1).
2. **Sono que cruza meia-noite e horário de verão histórico** (BR teve DST até 2019): `allocateSessionToLocalDays` deve dividir corretamente uma sessão de 2018-11-03 22:00 → 2018-11-04 06:00 (local), dia em que o relógio pulou 00:00→01:00 — teste `dst_spring_forward_split` (Task 2).
3. **Estilos do shadcn somem após mover `shadcn` para devDependencies**: build tem que continuar emitindo o CSS — verificação por grep de uma classe utilitária do `shadcn/tailwind.css` no CSS gerado em `.next/static/css` (Task 4).
4. **Upgrade de major quebrando em runtime sem quebrar o tsc** (streaming da OpenAI no chat, envio do web-push, animações do framer-motion, calendário do react-day-picker): cada commit de major inclui um smoke específico descrito na Task 6.
5. **CI em PR de fork / sem segredos**: o workflow não pode depender de secrets — build com env fictícia, Supabase local (Task 7).

---

## File Structure

```
vitest.config.ts                      # novo — env TZ, alias @/, include src/**/*.test.ts
src/test/setup.ts                     # novo — sentinela de TZ (se necessário)
src/lib/safeRedirect.test.ts          # novo
src/lib/supabase/sessionConflict.test.ts
src/lib/sleep/*.test.ts               # um arquivo por módulo testado
src/lib/feeding/*.test.ts
.github/workflows/ci.yml              # novo
.env.example                          # novo (+ exceção no .gitignore)
LICENSE                               # novo (MIT)
supabase/migrations/2026111612xxxx_guard_triggers_hardening.sql
supabase/tests/family_authorization.test.sql, integrity.test.sql   # ajustes
docs/CONTRIBUTING-DB.md               # convenções de migration (curto)
package.json / package-lock.json
```

---

### Task 1: Vitest + testes dos helpers do PR 1

**Files:** Create `vitest.config.ts`, `src/lib/safeRedirect.test.ts`, `src/lib/supabase/sessionConflict.test.ts`; Modify `package.json` (scripts `test`, `test:watch`, `test:db`; devDeps `vitest`, `vite-tsconfig-paths`).

**Interfaces — Produces:** `npm test` (= `vitest run`), `npm run test:db` (= `supabase test db`). Padrão: testes ao lado do arquivo, `*.test.ts`.

- [ ] **Step 1:** `npm i -D vitest vite-tsconfig-paths` (versões atuais estáveis). `vitest.config.ts`: `plugins: [tsconfigPaths()]`, `test: { environment: "node", include: ["src/**/*.test.ts"], env: { TZ: "America/Sao_Paulo" } }`. Se `env.TZ` não surtir efeito no worker, usar `process.env.TZ = "America/Sao_Paulo"` no topo do config + `pool: "forks"`.
- [ ] **Step 2:** `src/lib/safeRedirect.test.ts` com `it.each`:
  - `fallback` (`"/app"`) para: `"/\t/evil.com"`, `"/\t\\evil.com"`, `"//evil.com"`, `"/\\evil.com"`, `"/\r\n//evil.com"`, `"https://evil.com"`, `"@evil.com"`, `""`, `null`, `undefined`, `"/.//evil.com"`, `"/..//evil.com"`, `"/a/../..//evil.com"`, `"/%2e%2e//evil.com"`.
  - inalterado: `"/app"`, `"/history?x=1"`, `"/invite/abc#top"`, `"/%2F%2Fevil.com"`.
  - `"/a/./b"` → `"/a/b"`; fallback customizado: `safeRedirectPath("//x", "/login") === "/login"`.
  - propriedade: para todo retorno `r`, `new URL(r, "https://soninho.baby").origin === "https://soninho.baby"` (aplicar a todos os casos acima).
- [ ] **Step 3:** `sessionConflict.test.ts`: `isUniqueViolation({code:"23505"})` true; `{code:"23503"}`, `{}`, `null` false.
- [ ] **Step 4:** Sentinela de TZ (Review Focus 1) em `src/lib/safeRedirect.test.ts` ou arquivo próprio `src/test/tz.test.ts`: `expect(new Date("2026-05-23T03:00:00Z").getHours()).toBe(0)`.
- [ ] **Step 5:** `npm test` → todos verdes; rodar também `TZ=UTC npm test` → continua verde (prova que o config fixa o fuso). Commit `test: add vitest with tests for safe redirect and session conflict`.

### Task 2: Testes da lógica de sono

**Files:** Create `src/lib/sleep/{wakeWindows,schedules,sessionDayAllocation,statistics,inferNextSleepKind,computeNapSuggestion,regression}.test.ts`.

**Interfaces — Consumes:** funções exportadas atuais (sem alterar assinaturas). Fábrica de sessão local ao teste: `makeSession(partial: Partial<SleepSession>): SleepSession` em `src/lib/sleep/__fixtures__/session.ts` (com defaults: `id`, `baby_id`, `type: "NAP"`, campos nulos, `duration_min` calculado de start/end como o trigger do banco).

- [ ] **Step 1:** `wakeWindows.test.ts` — tabela (de `src/lib/sleep/wakeWindows.ts`): `getWakeWindowRange(4)` → `{minMinutes:45,maxMinutes:60}`; `(7)` → 60–75; `(10)` → 75–90; `(14)` → 90–120; `(18)` → 105–135; `(22)` → 120–150; `(26)` → 150–180; `(30)` → 165–210; `(40)` → 180–240; `(80)` → default 180–240. Limites: `(6)` cai em 0–6 sem, `(52)` em 9–12 meses. `getWakeWindowStatus` e `getMinutesUntilNextNap`: verde/amarelo/vermelho nos três intervalos conforme a implementação (ler a função e cobrir cada ramo + limites exatos).
- [ ] **Step 2:** `schedules.test.ts` — `getAgeSchedule(4)` = `{ageLabel:"0–6 semanas", totalSleepHours:16, napCount:"4–6", nightSleepHours:8}`; um caso por faixa da tabela e o default.
- [ ] **Step 3:** `sessionDayAllocation.test.ts`:
  - `splits_night_across_midnight`: NIGHT 2026-05-23 18:30 → 2026-05-24 06:09 (local, i.e. `21:30Z`→`09:09Z`) → dois itens: 23/05 = 330 min, 24/05 = 369 min.
  - `nap_single_day`: soneca 10:00–11:30 local → um item de 90 min, marcado como nap.
  - `open_session_ignored`: `end_time=null` → `[]`; `end<=start` → `[]`.
  - `dst_spring_forward_split` (Review Focus 2): 2018-11-03 22:00 local (`2018-11-04T00:00:00Z`) → 2018-11-04 06:00 local (`2018-11-04T08:00:00Z`): soma dos minutos alocados = 480 e há dois dias (03/11 e 04/11). Se a implementação falhar, **não corrigir aqui** (sem mudança de comportamento): marcar `it.fails` com comentário e reportar como DONE_WITH_CONCERNS → vira item do PR 3.
  - `buildDailySleepTotals` com duas sessões em dias distintos → totais por dia somam corretamente.
- [ ] **Step 4:** `statistics.test.ts` — `getDailyTotals`, `getNapCountPerDay`, `getLongestNightStretch`, `getOverallStats`, `getLast24hStats` (com `now` controlado via `vi.setSystemTime("2026-05-24T12:00:00Z")`), `getNapPatternHeatmap` (hora local correta). Um teste por função com dados mínimos que tornem o valor esperado óbvio à mão.
- [ ] **Step 5:** `inferNextSleepKind.test.ts` + `computeNapSuggestion.test.ts` — com `now` injetado e `timezone:"America/Sao_Paulo"`:
  - bebê de 10 semanas, último sono terminou 09:00 local, agora 09:30 → sugestão `NAP` com janela começando 75 min após 09:00 (10:15) e terminando 90 min após (10:30);
  - sem `lastSleepEndIso` → ramo de "sem histórico" (verificar o retorno atual e fixá-lo);
  - noite: agora 19:30 local com ≥3 noites no histórico começando ~19:00 → `NIGHT_SLEEP`;
  - mediana de início noturno exige ≥3 noites (com 2 → não usa histórico).
- [ ] **Step 6:** `regression.test.ts` — `computeSleepDebt` ignora dias sem dados (2 dias com dados + 5 vazios → média só dos 2) e compara com `getAgeSchedule`; `detectRegression` nas janelas conhecidas (um caso dentro, um fora).
- [ ] **Step 7:** `npm test` verde (e `TZ=UTC npm test`). Commit `test: cover sleep domain logic`.

### Task 3: Testes de alimentação e ambiente

**Files:** Create `src/lib/feeding/{computeFeedingSuggestion,feedingIntervals,feedingStatistics}.test.ts`, `src/lib/sleep/{clothingRecommendation,environmentCorrelation}.test.ts`.

- [ ] **Step 1:** `feedingIntervals.test.ts` — `getDefaultFeedingIntervalMinutes`: 2→150, 4→150, 5→180, 12→180, 20→210, 26→210, 40→240, 52→240, 60→270.
- [ ] **Step 2:** `computeFeedingSuggestion.test.ts` (`now` injetado, tz SP): sem histórico → ramo vazio atual (`suggestedTime:""`, `minutesUntilSuggested:0`, fixar o resto do objeto atual); com 4 mamadas a cada 3h → próxima = última + 180 min; com 1 mamada → usa fallback por idade; mamada atrasada → minutos negativos ou status atual (fixar o comportamento existente).
- [ ] **Step 3:** `feedingStatistics.test.ts` — médias diárias e `hasFeedingData` true/false.
- [ ] **Step 4:** `clothingRecommendation.test.ts` — `suggestSleepSackType`/`suggestSleepSackTOG` nos limiares de temperatura da implementação (um valor de cada lado de cada limiar); `getClothingRecommendation` para 16 °C, 22 °C e 28 °C (fixar retorno atual).
- [ ] **Step 5:** `environmentCorrelation.test.ts` — só sessões concluídas entram; buckets de temperatura agrupam e calculam média de qualidade/duração.
- [ ] **Step 6:** `npm test` verde. Commit `test: cover feeding and environment logic`.

### Task 4: Limpeza de dependências e lint zerado

**Files:** Modify `package.json`, `package-lock.json`, `src/components/sleep/SleepTimer.tsx`, `src/app/(auth)/login/page.tsx`, `src/app/(dashboard)/ai-insights/page.tsx`, `src/hooks/useWakeWindow.ts`, + arquivos apontados pelo novo lint; Delete `public/{file,globe,next,vercel,window}.svg`.

- [ ] **Step 1:** `npm uninstall next-intl @tanstack/react-query-devtools` (0 imports — confirmar com `grep -rn "next-intl\|react-query-devtools" src` vazio antes).
- [ ] **Step 2:** Mover `@types/web-push` e `shadcn` para devDependencies (`npm i -D …`, remover de dependencies). Build com env fictícia (lista da Task 7) e verificar Review Focus 3: `grep -l "data-slot\|animate-in\|\.animate-" .next/static/css/*.css` (ou outra classe/variável definida em `node_modules/shadcn/dist/tailwind.css` — escolher uma que exista lá) encontra o CSS. Se sumir, manter `shadcn` em dependencies e registrar.
- [ ] **Step 3:** Remover os 5 SVGs do template após `grep -rn "file.svg\|globe.svg\|next.svg\|vercel.svg\|window.svg" src public` vazio.
- [ ] **Step 4:** `npm i -E next@16.4.6 eslint-config-next@16.4.6` (versões exatas, alinhadas). Rodar `npm run lint`: corrigir **todos** os erros e warnings, incluindo `SleepTimer.tsx:160` (`Date.now()` no render → mover para estado/efeito ou `useMemo` com relógio do hook) e os novos de `react-hooks` 7.x. Proibido `eslint-disable` sem comentário justificando por que a regra não se aplica. Sem mudança de comportamento: se um fix de `set-state-in-effect` exigir redesenhar um hook de timer, isolar o mínimo e anotar o hook para a refatoração do PR 4.
- [ ] **Step 5:** `npm run lint` → 0 problemas; `npx tsc --noEmit`; `npm test`; build. Commit(s): `chore(deps): remove unused deps and move dev-only packages`, `chore: remove template assets`, `chore(lint): upgrade eslint-config-next and fix all lint issues`.

### Task 5: Atualizações dentro da major

**Files:** Modify `package.json`, `package-lock.json`.

- [ ] **Step 1:** Atualizar para o "Wanted" do `npm outdated` (mesma major): `@base-ui/react`, `@react-email/render`, `@react-pdf/renderer`, `@supabase/supabase-js`, `@tailwindcss/postcss`, `tailwindcss`, `@tanstack/react-query`, `@types/react`, `@types/react-dom`, `date-fns`, `eslint` (9.x), `lucide-react`, `react-hook-form`, `recharts`, `resend`, `shadcn`, `sonner`, `tailwind-merge`, `zustand`, `openai` (6.x), `react`/`react-dom` 19.3.x (versões exatas iguais entre si).
- [ ] **Step 2:** lint/tsc/test/build verdes; `npm audit --omit=dev` → anotar contagem. Commit `chore(deps): update dependencies within major versions`.

### Task 6: Atualizações de major (uma por commit)

**Files:** Modify `package.json`, `package-lock.json` e o código mínimo que cada major exigir.

Para cada item, na ordem: ler o changelog/guia de migração do pacote, atualizar, corrigir o necessário, rodar lint/tsc/test/build e o smoke indicado (Review Focus 4), commitar `chore(deps): upgrade <pkg> to <major>`.

- [ ] **Step 1: `openai` 7** — smoke: `src/app/api/ai/chat/route.ts` continua fazendo streaming (tipos do iterador de chunks), `regression/route.ts` compila e usa o mesmo modelo `gpt-4o-mini`. Teste unitário pequeno com mock do client não é necessário; verificar por tsc + leitura do guia de migração.
- [ ] **Step 2: `web-push` 4** — smoke: `setVapidDetails` + `sendNotification` com a mesma assinatura usada em `src/lib/notifications/*.ts` e `api/notifications/test`; `@types/web-push` compatível (ou removido se o pacote passar a ter tipos próprios).
- [ ] **Step 3: `@hookform/resolvers` 7** — smoke: os formulários com `zodResolver` (zod 4) tipam e validam (tsc + abrir `npm run dev` e submeter o formulário de login com e-mail inválido mostra o erro).
- [ ] **Step 4: `react-day-picker` 10** — smoke: `src/components/ui/calendar.tsx` compila; a página que usa o calendário renderiza (dev server, sem erro no console).
- [ ] **Step 5: `framer-motion` 14** — smoke: imports (`motion`, `AnimatePresence`) dos 25 arquivos compilam; se o pacote foi renomeado para `motion`, seguir o guia oficial.
- [ ] **Step 6: `@supabase/ssr` 0.12** (0.x minor = breaking) — smoke: `createServerClient`/`createBrowserClient` e o adaptador de cookies `getAll/setAll` em `src/proxy.ts`, `src/lib/supabase/server.ts`, `client.ts`; login local contra `supabase start` funciona.
- [ ] **Step 7: `eslint` 10** — só se `eslint-config-next@16.4.6` declarar compatibilidade (peer); senão pular e registrar.
- [ ] **Step 8: `@types/node`** — alinhar à major do Node do projeto: ler `vercel.json`/settings não têm; usar a major do `engines` se existir, senão 22 (LTS usada pela Vercel por padrão) e adicionar `"engines": {"node": ">=20.9"}` ao package.json.
- [ ] **Step 9: `typescript` 7** — tentar; se `next build`, `eslint` (typescript-eslint) ou `vitest` quebrarem por incompatibilidade de tooling, reverter para 5.9 e registrar o motivo no PR.
- [ ] **Step 10:** `npm audit --omit=dev` → 0 críticas/0 altas. Se restar alguma sem fix disponível, listar no PR com o pacote de origem.

### Task 7: CI e arquivos de projeto

**Files:** Create `.github/workflows/ci.yml`, `.env.example`, `LICENSE`, `docs/CONTRIBUTING-DB.md`; Modify `.gitignore`, `README.md`, `README.en.md`.

- [ ] **Step 1:** `ci.yml` — `on: [push (branches: main), pull_request]`, `concurrency` por ref, job `checks` em `ubuntu-latest`, Node 22, cache npm: `npm ci` → `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build` com env fictícia no `env:` do step:
  `NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=ci SUPABASE_SERVICE_ROLE_KEY=ci OPENAI_API_KEY=ci RESEND_API_KEY=ci CRON_SECRET=ci VAPID_CONTACT_EMAIL=mailto:ci@example.com NEXT_PUBLIC_VAPID_PUBLIC_KEY=<par VAPID público fixo, gerado uma vez e commitado só para CI> VAPID_PRIVATE_KEY=<par privado correspondente>` — o par VAPID de CI é descartável e **não** é o de produção (comentário no YAML dizendo isso).
  Job `db`: `supabase/setup-cli@v1` (version `3.1.0`), `supabase db start` (ou `supabase start -x` excluindo serviços não usados para acelerar), `supabase test db`. Sem secrets em nenhum job (Review Focus 5).
- [ ] **Step 2:** `.env.example` com todas as variáveis da tabela do README, valores placeholder e comentário por variável; `.gitignore`: adicionar `!.env.example` depois de `.env*`.
- [ ] **Step 3:** `LICENSE` MIT, `Copyright (c) 2026 engviniciusbs`.
- [ ] **Step 4:** `docs/CONTRIBUTING-DB.md` (≤ 40 linhas): como criar migration (`npx supabase migration new`), rodar `db reset`/`test db`, regra "toda função nova: `security definer` só com `search_path` fixo; grants explícitos — o default global revoga EXECUTE de PUBLIC; funções fora de `public` precisam de `grant execute … to authenticated`"; "não chamar funções sem permissão como anon dentro do pgTAP (segfault do PG 17.6.1.104) — usar `has_function_privilege`"; "produção só via `db push` após backup".
- [ ] **Step 5:** README PT/EN: badge do CI no topo (`https://github.com/engviniciusbs/soninho/actions/workflows/ci.yml/badge.svg`), seção Testes atualizada (`npm test`, `npm run test:db`), referência ao `.env.example` no setup, link para `docs/CONTRIBUTING-DB.md`, licença MIT.
- [ ] **Step 6:** Validar o YAML localmente (`npx --yes @action-validator/cli .github/workflows/ci.yml` ou `actionlint` se disponível; senão revisão manual). Commit `ci: add GitHub Actions workflow` e `docs: add env example, license and db contribution guide`.

### Task 8: Endurecimento dos guard triggers

**Files:** Create `supabase/migrations/20261116120000_guard_triggers_hardening.sql`; Modify `supabase/tests/family_authorization.test.sql`, `supabase/tests/integrity.test.sql`.

- [ ] **Step 1 (testes primeiro):** em `family_authorization.test.sql` adicionar `guard_fns_not_executable_by_clients`: `has_function_privilege('authenticated','public.guard_family_member_change()','EXECUTE')` = false e o mesmo para `public.guard_baby_change()` e para `anon`. Em `integrity.test.sql:57`, trocar a contagem genérica por checagem dos nomes `notification_events_dedupe_key_key` e `email_log_dedupe_key_key`. Rodar `npx supabase test db` → o novo teste falha (RED).
- [ ] **Step 2:** Migration: `create or replace` das duas funções de guard trocando `for update` por `for no key update` no lock da linha de `families` (comportamento idêntico, sem bloquear inserts com FK); `revoke execute on function public.guard_family_member_change(), public.guard_baby_change() from public, anon, authenticated;` (triggers continuam disparando — privilégio de EXECUTE não é checado no disparo). Comentário curto explicando ambos.
- [ ] **Step 3:** `npx supabase db reset && npx supabase test db` → 100% verde (inclui o teste de corrida/último owner existente). Commit `fix(db): harden guard triggers locking and execute grants`.

### Task 9: Publicar (controller)

- [ ] **Step 1:** Push da branch, `gh pr create` (título `Fase 1 · PR 2 — Base de qualidade`, corpo: o que entrou, tabela de deps antes/depois, audit antes/depois, majors puladas e por quê, como foi testado, rodapé `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
- [ ] **Step 2:** Aguardar CI verde **e** preview da Vercel verde. Se o CI falhar, corrigir na branch antes de qualquer coisa.
- [ ] **Step 3:** Backup (`~/soninho-backups/2026-11-16/`), `npx supabase db push --linked --dry-run` (deve listar só `20261116120000…`), `db push`, merge squash, aguardar deploy de produção READY.
- [ ] **Step 4:** Smoke em produção: `/` 200, `/app` 307→login, `/api/email/weekly` 401; `cron.job_run_details`/`net._http_response` seguem 200; `get_advisors(security)` sem os alertas dos guard triggers.
