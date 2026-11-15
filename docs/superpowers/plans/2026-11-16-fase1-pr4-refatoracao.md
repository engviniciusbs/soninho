# Fase 1 · PR 4 — Refatoração: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o código do Soninho legível para quem avalia o portfólio. Arquivos grandes viram componentes e hooks pequenos, a lógica de timer duplicada é unificada e todo `eslint-disable` sem justificativa sai. **Comportamento e visual continuam idênticos.**

**Architecture:**
- **Testes antes de mexer.** Testes de componente (Vitest + Testing Library em jsdom) fixam o comportamento atual antes de cada refatoração.
- **Relógio único.** Um hook compartilhado `useNow` (via `useSyncExternalStore`) substitui os `setInterval` espalhados, o que corrige o atraso e o congelamento dos relógios.
- **Divisão de arquivos.** Cada arquivo grande se divide por responsabilidade (seções, abas, campos), com hooks de dados próprios.

**Tech Stack:** Next.js 16.4, React 19.3, react-hook-form 7 + zod 4, zustand 5, Vitest 5 + `@testing-library/react` + `jsdom`.

**Spec:** `docs/superpowers/specs/2026-11-15-estabilizacao-design.md` §8.4 e seção "PR 4" de `docs/superpowers/plans/2026-11-15-fase1-backlog.md`.

## Global Constraints

- Branch `fase1/04-refatoracao`, criada a partir da `main` em `419fb67`. Commits convencionais terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Sem mudança de comportamento ou de visual** (spec §8.4): mesmos textos PT-BR, mesmas classes Tailwind, mesma ordem de elementos, mesmas chamadas de rede.
  - Exceção: as correções listadas no backlog do PR 4. São bugs, e são as únicas mudanças de comportamento permitidas.
- Critério de divisão: arquivo com mais de cerca de 300 linhas ou com responsabilidades misturadas é dividido. Nenhum arquivo novo deve passar de 250 linhas.
- **Zero `eslint-disable`** sem comentário `--` explicando por que a regra não se aplica.
- Gates por task:
  - `npm run lint` (0 problemas);
  - `npx tsc --noEmit`;
  - `npm test` (saída limpa);
  - `npm run build` com env fictícia quando a task tocar páginas.
- Next 16: consultar `node_modules/next/dist/docs/` antes de mudar convenções de componentes de servidor ou de cliente.
- Testes de componente:
  - usar `// @vitest-environment jsdom` no topo do arquivo;
  - mockar Supabase e `fetch` na fronteira (o client injetado ou o módulo `@/lib/supabase/client`);
  - nunca chamar rede de verdade.
- Sem migrations neste PR.

## Review Focus

1. **Hidratação:** valores dependentes do relógio não podem diferir entre o render do servidor e o do cliente. O primeiro render usa um valor estável (`null`/placeholder), e o relógio só começa depois de montar. Teste `useNow_server_snapshot_is_stable` (Task 1).
2. **Timer em andamento enquanto a refatoração entra:** o `SleepTimer` dividido mostra o mesmo tempo decorrido e os mesmos botões para uma sessão já rodando (vinda do store persistido). Teste `renders_running_session_from_store` (Task 3).
3. **Salvar configurações:** cada aba dividida envia exatamente o mesmo payload que antes, inclusive campos vazios e `null`. Testes `saves_*_same_payload` (Task 4).
4. **Formulários:** editar um registro existente pré-preenche todos os campos como antes, e a validação de fim antes do início continua funcionando ao mudar só a data. Testes `edit_prefills_all_fields` e `end_date_change_clears_or_sets_range_error` (Task 5).
5. **Atualização ao vivo:** o "Dormindo" do `WakeWindowBadge` e o timer principal mostram o mesmo segundo. Teste `badge_and_timer_share_clock` (Task 1/3).

---

### Task 1: Infra de testes de componente + relógio compartilhado

**Files:** Create `src/hooks/useNow.ts` (+ `useNow.test.tsx`), `src/test/render.tsx`. Modify `package.json`, `vitest.config.mts`, `src/hooks/useWakeWindow.ts`, `src/components/sleep/WakeWindowBadge.tsx`.

