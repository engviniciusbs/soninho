# Correções da varredura (Fase 2 · PR 1) — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Corrigir os 21 problemas da varredura (itens 1–16 e 18–22 da spec) e aplicar as três decisões do autor: babá, gênero e segundo bebê.

**Architecture:** As correções ficam dentro do código atual, em grupos por área. Cada bug ganha um teste que falha antes e passa depois. Há duas colunas novas e duas mudanças de RPC numa migration aditiva. A lógica de tempo e fuso vai para helpers únicos, que as outras tarefas reutilizam.

**Tech Stack:** Next.js 16.4, React 19, TypeScript, Supabase (Postgres, RLS, pgTAP), TanStack Query, zustand, Vitest, web-push.

**Spec:** `docs/superpowers/specs/2026-11-16-correcoes-fase2-design.md`. Os itens são referidos como "spec #N". Cada um traz arquivo:linha, causa e correção esperada; leia o item da sua tarefa.

## Global Constraints

- **Next 16:** AGENTS.md exige ler `node_modules/next/dist/docs/` antes de escrever código.
- **Banco:**
  - DDL só por migration nova em `supabase/migrations/`, aditiva, com nada apagado; pgTAP em `supabase/tests/`;
  - produção só pelo controlador, no fim, com `npx supabase db push --remote` depois de backup;
  - implementadores usam só o banco local (`npx supabase db reset`, `npx supabase test db`).
- **Dados:**
  - nunca usar produção nem dados reais;
  - o seed local (`supabase/seed.sql`) é fictício: `teste@soninho.local` e `baba@soninho.local`, senha `soninho-local`.
- **Fuso:** dias são locais. O servidor roda em UTC; testes de data rodam com `TZ=UTC` e fuso `America/Sao_Paulo` explícito.
- **Testes:**
  - todo bug corrigido ganha um teste que falha antes e passa depois, com evidência RED/GREEN no relatório;
  - um teste que afirma comportamento errado é corrigido, e o motivo vai no relatório;
  - nunca editar asserção de comportamento só para passar.
- **Visual:**
  - tokens `sn-*` e primitivos de `src/components/ui`;
  - ícones de `src/components/brand/icons`, sem lucide em telas logadas;
  - sem emoji como ícone e sem "·";
  - números com vírgula decimal (pt-BR).
- **Copy:** PT-BR; a tela de configurações chama-se "Mais"; nunca "Configurações".
- **Gates por tarefa:** `npm run lint` com 0 problemas, `npx tsc --noEmit`, `npm test`, e `npm run build` quando tocar rotas ou componentes.
- **Git:** um ou mais commits em português terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Rodar `git checkout AGENTS.md` se o `npm run dev` reescrever o arquivo.

## Review Focus

1. **Dois celulares no mesmo peito.** A começa às 10:00 no esquerdo e troca para o direito às 10:12. B abre o app às 10:15 e para às 10:20. O total gravado deve ser 12 min no esquerdo e 8 min no direito. Teste na Task 4.
2. **Madrugada.** A noite começou às 18:30 e ela acordou às 02:00. Ao abrir o app às 02:05, o próximo sono é noturno, o seletor fica em Noturno e nenhum aviso de soneca sai. Testes nas Tasks 2 e 5.
3. **Servidor em UTC às 22:30 de São Paulo (01:30 UTC).** "Hoje" na IA, na regressão e no e-mail é o dia local, não o dia UTC. Testes nas Tasks 1, 3 e 6.
4. **Viewer e babá pelas URLs.** A babá abre `/feeding` e `/more/notifications`; `/history`, `/analytics` e `/more/family` redirecionam. Um viewer não vê nenhum botão de escrita em home, Comida e Registro. Testes na Task 8.
5. **Bebê com `sex` nulo.** Todos os textos com gênero usam a forma neutra, sem "dela/dele" quebrado. Teste na Task 10.

---

### Task 1: Migration, RPCs e helpers de data

**Files:**
- Create: `supabase/migrations/<timestamp>_fase2_correcoes.sql`, `supabase/tests/fase2_correcoes.test.sql`
- Create: `src/lib/dates/localDate.ts` e `.test.ts`
- Modify:
  - `src/lib/utils.ts` (`getBabyAge`), `src/lib/sleep/computeNapSuggestion.ts`, `src/lib/sleep/regression.ts`, `src/components/home/WhyThisTimeSheet.tsx`, `src/components/settings/BabiesSettings.tsx`;
  - `src/types/index.ts` (e os tipos gerados do Supabase, se existirem) com `sex` e `side_started_at`.

**Interfaces:**
- **Produz (SQL):**
  - `babies.sex text null check (sex in ('F','M'))`;
  - `breastfeeding_sessions.side_started_at timestamptz null`;
  - `create_baby_with_family(..., p_family_id uuid default null)`: com `p_family_id`, exige que o chamador seja owner daquela família e insere o bebê nela; sem ele, usa a família da qual o chamador é o único owner ou, se não houver, cria uma nova. Os parâmetros atuais são mantidos.
  - `delete_baby(p_baby_id uuid) returns void`: só owner; apaga o bebê e, se a família ficar sem bebês, apaga a família (membros, convites e recados por cascade/explicitamente). Grant só para `authenticated`.
- **Produz (TS):**
  - `parseLocalDate(ymd: string): Date`: meia-noite local, sem deslocamento UTC;
  - `formatLocalDate(ymd: string, pattern?: string): string`;
  - `localDayKey(at: Date, tz: string): string` (`yyyy-MM-dd`);
  - `addDaysToKey(key: string, n: number): string`.

- [ ] **Step 1: Testes que falham**
  - **pgTAP:**
    - `has_column` para `babies.sex` e `breastfeeding_sessions.side_started_at`;
    - check de `sex` rejeita `'X'`;
    - owner cria o segundo bebê com `p_family_id` → mesmo `family_id`;
    - não-owner com `p_family_id` → erro;
    - `delete_baby` por caregiver → erro;
    - `delete_baby` do último bebê → família removida;
    - `has_function_privilege('anon', 'delete_baby(uuid)', 'execute')` é falso. Use `has_function_privilege`; chamar como anon faz o PG local dar segfault.
  - **Vitest `localDate.test.ts`, com `process.env.TZ='UTC'`:**
    - `formatLocalDate('2026-02-10','dd/MM')` é `'10/02'`;
    - `localDayKey(new Date('2026-11-17T01:30:00Z'),'America/Sao_Paulo')` é `'2026-11-16'`;
    - `addDaysToKey('2026-02-28',1)` é `'2026-03-01'`.
- [ ] **Step 2:** `npx supabase db reset && npx supabase test db` e `npx vitest run src/lib/dates` → FAIL.
- [ ] **Step 3: Implementar.**
  - Escrever a migration e os helpers.
  - Trocar todo `new Date("YYYY-MM-DD")` de datas de nascimento por `parseLocalDate`: `grep -rn "new Date(.*birth" src` e os locais da spec #7.
  - Adicionar um teste de `getBabyAge` com `TZ=UTC`.
- [ ] **Step 4:** rodar de novo, depois `npm test` → PASS.
- [ ] **Step 5:** commit `fix(dados): migration de gênero, início do lado e RPCs de bebê; datas locais`.

### Task 2: Inferência do próximo sono (spec #3, #6)

**Files:**
- Modify: `src/lib/sleep/inferNextSleepKind.ts` (+ `.test.ts`, corrigindo a asserção da linha 56), `src/lib/sleep/computeNapSuggestion.ts`, `src/lib/sleep/wakeEstimate.ts`, `src/lib/notifications/selectAlerts.ts` (+ `.test.ts`), `src/components/sleep/SleepTimer.tsx` (efeito de troca automática de tipo).

**Interfaces:**
- Produz: `inferNextSleepKind` com a mesma assinatura pública. Regras novas:
  - (a) último sono noturno terminado entre 19:00 e 05:00 locais → `NIGHT_SLEEP`;
  - (b) janela que termina às 18:00 ou depois → `NIGHT_SLEEP`;
  - (c) `minutesUntilClock` rola para o dia seguinte quando o alvo já passou.