**Interfaces — Produces:**
- `useNow(intervalMs?: number): number | null`, com `intervalMs` padrão 1000.
  - Retorna `Date.now()` quantizado em segundos, compartilhado entre todos os consumidores com um único `setInterval` por intervalo.
  - O snapshot do servidor e o primeiro snapshot do cliente são `null`.
  - Implementação com `useSyncExternalStore`.
- `renderWithProviders(ui, opts?)` em `src/test/render.tsx`: envolve o componente em `QueryClientProvider` (`retry: false`) e nos providers de bebê/perfil quando `opts` os fornecer.

- [ ] **Step 1:** `npm i -D @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom`. Configurar `setupFiles` para o jest-dom apenas nos arquivos jsdom (ou importar no `render.tsx`). A saída dos testes deve continuar limpa.
- [ ] **Step 2: testes (fake timers).**
  - `useNow_server_snapshot_is_stable`: o `getServerSnapshot` retorna `null`.
  - `useNow_ticks_every_second`: avança 3 s e o valor muda 3 vezes.
  - `useNow_single_interval_for_many_consumers`: dois componentes montados criam um só `setInterval` (espiar `setInterval`).
  - `badge_and_timer_share_clock`: dois consumidores recebem o mesmo valor no mesmo tick.
  - `stops_interval_when_unmounted`.
- [ ] **Step 3:** `useWakeWindow` passa a usar `useNow(60_000)` para o "agora", o que corrige o relógio congelado quando não há sono concluído. Teste: sem sessão concluída, depois de avançar 2 min, `elapsedMinutes` (ou o campo equivalente) muda.
- [ ] **Step 4:** O "Dormindo" do `WakeWindowBadge` passa a calcular o decorrido com `useNow()`, o mesmo relógio do timer. Os textos e classes ficam idênticos.
- [ ] **Step 5:** Gates. Commit `refactor: shared clock hook and component test setup`.

### Task 2: Base comum dos hooks de timer

**Files:** Create `src/hooks/timer/useSessionClock.ts` e `src/hooks/timer/useActiveSessionSync.ts` (+ testes). Modify `src/hooks/useSleepTimer.ts` e `src/hooks/useBreastfeedingTimer.ts`.

**Interfaces — Produces:**
- `useSessionClock(startIso: string | null): { elapsedSec: number | null }`, construído sobre `useNow`.
- `useActiveSessionSync<T>(opts: { babyId: string | null; sessionId: string | null; fetchStatus: (sessionId: string) => Promise<LiveSessionResult>; onEnded: () => void; onMismatch: () => void; intervalMs?: number })`. Encapsula o poll e a classificação que já existem (`classifyLiveSession` em `src/lib/supabase/sessionConflict.ts`), com a mesma frequência atual (20 s).

- [ ] **Step 1: testes antes.** Fixar o comportamento atual dos dois hooks com `renderHook`, o store real e um Supabase falso:
  - `start_creates_session_and_timer`;
  - `stop_ends_session_once`;
  - `conflict_syncs_existing`;
  - `poll_error_keeps_timer`;
  - `poll_ended_stops_timer`.

  Fazer isso para sono e para mamada; os testes do PR 3 que já cobrem partes disso podem ser reaproveitados.
- [ ] **Step 2:** Extrair as duas bases e reescrever os hooks em cima delas.
  - `useBreastfeedingTimer`:
    - a função interna não pode mais sombrear o estado (`tick` → nome distinto);
    - a checagem de tick atual passa a comparar também os totais por lado;
    - remover o `TODO(PR4)`.
  - Nenhum `eslint-disable` nos hooks.
- [ ] **Step 3:** Testes da Step 1 verdes e sem mudanças. Gates. Commit `refactor: share timer clock and session sync between sleep and breastfeeding hooks`.

### Task 3: `SleepTimer` dividido

**Files:** Modify `src/components/sleep/SleepTimer.tsx` (fica ≤ 150 linhas, só compõe). Create em `src/components/sleep/timer/`: `TimerDisplay.tsx`, `TimerActions.tsx`, `BackdateStartChips.tsx`, `NextSleepSuggestions.tsx`, `SleepTypeToggle.tsx` (nomes podem se ajustar às seções reais, desde que cada arquivo tenha uma responsabilidade), mais `SleepTimer.test.tsx`.

- [ ] **Step 1: testes antes**, contra o componente atual:
  - `renders_idle_state` (botões e textos de iniciar);
  - `renders_running_session_from_store` (tempo decorrido `00:12:34` com relógio fixo e sessão iniciada há 754 s);
  - `backdate_chip_starts_with_offset`;
  - `stop_opens_post_sleep_review` (ou o fluxo atual equivalente);
  - `fallback_time_bubble_has_no_hydration_mismatch`: o primeiro render não mostra horário dependente do relógio, que só aparece depois de montar (corrige o mismatch registrado no backlog).
- [ ] **Step 2:** Dividir o componente. Props tipadas e sem lógica de dados nos filhos de apresentação: os dados vêm do `useSleepTimer`.
- [ ] **Step 3:** Testes verdes sem mudanças (exceto o de hidratação, que passa a verde). Gates mais build. Commit `refactor: split SleepTimer into focused components`.

### Task 4: Página de configurações dividida

**Files:** Modify `src/app/(dashboard)/settings/page.tsx` (≤ 120 linhas, só abas e layout). Create em `src/components/settings/`: `GeneralTab.tsx`, `NotificationsTab.tsx`, `ToolsTab.tsx` (o `ToolsSettings` existente pode absorver), `BabyProfileForm.tsx`. Create em `src/hooks/settings/`: `useBabySettings.ts`, `useNotificationSettings.ts` (+ testes).

**Interfaces — Produces:**
- `useBabySettings()`: `{ baby, save(values), uploadAvatar(file), isSaving }`.
- `useNotificationSettings()`: `{ prefs, save(partial), push: { status, enable, disable, test } }`.
- Ambos encapsulam exatamente as chamadas que a página faz hoje (as mesmas tabelas, rotas e payloads).

- [ ] **Step 1: testes antes**, contra a página atual, com o Supabase e o `fetch` mockados:
  - `saves_baby_same_payload`;
  - `uploads_avatar_same_path`, com caminho `${userId}/${timestamp}.${ext}` no bucket `baby-avatars`;
  - `saves_notification_prefs_same_payload`;
  - `export_csv_same_content`;
  - `request_report_same_request`;
  - `switches_tabs`.
- [ ] **Step 2:** Dividir.
  - O formulário do bebê usa react-hook-form + zod: nome obrigatório, data de nascimento obrigatória.
  - As mensagens de erro e o toast continuam os atuais.
  - Os 20 `useState` viram estado de formulário e os dois hooks de dados.
- [ ] **Step 3:** Testes verdes sem mudanças. Gates mais build. Commit `refactor: split settings page into tabs and data hooks`.

### Task 5: Formulários de sono e mamada

**Files:** Modify `src/components/sleep/SleepForm.tsx` e `src/components/feeding/FeedingForm.tsx`. Create `src/components/forms/DateTimeRangeFields.tsx` e `src/components/forms/useTimeRangeValidation.ts` (+ testes).

**Interfaces — Produces:**
- `DateTimeRangeFields`: campos de data e hora de início e fim, com o layout e as classes atuais. Recebe `control` do react-hook-form e os nomes dos campos.
- `useTimeRangeValidation(control, names)`: usa `useWatch` e define ou limpa o erro "O fim não pode ser antes do início" (de `src/lib/validation/timeRange.ts`) ao mudar **qualquer** um dos 4 campos.

- [ ] **Step 1: testes antes.**
  - `edit_prefills_all_fields` (sono e mamada);
  - `create_submits_same_payload`;
  - `end_date_change_clears_or_sets_range_error`: corrige o item do backlog em que só a hora limpava o erro;
  - `blocks_submit_when_end_before_start`.
- [ ] **Step 2:**
  - Trocar `watch()` por `useWatch`.
  - Remover os 2 `eslint-disable react-hooks/incompatible-library`.
  - Resolver os `exhaustive-deps` (`SleepForm.tsx:151`, `FeedingForm.tsx:152`): reset por `key` ou deps corretas, sem `eslint-disable`.
  - Extrair os campos compartilhados para `DateTimeRangeFields`.
- [ ] **Step 3:** Testes verdes. Gates. Commit `refactor: share time range fields between sleep and feeding forms`.

### Task 6: `queries.ts` dividido por domínio