- Produz: `selectAlerts` não gera `NAP_SOON`/`OVERDUE` quando a inferência dá `NIGHT_SLEEP`.

- [ ] **Step 1: Testes que falham.**
  - Noite terminada às 23:00 → `NIGHT_SLEEP`, e minutos até o alvo ≥ 0.
  - Noite terminada às 02:00 → `NIGHT_SLEEP`.
  - Soneca terminada às 15:00, agora 15:10, menos de 3 noites, janela 18:00–19:00 → `NIGHT_SLEEP`.
  - `estimateWakeTime` ignora fins de noite fora de 04:00–10:00.
  - `selectAlerts`: 9 meses, último sono terminado às 15:00, agora 18:10 → nenhum alerta.
  - `SleepTimer`: com a sugestão `NAP` às 02:05 e sem timer, o seletor **não** muda para Soneca. A troca automática só vale entre 05:00 e 19:00.
- [ ] **Step 2:** `npx vitest run src/lib/sleep src/lib/notifications src/components/sleep` → FAIL.
- [ ] **Step 3:** implementar as regras (a)–(c). `selectAlerts` reusa a mesma função, sem duplicar a regra.
- [ ] **Step 4:** PASS, depois `npm test`.
- [ ] **Step 5:** commit `fix(sono): madrugada e fim de tarde viram sono noturno; sem aviso de soneca à noite`.

### Task 3: Números de sono honestos (spec #4, #5)

**Files:**
- Modify: `src/lib/sleep/regression.ts`, `src/app/api/ai/regression/route.ts`, `src/lib/sleep/statistics.ts`, `src/components/analytics/useAnalyticsData.ts`, `src/app/(dashboard)/analytics/numbers/page.tsx` e os testes correspondentes.

**Interfaces:**
- Consome: `withProvisionalEnd` (`src/lib/sleep/provisional.ts`), `localDayKey` (Task 1).
- Produz: `buildDailySleepTotals(sessions, tz, now)` só com dias completos; `getLast24hStats(sessions, now)` com `{ totalMinutes, longestNightMinutes }` por sobreposição.

- [ ] **Step 1: Testes que falham.**
  - Bebê regular (noite 18:30–06:00, sonecas 09:30–10:30 e 14:00–15:00, 14 dias), às 07:00 → `detected === false` e débito com |valor| < 30 min.
  - Às 19:00, com a noite rodando desde 18:30 → "Sono 24h" ≈ 13h30 ± 15 min.
  - `longestNightMinutes` ignora sonecas.
  - A rota de regressão usa o `timezone` do corpo.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(análise): regressão, débito e sono 24h só com dias completos e sono em andamento`.

### Task 4: Peito em dois celulares (spec #1)

**Files:**
- Modify: `src/store/feedingStore.ts`, `src/hooks/useBreastfeedingTimer.ts` (+ `.test.tsx`), `src/lib/supabase/feedingQueries.ts`.

**Interfaces:**
- Consome: a coluna `side_started_at` (Task 1).
- Produz: `updateBreastfeedingSides(supabase, id, { side_left_sec, side_right_sec, last_side, side_started_at })` com guarda `.is("end_time", null)`, que retorna `{ error, updated: boolean }`.

- [ ] **Step 1: Teste que falha (Review Focus 1).**
  - Com o banco falso: A começa às 10:00 no esquerdo e troca às 10:12; B restaura às 10:15 e para às 10:20.
  - Esperado: `side_left_sec === 720` e `side_right_sec === 480`.
  - Atualizar os lados depois de outro celular encerrar → `updated === false`, sem sobrescrever.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** gravar `side_started_at` no início e a cada troca; restaurar a partir dele; somar no stop.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(comida): peito encerrado em outro celular grava o tempo certo`.

### Task 5: Home viva e telas sincronizadas (spec #2, #14)