**Files:** Create `src/lib/supabase/queries/{babies,sleep,family,notifications,profile}.ts`. Delete `src/lib/supabase/queries.ts`. Modify todos os importadores (`grep -rln "@/lib/supabase/queries\"" src`). `feedingQueries.ts` fica como está.

- [ ] **Step 1:** Mover as funções sem mudar nenhuma assinatura nem corpo. Sem barrel `index.ts`: os importadores apontam para o módulo do domínio.
- [ ] **Step 2:** `tsc`, lint e testes verdes. Garantir que `git diff --stat` mostre só movimentação e imports (`git diff -M` sem mudança de corpo). Commit `refactor: split supabase queries by domain`.

### Task 7: Componentes grandes restantes

**Files:** `src/components/landing/LandingPage.tsx` vira seções em `src/components/landing/sections/*`. `src/components/sleep/EnvironmentPicker.tsx` vira subcomponentes por grupo (temperatura, clima, saco, roupa). `src/components/settings/FamilySettings.tsx` vira `MembersList`, `InviteManager` e `FamilyNotesSettings` (conforme o conteúdo real).

- [ ] **Step 1: testes antes.** Uma renderização de fumaça por componente com as asserções dos textos principais. No `FamilySettings`, adicionar `generates_invite_link` (copia o link de `buildInviteLink`) e `removes_member_shows_server_error`.
- [ ] **Step 2:** Dividir. O `eslint-disable set-state-in-effect` de `FamilySettings.tsx:122` deve sair: buscar dados com TanStack Query ou um handler, como no resto do app.
- [ ] **Step 3:** Testes verdes. Gates mais build. Commit `refactor: split landing, environment picker and family settings`.

### Task 8: Pendências do backlog

**Files:**
- `src/components/providers/BabyProvider.tsx:68`
- `src/components/settings/UserProfileSettings.tsx:29`
- `src/components/sleep/RegressionRadar.tsx`, `src/lib/sleep/regressionAiGate.ts`, `src/app/api/ai/regression/route.ts`
- `src/components/ui/calendar.tsx`, `package.json`
- `.github/workflows/ci.yml`

- [ ] **Step 1:** Remover ou justificar os `eslint-disable` de `BabyProvider` e `UserProfileSettings`. Preferir corrigir: para defaults vindos de dados buscados, usar `reset()` do formulário via `key` ou `values`.
- [ ] **Step 2: card de regressão.**
  - Marcar a chave diária sempre que uma chamada `withAi: true` com regressão detectada terminar, com ou sem explicação.
  - Se `consumeAiQuota` lançar erro, a rota retorna 200 com o resultado determinístico em vez de 500.
  - Testes Vitest no gate e na rota (lógica extraída).
- [ ] **Step 3:** Remover `react-day-picker` e `src/components/ui/calendar.tsx` depois de conferir com `grep` que não há uso. Rodar `npm uninstall react-day-picker`.
- [ ] **Step 4:** CI: `actions/checkout` e `actions/setup-node` na última versão estável (v7 ou a mais nova), fixadas por SHA, com o comentário da versão na mesma linha (`@<sha> # v7.x.y`). Pegar os SHAs com `gh api repos/actions/checkout/git/ref/tags/<tag>`. Fazer o mesmo para `supabase/setup-cli`. Rodar `actionlint`.
- [ ] **Step 5:** Gates. Commit(s) `refactor: remove unjustified lint disables`, `fix: regression card quota handling`, `chore: remove unused calendar`, `ci: pin actions by sha`.

### Task 9: Documentação e publicação (controller)

- [ ] **Step 1:**
  - README PT/EN: seção "Arquitetura" atualizada para a nova estrutura de pastas (componentes de timer e settings, `queries/` por domínio, `useNow`).
  - Backlog: PR 4 marcado como concluído.
  - Spec: Fase 1 marcada como concluída.

  Commit `docs: update architecture after refactor`.
- [ ] **Step 2:**
  1. Push e `gh pr create` (título `Fase 1 · PR 4 — Refatoração`, rodapé `🤖 Generated with [Claude Code](https://claude.com/claude-code)`).
  2. Esperar CI e preview verdes.
  3. Merge.
  4. Smoke em produção (`/`, `/app`, crons) e conferência do cron.