**Files:**
- Modify: `src/hooks/useAISuggestions.ts`, `src/app/api/ai/suggest/route.ts`, `src/components/sleep/SleepTimer.tsx`, `src/components/sleep/SleepForm.tsx`, `src/hooks/useSleepTimer.ts` (só a adoção da sessão aberta).
- Create: `src/lib/query/invalidateSleep.ts`.

**Interfaces:**
- Produz:
  - a resposta de `/api/ai/suggest` inclui `suggestedAtIso`, `windowStartIso` e `windowEndIso`;
  - `invalidateSleepQueries(qc: QueryClient, babyId: string): Promise<void>`, que invalida `["sleep-sessions"]`, `["last-session", babyId]`, `["last-session-key", babyId]`, `["ai-suggestion", babyId]` e `["regression", babyId]` (conferir as chaves reais e listá-las no teste).

- [ ] **Step 1: Testes que falham.**
  - A mesma sugestão (`suggestedAtIso` às 11:30) com o relógio às 10:00 mostra "Em cerca de 1h 30min"; avançando o relógio para 11:45, mostra "Já passou".
  - O fallback sem sugestão usa o meio da janela.
  - Salvar no `SleepForm` chama `invalidateSleepQueries`.
  - Sem timer local, quando a consulta periódica (30 s, só com a página visível) encontra uma sessão aberta de outro cuidador, a home passa ao estado dormindo.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar. O cálculo de minutos e de atraso fica no cliente, a partir do `useNow`.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(home): previsão acompanha o relógio e telas se atualizam após mudanças`.

### Task 6: Avisos, e-mail semanal e IA (spec #8, #9, #10, #15, #7 parte IA)

**Files:**
- Modify:
  - `src/app/api/notifications/subscribe/route.ts`, `src/hooks/usePushNotifications.ts`;
  - `src/lib/notifications/familyActivity.ts`, `public/sw.js`;
  - `src/app/api/family/activity/route.ts`, `src/hooks/useFamilyActivityToasts.ts`;
  - `src/lib/email/weekly.ts`, `src/lib/email/sleepReport.ts`, `src/emails/WeeklyReport.tsx`;
  - `src/lib/ai/analyzeSleep.ts`, `src/lib/ai/prompts.ts`, `src/app/api/ai/chat/route.ts`, `src/components/ai/AIInsights.tsx`;
  - os testes de cada um.

**Interfaces:**
- Consome: `localDayKey`, `addDaysToKey` (Task 1); `isInQuietHours` (`selectAlerts`).
- Produz: a resposta de `/api/family/activity` com itens `{ ..., actor_user_id: string, kind: "sleep" | "feeding" }`.

- [ ] **Step 1: Testes que falham, um por item.**
  - **Subscribe:** uma linha existente com `enabled=false` continua `false` depois do subscribe.
  - **Atividade da família:**
    - destinatário em horário de silêncio → sem push;
    - item com o próprio `actor_user_id` → sem toast;
    - item `kind:"feeding"` usa o texto de comida, nunca "soneca".
  - **E-mail semanal:**
    - o caregiver da família recebe;
    - usuário sem linha de preferências recebe;
    - o período termina ontem (local);
    - a maior noite é medida por sessão (noite de 11 h → 11 h);
    - "Média soneca" é a duração média.
  - **IA (`analyzeSleep`):**
    - com `TZ=UTC` às 01:30 UTC, "hoje" é o dia de São Paulo;
    - o nascimento `2026-02-10` sai "10/02/2026".
  - **Prompt:** não contém "recém-nascidos" e cita a idade em meses.
  - **Chat:** com erro da OpenAI antes do stream, a cota não é consumida.
  - **`AIInsights`:** `retry` é falso, e o 429 mostra "Limite diário de IA atingido".
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: Implementar.**
  - **`sw.js`:** `requireInteraction` só quando `data.type === "OVERDUE"`; `notificationclick` cai para `clients.openWindow` se `navigate` falhar.
  - **Textos de e-mail:** "Mais → Notificações" e "Mais → Relatórios".
  - **`lastSeenId`:** reiniciado ao trocar de bebê.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commits por grupo: `fix(avisos): …`, `fix(email): …`, `fix(ia): …`.

### Task 7: Exportar, excluir bebê e segundo bebê (spec #11, #12, decisão 3)

**Files:**
- Modify: `src/hooks/settings/useSleepExport.ts`, `src/hooks/settings/useBabySettings.ts`, `src/components/settings/BabiesSettings.tsx`, `src/lib/supabase/queries/babies.ts` (+ testes).

**Interfaces:**
- Consome: as RPCs `create_baby_with_family(..., p_family_id)` e `delete_baby(p_baby_id)` (Task 1).

- [ ] **Step 1: Testes que falham.**
  - **Exportação:** com 2.350 sessões no fake paginado, o CSV tem 2.350 linhas de dados; erro na página 2 → toast "Não foi possível exportar", não "Nenhum registro"; o estado de carregamento é reiniciado no `finally`.
  - **Criação de bebê:** owner com o bebê ativo na família F chama a RPC com `p_family_id = F`.
  - **Excluir:** o botão não aparece para caregiver; a exclusão usa `delete_baby`; o aviso cita "todos os registros de sono e alimentação".
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(bebês): exportação completa, exclusão só por owner e segundo bebê na mesma família`.

### Task 8: Acesso por papel, babá e logout (spec #13, #16, decisão 1)

**Files:**
- Modify: `src/components/layout/navLinks.ts`, `src/components/layout/nannyAccess.ts` (+ testes), `src/app/(dashboard)/more/page.tsx`, `src/components/layout/TopBar.tsx`, `src/components/settings/SignOutButton.tsx`, e as telas home, Comida e Registro para a escrita.
- Create: `src/hooks/useCanWrite.ts` (+ `.test.tsx`).

**Interfaces:**
- **Produz:**
  - `useCanWrite(): { canWrite: boolean; isLoading: boolean }` (owner ou caregiver do bebê ativo);
  - `isNannyAllowed`, que permite exatamente `/app`, `/feeding`, `/more`, `/more/notifications` e `/more/profile`;
  - `getNavLinks(true)`, que devolve `["/app", "/feeding", "/more"]`;
  - `signOutEverywhere()` em `SignOutButton`: cancela o push deste dispositivo (`DELETE` ou unsubscribe na rota existente), limpa `soninho-timer`, `soninho-feeding-timer` e o gate de regressão local, e chama `supabase.auth.signOut()`.

- [ ] **Step 1: Testes que falham (Review Focus 4).**
  - Rotas permitidas e negadas para a babá, incluindo `/history`, `/analytics` e `/more/family` negadas.
  - O Mais da babá lista Notificações e Perfil.
  - Viewer na home, em Comida e no Registro: nenhum botão Iniciar, Registrar, Editar ou Excluir, e aparece o texto "Você tem acesso só para ver".
  - O `TopBar` não tem botão Sair.
  - `signOutEverywhere` limpa as duas chaves de localStorage e cancela o push.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar.
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(acesso): babá registra comida e gerencia avisos; viewer só vê; sair limpa o dispositivo`.

### Task 9: Gênero, textos e unidades (decisão 2, spec #18, #19, #20)

**Files:**
- Create: `src/lib/i18n/gender.ts` (+ `.test.ts`), `src/lib/format/number.ts` (+ `.test.ts`).
- Modify:
  - `BabyProfileForm` (campo Menina, Menino, Não informar);
  - os textos com gênero (`WakeWindowCard.tsx`, `captureLabels.ts`, `SleepCard.tsx`, `more/family/page.tsx`, `AIChat.tsx`, prompt da IA e os que um grep encontrar);
  - os toasts "adicione um bebê" (spec #19);
  - Análise e gráficos (`formatDuration`);
  - `SleepingCard.tsx` e `TempStepper.tsx` (vírgula).

**Interfaces:**
- **Produz:**
  - `g(sex: "F" | "M" | null | undefined, forms: { f: string; m: string; n: string }): string`;
  - `formatDecimal(n: number, digits?: number): string` (pt-BR).
- **Consome:** `formatDuration` (`src/lib/utils.ts`) e `babies.sex` (Task 1).

- [ ] **Step 1: Testes que falham.**
  - `g('F', …)` devolve f, `g(null, …)` devolve n.
  - `WakeWindowCard` com `sex` nulo mostra "Tempo acordado(a)" ou a forma neutra escolhida, e com `'F'` mostra "Tempo acordada".
  - `formatDecimal(22.5)` é `"22,5"`.
  - "Mais números" mostra "10h 54min", nunca "10,9h".
  - O toast sem bebê diz "Adicione um bebê em Mais › Bebês".
  - Teste de varredura: `grep` em `src/` (menos testes e landing) não encontra "Configurações".
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3: Implementar.** A forma neutra é escolha do implementador, mas sempre gramatical. Exemplos: "Tempo acordado", "adormeceu sem ajuda", "quem cuida do bebê".
- [ ] **Step 4:** PASS e `npm test`.
- [ ] **Step 5:** commit `fix(textos): gênero do bebê, "Mais" no lugar de Configurações e unidades em pt-BR`.

### Task 10: Redesign incompleto e teclado (spec #21, #22)

**Files:**
- Modify:
  - `src/components/settings/BabyProfileForm.tsx`, `BabiesSettings.tsx` (diálogo de excluir), `src/components/sleep/PostSleepReview.tsx`, `SleepForm.tsx`, `FeedingForm.tsx`;
  - `src/components/baby/BabyAvatar.tsx`, `src/components/ui/{dialog,sheet,select,sonner}.tsx`, `src/components/sleep/environment/TempStepper.tsx`;
  - `src/lib/family/relations.ts`, e os textos de "mural/equipe";
  - `src/components/home/HomeHeader.tsx` (marca só no mobile).
- Create: os ícones de marca que faltarem em `src/components/brand/icons` (star, chevron-down, x, check, camera, leaf, info, alert).
- Create: `src/components/ui/star-rating.tsx`.

**Interfaces:**
- Produz: `StarRating({ value: number | null, onChange: (v: number | null) => void, label: string })`, com `role="radiogroup"` e seleção desfeita ao tocar de novo, usado em PostSleepReview e SleepForm.

- [ ] **Step 1: Testes que falham.**
  - Enter no botão "Condições do ambiente" abre uma única vez; o mesmo no stepper de temperatura (+0,5 por Enter).
  - `StarRating`: ArrowRight muda o valor; tocar na estrela já selecionada limpa.
  - Os selects do SleepForm podem ser limpos ("Não informar").
  - O campo "Local" não aparece no SleepForm.
  - Os títulos são "Editar sono" e "Editar alimentação".
  - O papel de cuidador diz "Pode registrar sono e alimentação".
  - Nenhuma importação de `lucide-react` em `src/components` e `src/app/(dashboard)`: teste de varredura com grep, excluindo landing, auth e invite.
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar. Snapshots regravados só depois de conferir o diff.
- [ ] **Step 4:** PASS, `npm test` e `npm run build`.
- [ ] **Step 5:** commit `fix(visual): formulário de bebê, estrelas, ícones da marca e teclado`.

### Task 11: Varredura final e documentação

- [ ] **Step 1:** rodar `npm run lint && npx tsc --noEmit && npm test && npm run build && npx supabase test db` → tudo verde.
- [ ] **Step 2: conferência local no navegador.**
  - Como owner: home pela manhã e à noite, iniciar e parar sono, mamadeira, Análise › Mais números, excluir um bebê de teste.
  - Como babá: Comida e Notificações.
  - Como viewer: criar um usuário viewer no seed local, só via SQL local.
- [ ] **Step 3:** atualizar o README, se descrever o acesso da babá, e o backlog `docs/superpowers/plans/2026-11-15-fase1-backlog.md`, marcando o que foi resolvido.
- [ ] **Step 4:** commit `chore: varredura final das correções da Fase 2`.
