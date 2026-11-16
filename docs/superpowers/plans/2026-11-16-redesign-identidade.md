# Redesign da identidade visual — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a identidade visual do app logado do Soninho pelo sistema escuro azul-noite e lavanda aprovado, recompor home, Comida, Registro, Análise e Mais conforme os mockups e manter toda a lógica e os dados atuais.

**Architecture:** Primeiro os tokens e os componentes base, depois a casca (navegação, rotas, redirects) e por fim cada tela. As telas reaproveitam os hooks e as queries do PR 4 e mudam só a apresentação. Três cálculos novos entram como funções puras com teste. A skill Hallmark (`redesign`, profundidade full, escopo app) rege o sistema e a checagem de cada tela.

**Tech Stack:** Next.js 16.4 (App Router, `src/proxy.ts`), React 19.3, Tailwind 4, shadcn sobre Base UI, framer-motion, zustand, TanStack Query, Vitest e Testing Library, Supabase CLI local.

**Spec:** `docs/superpowers/specs/2026-11-16-redesign-identidade-design.md` (é obrigatório ler, especialmente as seções 8 e 8.10). Mockups: `docs/superpowers/specs/assets/2026-11-16-redesign/home.html` e `paginas.html`. Abra-os no navegador e siga-os com fidelidade.

## Global Constraints

- **Next 16:** AGENTS.md exige ler o guia relevante em `node_modules/next/dist/docs/` antes de escrever código (redirects, rotas, `useSearchParams`).
- **Só tema escuro:**
  - remover `.light`, o toggle de tema e o `next-themes`;
  - o `sonner` usa `theme="dark"` fixo.
- **Tokens:** os valores exatos da spec §8.1. Nenhuma cor nem `font-family` literal fora do bloco de tokens (Hallmark Floor 1).
- **Fontes:**
  - Fraunces 600/700 com `font-variation-settings: "SOFT" 50` em títulos, nome do bebê e números de destaque, sempre com `tabular-nums`;
  - Nunito no resto, com corpo de 16px ou mais.
- **Copy:** PT-BR, rótulos em caixa normal, sem "eyebrow".
  - Não usar `·` para juntar metadados nem emoji como ícone.
  - Não usar seta colada ao texto do link: a seta é um ícone separado.
- **Hallmark Floor:**
  - nunca `transition: all`;
  - animar só `transform` e `opacity`;
  - todo controle tem `:focus-visible` imediato;
  - toda animação tem alternativa para `prefers-reduced-motion`;
  - nada de card dentro de card;
  - alvo de toque de 44px ou mais.
- **Preservar o comportamento:** não mudar a lógica de hooks, queries, APIs nem o banco.
  - As chaves do zustand `soninho-timer` e `soninho-feeding-timer` e as versões de persist não mudam.
  - `name`, `id`, `data-testid` e `aria-*` lidos por testes continuam.
- **Testes:**
  - os testes de comportamento não podem ser editados para passar, só os snapshots;
  - snapshots são regravados (`npx vitest run -u <arquivo>`) só no commit da tela correspondente, com o diff conferido.
- **Gates de cada tarefa:** `npm run lint` com 0 problemas, `npx tsc --noEmit`, `npm test` e, nas tarefas de tela, `npm run build`.
- **Commits:** em português, no estilo `feat(redesign): …`, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Estados por região de dados (spec §8.9):**
  - carregando: skeleton com a forma do conteúdo;
  - vazio: o que vai ali e a ação que preenche;
  - erro: só onde a tela já tem lógica de erro hoje; as demais ficam listadas no PR para o dono.
- **Produção:** nunca usar produção nem dados reais para desenvolver ou capturar telas. O ambiente local usa só dados fictícios.

## Review Focus

1. **Timer em andamento durante o deploy:** um sono iniciado na versão antiga e salvo em `localStorage` (`soninho-timer`) precisa aparecer rodando na home nova. Teste na Tarefa 7.
2. **A babá pelas rotas novas:** `/more/family`, `/more/ai`, `/history` e `/more/babies` digitadas na URL redirecionam para `/app`. `/more` só lista Perfil. Teste na Tarefa 4.
3. **Links antigos:** `/settings`, `/settings?tab=notifications`, `/settings?tab=tools` e `/ai-insights` levam à tela nova equivalente, sem 404. Teste na Tarefa 4.
4. **Bebê novo, sem histórico:**
   - a home não mostra estimativa de despertar;
   - Registro mostra o estado vazio, não "Dentro do esperado" com 0h;
   - Análise mostra o vazio, não números zerados.

   Testes nas Tarefas 5, 7 e 9.
5. **Vários bebês:** trocar de bebê no topo da home atualiza previsão, card "Hoje" e Comida, e o avatar sem foto mostra a inicial do bebê certo. Teste na Tarefa 2 (avatar) e na Tarefa 7 (troca).

---

## Mapa de arquivos

- `src/app/globals.css`: tokens novos, sem tema claro, com o carimbo Hallmark no topo.
- `src/components/brand/`:
  - `icons/` (ícones de linha);
  - `illustrations/MoonOrbit.tsx` e `SunOrbit.tsx`;
  - `SoninhoLogoMark.tsx`, restilizado.
- `src/components/ui/`:
  - restilizar: `button.tsx`, `card.tsx`, `sheet.tsx`, `skeleton.tsx`, `sonner.tsx`;
  - criar: `segmented-control.tsx`, `status-pill.tsx`, `chip.tsx`, `list-row.tsx`, `page-title.tsx`, `big-number.tsx`, `progress-track.tsx`, `ring.tsx`, `detail-header.tsx`.
- `src/components/layout/`: `navLinks.ts`, `BottomNav.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `MiniTimerBar.tsx`, `NannyRouteGuard.tsx` e `nannyAccess.ts` (novo).
- `src/components/home/` (novo):
  - `NextSleepCard.tsx`, `WakeWindowCard.tsx`, `StartSleepControls.tsx`, `SleepingCard.tsx`, `TodayCard.tsx`;
  - `WhyThisTimeSheet.tsx`, `NannyNotesCard.tsx`, `RegressionNotice.tsx`.
- `src/lib/sleep/`: `wakeEstimate.ts`, `dayStatus.ts` (novos, com testes).
- `src/lib/feeding/`: `suggestionExplanation.ts` (novo, com teste).
- `src/app/(dashboard)/`:
  - `app`, `feeding`, `history` e `analytics/` (com as subrotas `numbers`, `trends`, `environment`, `naps`, `quality` e `regression`);
  - `more/` (com `ai`, `ai/chat`, `babies`, `family`, `notifications`, `reports` e `profile`);
  - remover `settings/` e `ai-insights/`, que viram redirects.
- `next.config.ts`: `redirects()`.
- `supabase/seed.sql`: dados fictícios, só para o banco local.

---

### Task 1: Ambiente local com dados fictícios e registro "antes"

**Files:**
- Create: `supabase/seed.sql`
- Create: `docs/CONTRIBUTING-DB.md`, seção "Rodar o app localmente com dados fictícios" (o arquivo já existe: acrescentar a seção)
- Local, sem commit: `.env.local`, `.hallmark/`

- [ ] **Step 1:** `npx supabase start`. Copiar a URL e a chave anon local para `.env.local` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, mais as que o `.env.example` pede, com valores fictícios e as chaves de IA vazias).
- [ ] **Step 2: escrever `supabase/seed.sql`.**
  - Um usuário de auth `teste@soninho.local` com senha `soninho-local`, via `auth.users` e `auth.identities`, no padrão do Supabase local.
  - Uma bebê fictícia "Lua", nascida há 9 meses, numa família com esse usuário como owner.
  - 21 dias de sono: uma noite de ~19:10 a ~06:05 com 0 a 2 despertares, 2 a 3 sonecas por dia, sem sessão em andamento.
  - Mamadeiras a cada ~3h, de 150 a 200 ml, mais algumas mamadas no peito.
  - Gerar com `generate_series` e uma aleatoriedade determinística (`setseed(0.42)`).
  - Um segundo usuário `baba@soninho.local`, membro da família com `nanny_mode = true`.
  - Seguir o schema de `supabase/migrations/`, sem inventar colunas.
- [ ] **Step 3:** `npx supabase db reset` (local) e conferir: `select count(*) from sleep_sessions;` deve dar mais de 60.
- [ ] **Step 4:** `npm run dev`, entrar como `teste@soninho.local` e confirmar que `/app`, `/feeding`, `/history`, `/analytics`, `/ai-insights` e `/settings` carregam com dados.
- [ ] **Step 5: registro "antes" da Hallmark.** Ver o comando abaixo. Se o sloplint não conseguir autenticar, salvar os cookies de sessão do navegador headless conforme `scripts/capture.mjs --help` e anotar o método usado no `CONTRIBUTING-DB.md`.

```bash
node ~/.claude/skills/hallmark/scripts/sloplint.mjs src/app --scope app --render --before \
  --url http://localhost:3000/app --url http://localhost:3000/feeding --url http://localhost:3000/history \
  --url http://localhost:3000/analytics --url http://localhost:3000/settings --url http://localhost:3000/ai-insights
```

- [ ] **Step 6:** commit de `supabase/seed.sql` e `docs/CONTRIBUTING-DB.md` (`chore(dev): seed local com dados fictícios`). Antes, conferir que `.env.local` e `.hallmark/` não entram no `git status`; `.hallmark/` vai para `.git/info/exclude`.

### Task 2: Tokens, só escuro, marca e avatar

**Files:**
- Modify: `src/app/globals.css`, `src/components/ui/sonner.tsx`, `package.json` (remover `next-themes` se não sobrar uso)
- Create: `src/components/brand/illustrations/MoonOrbit.tsx`, `SunOrbit.tsx`, `src/components/brand/icons/index.tsx`
- Modify: `src/components/brand/SoninhoLogoMark.tsx`, `src/components/baby/BabyAvatar.tsx`, `src/components/settings/BabyProfileForm.tsx`
- Test: `src/components/baby/BabyAvatar.test.tsx` (novo), `src/components/brand/illustrations/illustrations.test.tsx` (novo)

**Interfaces:**
- **Produz tokens CSS** em `:root`:
  - `--sn-bg`, `--sn-bg-glow`, `--sn-s1`, `--sn-s2`, `--sn-bd`, `--sn-tx`, `--sn-mu`;
  - `--sn-pr`, `--sn-pr-ink`, `--sn-ok`, `--sn-warn`, `--sn-sun`, `--sn-night`.

  Os tokens do shadcn (`--background`, `--card`, `--primary`, `--muted-foreground`, `--border`, `--ring`, `--chart-*` etc.) passam a apontar para eles.
- **Produz utilitários Tailwind** via `@theme inline`:
  - cores: `bg-sn-s1`, `text-sn-mu`, `text-sn-pr`, `bg-sn-pr`, `text-sn-pr-ink`, `text-sn-ok`, `text-sn-warn`, `text-sn-sun`, `bg-sn-night`;
  - fonte `font-display` (Fraunces SOFT 50).
- **Produz componentes:**
  - `MoonOrbit({ className?: string; size?: number })` e `SunOrbit({ className?: string; size?: number })`: SVG decorativo com `aria-hidden`;
  - `Icon*` em `brand/icons`: `IconHome`, `IconBottle`, `IconList`, `IconChart`, `IconMore`, `IconMoon`, `IconSun`, `IconPlay`, `IconStop`, `IconClock`, `IconChevronRight`, `IconChevronLeft`, `IconSpark`, `IconPlus`, `IconPen`, `IconChat`, `IconUsers`, `IconBell`, `IconGear`, `IconDoc`, `IconBaby`. Cada um com `({ size?: number; className?: string })`, traço 1.8, `currentColor` e `aria-hidden`, com o desenho dos sprites dos mockups;
  - `BabyAvatar({ avatarUrl?: string | null; name?: string; size?: "sm" | "md" | "lg" })`. A prop `emoji` é removida.

- [ ] **Step 1: escrever o teste com falha** `BabyAvatar.test.tsx`:
  - `render(<BabyAvatar name="Lua" />)` mostra o texto "L" e tem `aria-label` "Lua";
  - com `avatarUrl="https://x.supabase.co/storage/v1/object/public/a.png"`, renderiza um `img` com `alt` "Lua";
  - com `name=""`, mostra o ícone da lua (sem texto);
  - nenhum emoji em nenhuma das saídas (`expect(container.textContent).not.toMatch(/\p{Extended_Pictographic}/u)`).
- [ ] **Step 2:** `npx vitest run src/components/baby/BabyAvatar.test.tsx` deve FALHAR.
- [ ] **Step 3: implementar o `BabyAvatar` novo.**
  - Com foto: mostra a foto.
  - Sem foto: a inicial em maiúscula, em `font-display`, sobre `bg-sn-pr` com `text-sn-pr-ink`.
  - Sem nome: `IconMoon` sobre `bg-sn-s1`.
  - Remover a prop `emoji` de todos os call sites (`grep -rn "emoji=" src`).
  - Remover o seletor de emoji do `BabyProfileForm`, mas o tipo e a coluna `avatar_emoji` continuam (o form não envia mudança nela).
- [ ] **Step 4: reescrever os tokens em `globals.css`.**
  - O carimbo Hallmark vem primeiro: rodar `node ~/.claude/skills/hallmark/scripts/theme.mjs scaffold --brand --redesign full --scope app` e preencher os campos. As linhas `waive` usam o motivo "aprovado pelo autor no mockup" (spec §8.10).
  - Remover o bloco `.light`, as classes `.glass-light`, `.lp-*` não usadas no app logado (confirmar com grep; a landing usa algumas, e essas ficam) e as cores índigo antigas.
  - `html, body { overflow-x: clip }`.
  - O brilho radial do fundo vai no `body`.
- [ ] **Step 5: `sonner.tsx`** com `theme="dark"` fixo. Se `grep -rn next-themes src` der vazio, `npm uninstall next-themes`.
- [ ] **Step 6: ilustrações e ícones.**
  - `MoonOrbit` e `SunOrbit` seguem o SVG do mockup (`art-moon` e `art-sun`), com as cores vindas de tokens (`text-sn-pr` e `text-sn-sun`).
  - Animação de leve flutuação via `transform`, desligada em `motion-reduce:`.
  - Teste de `illustrations.test.tsx`: as duas renderizam um `svg` com `aria-hidden="true"`.
- [ ] **Step 7:** `npm test`, `npm run lint` e `npx tsc --noEmit` passando. Regravar só os snapshots que mudaram pelo avatar (`FamilySettings` e `settings/page`, se for o caso), conferindo o diff.
- [ ] **Step 8:** commit `feat(redesign): tokens escuros, ilustrações lua/sol e avatar sem emoji`.

### Task 3: Componentes base

**Files:**
- Modify: `src/components/ui/button.tsx`, `card.tsx`, `sheet.tsx`, `skeleton.tsx`, `badge.tsx`
- Create: `src/components/ui/segmented-control.tsx`, `status-pill.tsx`, `chip.tsx`, `list-row.tsx`, `page-title.tsx`, `big-number.tsx`, `progress-track.tsx`, `ring.tsx`, `detail-header.tsx`
- Test: `src/components/ui/segmented-control.test.tsx`, `progress-track.test.tsx`, `list-row.test.tsx`

**Interfaces (Produz):**
- **`Button`:** variantes `primary` (lavanda cheio, 56px, pílula, texto `sn-pr-ink`), `secondary` (contorno lavanda), `ghost` (texto lavanda) e `icon`.
  - Os nomes antigos (`default`, `outline`, `secondary`, `ghost`, `destructive`, `link`) são mapeados para as novas, para não quebrar call sites.
  - Os oito estados da Hallmark.
- **`Card`:** raio 24, borda `sn-bd` de 1px, fundo `sn-s1/72%`.
- **`SegmentedControl<T extends string>`**
  ```ts
  {
    value: T;
    onChange: (v: T) => void;
    options: { value: T; label: string; icon?: ReactNode }[];
    size?: "md" | "sm";
    "aria-label": string;
  }
  ```
  - `role="radiogroup"`, cada opção com `role="radio"` e `aria-checked`;
  - setas esquerda e direita movem a seleção.
- **`StatusPill`:** `{ tone: "ok" | "attention" | "alert"; children }`.
- **`Chip`:** `{ selected?: boolean; onClick?; children }`; quando clicável, é um `button` com `aria-pressed`.
- **`ListRow`:** `{ icon?: ReactNode; title: string; subtitle?: string; value?: ReactNode; href?: string; onClick?: () => void }`.
  - Renderiza um `Link` com `href`, um `button` com `onClick`, ou senão um `div`.
  - Com `href` e sem `value`, mostra `IconChevronRight` à direita.
- **`PageTitle`:** `{ children; action?: ReactNode }`. É o h1 em Fraunces de 28px.
- **`DetailHeader`:** `{ title: string; backHref: string }`. Um botão voltar (`aria-label="Voltar"`) mais o h1.
- **`BigNumber`:** `{ children; size?: "xl" | "lg" | "md" }`, com 60, 32 e 22px, Fraunces e `tabular-nums`.
- **`ProgressTrack`:** `{ value: number; marker?: number; tone?: "ok" | "attention" | "alert"; label: string }`.
  - `value` e `marker` vão de 0 a 1, com clamp.
  - `role="progressbar"` com `aria-valuenow` em porcentagem inteira.
  - O preenchimento usa `transform: scaleX`, não `width`.
- **`Ring`:** `{ progress: number; size?: number; children }`. Anel com conic-gradient de `sn-pr` sobre `sn-s2`.

- [ ] **Step 1: escrever os testes com falha.**
  - `segmented-control.test.tsx`:
    - clicar em "Noturno" chama `onChange("NIGHT_SLEEP")`;
    - `ArrowRight` na opção ativa chama `onChange` com a próxima;
    - a opção ativa tem `aria-checked="true"`.
  - `progress-track.test.tsx`: `value={1.4}` dá `aria-valuenow="100"`; `value={-1}` dá `"0"`; `value={0.72}` dá `"72"`.
  - `list-row.test.tsx`:
    - com `href="/more/family"`, renderiza um link com esse href e o título;
    - com `value="40 min"`, não mostra a seta (`queryByTestId("list-row-chevron")` é null).
- [ ] **Step 2:** `npx vitest run src/components/ui` deve FALHAR nos novos.
- [ ] **Step 3:** implementar os componentes conforme a interface e o visual dos mockups (CSS das classes `.seg`, `.pill`, `.chip`, `.list`, `.bar`, `.ring`, `.cta` de `home.html`, traduzido para Tailwind com os tokens).
- [ ] **Step 4:** `npm test`. Os snapshots que mudarem pelo `Button` ou pelo `Card` são regravados aqui, com o diff conferido (é só a classe).
- [ ] **Step 5:** `npm run lint` e `npx tsc --noEmit`.
- [ ] **Step 6:** commit `feat(redesign): componentes base do sistema`.

### Task 4: Casca, navegação, rotas do Mais e modo babá

**Files:**
- Modify: `src/components/layout/navLinks.ts`, `BottomNav.tsx`, `Sidebar.tsx`, `TopBar.tsx`, `MiniTimerBar.tsx`, `NannyRouteGuard.tsx`, `src/app/(dashboard)/layout.tsx`, `next.config.ts`
- Create: `src/components/layout/nannyAccess.ts`, `src/components/layout/nannyAccess.test.ts`, `src/components/layout/navLinks.test.ts`, `src/lib/redirects.test.ts` (testa a função exportada usada no `next.config.ts`)
- Create: `src/lib/redirects.ts`

**Interfaces:**
- **Produz:**
  - `ALL_NAV_LINKS`, com 5 itens: `/app` Início, `/feeding` Comida, `/history` Registro, `/analytics` Análise e `/more` Mais, com os ícones `brand/icons`;
  - `getNavLinks(nannyMode: boolean): NavLink[]`, que para a babá devolve `/app` e `/more`;
  - `isNannyAllowed(pathname: string): boolean`, que só permite exatamente `/app`, `/more` e `/more/profile`;
  - `legacyRedirects(): { source: string; destination: string; permanent: boolean; has?: {type:"query";key:string;value:string}[] }[]`.

- [ ] **Step 1: escrever os testes com falha.**
  - **`navLinks.test.ts`:**
    - `getNavLinks(false).map(l=>l.href)` é igual a `["/app","/feeding","/history","/analytics","/more"]`;
    - os rótulos são `["Início","Comida","Registro","Análise","Mais"]`;
    - `getNavLinks(true)` dá `["/app","/more"]`.
  - **`nannyAccess.test.ts`:**
    - verdadeiro: `/app`, `/more` e `/more/profile`;
    - falso: `/more/family`, `/more/ai`, `/more/ai/chat`, `/more/babies`, `/history`, `/analytics/naps`, `/feeding` e `/more/profile/../family`.
  - **`redirects.test.ts`**, onde `legacyRedirects()` contém:
    - `/settings` com `has` `tab=notifications` → `/more/notifications`;
    - `tab=tools` → `/more/reports`;
    - `tab=general` → `/more`;
    - `/settings` sem query → `/more`;
    - `/ai-insights` → `/more/ai`.

    Todas com `permanent: false`, e as regras com `has` vêm antes da regra sem query.
- [ ] **Step 2:** rodar os três testes, que devem FALHAR.
- [ ] **Step 3: implementar.**
  - Ler antes `node_modules/next/dist/docs/` sobre `redirects` em `next.config` (chaves e ordem). O `next.config.ts` faz `redirects: async () => legacyRedirects()`.
  - `NannyRouteGuard` passa a usar `isNannyAllowed`.
- [ ] **Step 4: visual.**
  - **`BottomNav`:** ícones de 26px, rótulo de 13px, item ativo em `text-sn-pr` com uma barra de 28×4px abaixo, `aria-current="page"`, `env(safe-area-inset-bottom)`. Ativo quando `pathname === href || pathname.startsWith(href + "/")`.
  - **`Sidebar`:** desktop (`md:`), com os mesmos 5 itens e o mesmo estilo, mais a marca no topo.
  - **`TopBar`:** some nas telas que já têm `PageTitle`. Na home, a marca e o relógio ficam dentro da própria página (Tarefa 7), então no mobile o `TopBar` vira só o seletor de bebê, se ainda for usado; confira os usos e remova o que ficar órfão.
  - **Container do layout:** `max-w-[480px]`, centralizado, inclusive no desktop.
  - **`MiniTimerBar`:** estilo novo (`Card` compacto com tempo em `BigNumber md` e o botão "Acordou").
- [ ] **Step 5: criar `src/app/(dashboard)/more/page.tsx`** com um placeholder mínimo: `PageTitle` "Mais" e os `ListRow` dos 7 itens com os hrefs da spec §8.7. A versão completa vem na Tarefa 6.
  - A babá vê só "Perfil e preferências".
  - Apagar `settings/page.tsx` e `ai-insights/page.tsx` só na Tarefa 6, quando o conteúdo já tiver migrado. Até lá os redirects não ficam ativos: adicionar `legacyRedirects` ao `next.config.ts` só na Tarefa 6. Nesta tarefa, a função e o teste.
- [ ] **Step 6:** `npm test`, lint, tsc, build e conferência no navegador local (usuário normal e babá).
- [ ] **Step 7:** commit `feat(redesign): navegação de 5 abas, casca e acesso da babá`.

### Task 5: Cálculos novos (funções puras)

**Files:**
- Create: `src/lib/sleep/wakeEstimate.ts` e `.test.ts`, `src/lib/sleep/dayStatus.ts` e `.test.ts`, `src/lib/feeding/suggestionExplanation.ts` e `.test.ts`

**Interfaces:**
- **Consome:**
  - `getAgeSchedule` (`src/lib/sleep/schedules.ts`), que devolve `totalSleepHours`;
  - o tipo de retorno de `computeFeedingSuggestion` (`src/lib/feeding/computeFeedingSuggestion.ts`). Ler o arquivo para saber o campo que indica a fonte (histórico ou faixa da idade).
- **Produz:**
  - `estimateWakeTime(nights: { start: string; end: string }[], now: Date, timeZone: string): Date | null`;
  - `dayStatus(totalMinutes: number, targetHours: number): "within" | "below" | "above" | null`;
  - `DAY_STATUS_LABEL: Record<"within"|"below"|"above", string>`, com os rótulos "Dentro do esperado", "Abaixo do esperado" e "Acima do esperado";
  - `feedingExplanation(s: <tipo do computeFeedingSuggestion>): string`.

- [ ] **Step 1: escrever os testes com falha.**
  - **`estimateWakeTime`:**
    - com 2 noites → `null`;
    - com 3 noites terminando 06:00, 06:20 e 06:10 no fuso `America/Sao_Paulo` → 06:10 do próximo dia;
    - com noites terminando 23:50 e 00:10 → média circular (00:00), não 12:00;
    - noites com `end` nulo são ignoradas.
  - **`dayStatus`:**
    - `dayStatus(0, 14)` → `null`, porque dia sem registro não tem status;
    - `dayStatus(13*60+1, 14)` → `"within"`;
    - `dayStatus(12*60+59, 14)` → `"below"`;
    - `dayStatus(15*60+1, 14)` → `"above"`;
    - os limites são inclusivos: `13*60` é `"within"` e `15*60` é `"within"`.
  - **`feedingExplanation`:**
    - com a fonte histórico → "Pelo intervalo das últimas mamadas";
    - com a fonte idade → "Pela faixa esperada para a idade";
    - nunca contém `·`.
- [ ] **Step 2:** `npx vitest run src/lib/sleep/wakeEstimate.test.ts src/lib/sleep/dayStatus.test.ts src/lib/feeding/suggestionExplanation.test.ts` deve FALHAR.
- [ ] **Step 3: implementar.**
  - `estimateWakeTime`: média circular dos minutos do dia (sen/cos), usando as últimas 7 noites com fim; devolve a próxima ocorrência desse horário depois de `now`.
  - `dayStatus`: tolerância de 60 min.
- [ ] **Step 4:** rodar de novo, que deve PASSAR. Depois `npm test`.
- [ ] **Step 5:** commit `feat(sleep): estimativa de despertar, status do dia e texto da próxima mamada`.

### Task 6: Mais e telas de detalhe

**Files:**
- Create: `src/app/(dashboard)/more/page.tsx` (completo), `more/ai/page.tsx`, `more/ai/chat/page.tsx`, `more/babies/page.tsx`, `more/family/page.tsx`, `more/notifications/page.tsx`, `more/reports/page.tsx`, `more/profile/page.tsx`
- Modify: `src/components/settings/*` (só apresentação: `Card`, `Button` e `ListRow` novos; tirar as abas), `src/components/ai/AIChat.tsx`, `src/components/family/FamilyNoteCard.tsx` (estilo)
- Delete: `src/app/(dashboard)/settings/page.tsx`, `src/app/(dashboard)/ai-insights/page.tsx`. O teste `settings/page.test.tsx` vira `more/page.test.tsx`, cobrindo o mesmo comportamento: as seções ainda renderizam com os mesmos hooks.
- Modify: `next.config.ts` (ativar `legacyRedirects`)

**Interfaces:**
- **Consome:**
  - `DetailHeader`, `ListRow`, `PageTitle` e `Card` (Tarefa 3);
  - `legacyRedirects` e `isNannyAllowed` (Tarefa 4);
  - os hooks `src/hooks/settings/*`, `useAISuggestions` e `AIChat`.

- [ ] **Step 1: `/more`** igual ao mockup "Mais".
  - Grupos Assistente, Casa e Conta.
  - Os subtítulos usam dados reais: o nome dos bebês em "Bebês" e o nome do bebê ativo em "Converse sobre o sono de {nome}".
  - A babá vê só o grupo Conta, com "Perfil e preferências".
- [ ] **Step 2: telas de detalhe.** Cada uma usa `DetailHeader` com `backHref` `/more` (as da IA voltam para `/more`) e o conteúdo:
  - **`babies`:** a parte de bebês do `GeneralTab` (lista, adicionar, editar, foto e excluir);
  - **`family`:** `FamilySettings` mais o mural `FamilyNoteCard`;
  - **`notifications`:** `NotificationsTab` com `useNotificationSettings`;
  - **`reports`:** `ToolsTab` com `useSleepExport`, mais o botão de PDF que hoje está em `/history` (mover o handler sem alterar a lógica);
  - **`profile`:** `UserProfileSettings`, o modo babá e "Sair";
  - **`ai`:** as abas Hoje, Padrões e Recomendações, como `SegmentedControl` (sm);
  - **`ai/chat`:** `AIChat` em tela cheia.

  Em todas, os `CardTitle` com ícone lucide viram título simples, e a lista de bebês usa `ListRow`.
- [ ] **Step 3:** mover `settings/page.test.tsx` para `more/` e adaptar para renderizar as subpáginas. As asserções de comportamento continuam iguais, só muda o caminho de import. Depois regravar o snapshot.
- [ ] **Step 4:** apagar `settings/page.tsx` e `ai-insights/page.tsx` e ativar `redirects: async () => legacyRedirects()` no `next.config.ts`.
- [ ] **Step 5:** `npm run build` e conferência local:
  - `/settings?tab=tools` cai em `/more/reports`;
  - a babá em `/more/family` vai para `/app`.
- [ ] **Step 6:** Hallmark em `/more` e nas 7 subrotas. Ver o comando abaixo. Corrigir todo FAIL. Os Reflex que vierem de algo aprovado no mockup são waivers no carimbo.

```bash
node ~/.claude/skills/hallmark/scripts/sloplint.mjs src/app --scope app --render \
  --url http://localhost:3000/more --url http://localhost:3000/more/family --url http://localhost:3000/more/profile
```

- [ ] **Step 7:** `npm test`, lint e tsc. Commit `feat(redesign): Mais e telas de detalhe; settings e ai-insights redirecionam`.

### Task 7: Home

**Files:**
- Modify: `src/app/(dashboard)/app/page.tsx`, `src/components/sleep/SleepTimer.tsx` e `src/components/sleep/timer/*` (só apresentação), `src/components/sleep/PostSleepReview.tsx` (estilo)
- Create: `src/components/home/NextSleepCard.tsx`, `WakeWindowCard.tsx`, `StartSleepControls.tsx`, `SleepingCard.tsx`, `TodayCard.tsx`, `WhyThisTimeSheet.tsx`, `NannyNotesCard.tsx`, `RegressionNotice.tsx`
- Test: `src/components/home/home.test.tsx` (novo); manter e regravar `src/components/sleep/timer/SleepTimer.test.tsx`

**Interfaces:**
- **Consome:**
  - `useSleepTimer`, `useWakeWindow`, `useAISuggestions`, `useBackdate`, `useTodaySessions`, `useFeedingTimeline` e a detecção de regressão de `src/lib/sleep/regression.ts` (como o `RegressionRadar` a usa hoje);
  - `estimateWakeTime` (Tarefa 5);
  - `SegmentedControl`, `Button`, `Ring`, `ProgressTrack`, `StatusPill`, `BigNumber`, `Chip` e `ListRow` (Tarefa 3);
  - `MoonOrbit` e `SunOrbit` (Tarefa 2).
- **Responsabilidades:**
  - `SleepTimer` continua dono do estado. Ele decide entre os estados acordado (`NextSleepCard`, `WakeWindowCard`, `StartSleepControls`) e dormindo (`SleepingCard`), e abre o `PostSleepReview` como hoje.
  - `TimerRing`, `NextSleepSuggestions` e `TimerDisplay` antigos saem; o `AdvancedControls` sai, e o conteúdo dele vai para os chips de ambiente e "Anotar algo".

- [ ] **Step 1: escrever os testes com falha** `home.test.tsx`, com os mocks de hooks no padrão de `SleepTimer.test.tsx`.
  - **Acordado com sugestão `kind: "NIGHT_SLEEP"`:** mostra "Sono noturno", o horário, "Por que esse horário?" e o botão "Iniciar sono noturno".
  - **Com `kind: "NAP"`:** mostra "Soneca" e "Iniciar soneca", e a ilustração é o sol (`data-testid="art-sun"`).
  - **Clicar em "Iniciar sono noturno":** chama `handleStart`.
  - **`isRunning: true`:** mostra "em andamento", o tempo decorrido e o botão "Acordou"; clicar nele chama `handleStop`.
  - **Timer persistido:** com `localStorage["soninho-timer"]` preenchido no formato v1 atual (copiar a forma de `src/store/sleepStore.ts`) e o store reidratado, a home mostra o estado dormindo (Review Focus 1).
  - **Menos de 3 noites:** "Estimativa de despertar" não aparece (Review Focus 4).
  - **Babá:**
    - `NannyNotesCard` com o último recado e "Ver todos";
    - sem "Ver registro";
    - sem "Por que esse horário?" e sem o card de janela (como hoje, a babá não vê os insights).
  - **Troca de bebê:** trocar `activeBaby` re-renderiza com o nome novo e os dados novos (Review Focus 5).
- [ ] **Step 2:** `npx vitest run src/components/home` deve FALHAR.
- [ ] **Step 3: implementar a home** exatamente como `home.html`.
  - Marca e relógio no topo (o relógio usa `useNow`).
  - `BabyAvatar` mais nome e idade mais a seta. A seta abre o seletor de bebê atual (reaproveitar o que o `TopBar` usava).
  - **`NextSleepCard`:**
    - rótulo "Previsão de sono", tipo, `BigNumber xl` com o horário e "Em cerca de X min";
    - ilustração `MoonOrbit` para noturno ou `SunOrbit` para soneca;
    - "Por que esse horário?" abre o `WhyThisTimeSheet` (`Sheet`), com o conteúdo e o feedback 👍/👎 que hoje estão no `AISuggestionCard`. Os botões de feedback viram ícones de linha com `aria-label` "Útil" e "Não útil", sem emoji.
  - **`WakeWindowCard`:**
    - "Tempo acordada", `BigNumber lg` e `StatusPill`;
    - pílula `ok` "Na janela ideal" para `status` ideal, `attention` "Quase na hora" e `alert` "Passou da janela"; mapear a partir dos valores reais de `useWakeWindow`;
    - `ProgressTrack` com o marcador no início da janela;
    - "Janela de vigília: Xh a Yh".
  - **`StartSleepControls`:**
    - `SegmentedControl` Soneca/Noturno com `IconSun` e `IconMoon`;
    - `Button primary` com `IconPlay` e "Iniciar soneca" ou "Iniciar sono noturno";
    - "Começou antes?" (ghost com `IconClock`) abre os `BackdateStartChips`.
  - **`SleepingCard`:**
    - "Sono noturno em andamento" ou "Soneca em andamento";
    - `Ring` com o tempo e "Desde HH:MM";
    - chips de temperatura, TOG e "Ambiente" (abre o `EnvironmentPicker`);
    - `Button secondary` com `IconStop` e "Acordou";
    - "Anotar algo" abre o `SleepNotes`.
  - **`TodayCard`:**
    - acordado: "Último sono" e "Última mamada";
    - dormindo: "Estimativa de despertar", só se `estimateWakeTime` não for null, e "Última mamada";
    - link "Ver registro" (escondido para a babá).
  - **`RegressionNotice`:** só quando há regressão detectada. É um card âmbar compacto com link para `/analytics/regression`.
  - **Remoções da home:** `FamilyActivityFeed` sai da página, mas `useFamilyActivityToasts` continua. `AISuggestionCard`, `RegressionRadar` e `SleepTimeline` saem da home sem apagar os arquivos, que são reaproveitados nas Tarefas 9 e 10. Os que ficarem órfãos são apagados na Tarefa 11.
  - **Estado sem bebê:** a ação leva para `/more/babies`.
- [ ] **Step 4:** `npx vitest run src/components/home src/components/sleep` deve PASSAR. Regravar o snapshot do `SleepTimer` e conferir.
- [ ] **Step 5:** Hallmark `sloplint --scope app --render --url http://localhost:3000/app`, com um sono rodando e sem sono rodando. Também a finish review da Hallmark em contexto novo (`gates.md` §6), com os screenshots antes e depois. Corrigir.
- [ ] **Step 6:** `npm test`, lint, tsc e build. Commit `feat(redesign): home nova (acordado, soneca, dormindo)`.

### Task 8: Comida

**Files:**
- Modify: `src/app/(dashboard)/feeding/page.tsx`, `src/components/feeding/BottleQuickLog.tsx`, `BreastfeedingTimer.tsx`, `SolidFeedingLog.tsx`, `FeedingSuggestionCard.tsx`, `FeedingTimeline.tsx`, `FeedingForm.tsx` (só apresentação)
- Test: `src/components/feeding/feeding.test.tsx` (novo); regravar `FeedingForm` e os snapshots da pasta

**Interfaces:**
- **Consome:** `feedingExplanation` (Tarefa 5), `SegmentedControl`, `Chip`, `Button`, `ListRow`, `BigNumber` e `PageTitle`.

- [ ] **Step 1: escrever os testes com falha.**
  - Na aba Mamadeira, "+" aumenta 10 ml e "−" diminui 10 ml, com mínimo 0. Os botões têm `aria-label` "Aumentar 10 ml" e "Diminuir 10 ml". "Registrar mamadeira" chama o mesmo handler de hoje com o valor.
  - Na aba Peito, tocar em "Direito" com o lado esquerdo ativo troca o lado (`aria-pressed`). "Terminar mamada" chama o stop atual.
  - A lista "Hoje" mostra o total em ml somado das mamadeiras do dia.
- [ ] **Step 2:** os testes devem FALHAR.
- [ ] **Step 3: implementar** como `paginas.html`.
  - `PageTitle` "Comida".
  - Card "Próxima mamada" com `BigNumber` e `feedingExplanation`.
  - `SegmentedControl` sm Mamadeira/Peito/Sólidos (substitui as `Tabs`). A aba persiste em `?tipo=` na URL, conforme `flow.md` § App screens, "state in the URL".
  - Stepper, `Chip` de tipo de leite e `Button primary`.
  - Os dois lados do peito como botões grandes.
  - Sólidos com `Chip` de `foodTags` e reação.
  - "Registrar mamada passada" (ghost com `IconPen`) abre o `FeedingForm`.
  - Lista "Hoje" com `ListRow`; tocar num item edita.
- [ ] **Step 4:** testes passando e snapshots regravados com o diff conferido. Hallmark `--url http://localhost:3000/feeding`.
- [ ] **Step 5:** lint, tsc e build. Commit `feat(redesign): Comida`.

### Task 9: Registro

**Files:**
- Modify: `src/app/(dashboard)/history/page.tsx`, `src/components/sleep/SleepCard.tsx`, `SleepForm.tsx`, `SleepTimeline.tsx` (vira a faixa de blocos do dia)
- Create: `src/components/history/WeekStrip.tsx`, `DaySummaryCard.tsx`
- Test: `src/components/history/history.test.tsx`

**Interfaces:**
- **Consome:** `dayStatus` e `DAY_STATUS_LABEL` (Tarefa 5), `getAgeSchedule`, `Chip`, `StatusPill`, `ListRow`, `Button` e `PageTitle`; as queries de `src/lib/supabase/queries/sleep.ts` já usadas pela página e `sessionDayAllocation` para o total do dia.
- **Produz:** `WeekStrip({ selected: Date; onSelect: (d: Date) => void; timeZone: string })`.

- [ ] **Step 1: escrever os testes com falha.**
  - **`WeekStrip`:** mostra 7 dias terminando hoje, rotulado "hoje". Clicar num dia chama `onSelect` com aquela data. O dia selecionado tem `aria-current="date"`.
  - **Dia sem sonos:** mostra o estado vazio "Nenhum sono registrado neste dia" e o botão "Adicionar sono", sem `StatusPill` (Review Focus 4).
  - **Filtro "Sonecas":** a lista mostra só sessões `NAP`.
  - **Abrir para editar:** clicar num item abre o `SleepForm` com aquela sessão.
- [ ] **Step 2:** os testes devem FALHAR.
- [ ] **Step 3: implementar** como `paginas.html`.
  - `WeekStrip` com rolagem horizontal para os dias anteriores (até 30 dias).
  - O dia selecionado fica em `?dia=AAAA-MM-DD`.
  - `DaySummaryCard`: total, `StatusPill` e a faixa de blocos (noite em `sn-night`, sonecas em `sn-pr`), com as marcas 0h, 6h, 12h e 18h e "agora".
  - Chips Todos / Sonecas / Noite em `?tipo=`.
  - Lista com `ListRow`: o título é o tipo; o subtítulo traz o intervalo, como adormeceu e os despertares, separados por vírgula; o valor é a duração.
  - `Button secondary` "Adicionar sono".
  - O PDF já saiu daqui na Tarefa 6.
- [ ] **Step 4:** testes, snapshots e Hallmark `--url http://localhost:3000/history`.
- [ ] **Step 5:** lint, tsc e build. Commit `feat(redesign): Registro por dia`.

### Task 10: Análise e telas de detalhe

**Files:**
- Modify: `src/app/(dashboard)/analytics/page.tsx`, `src/components/charts/*` (cores por tokens), `src/components/sleep/RegressionRadar.tsx`, `src/components/ui/stat-tile.tsx`
- Create: `src/app/(dashboard)/analytics/numbers/page.tsx`, `trends/page.tsx`, `environment/page.tsx`, `naps/page.tsx`, `quality/page.tsx`, `regression/page.tsx`
- Create: `src/components/analytics/useAnalyticsData.ts`, que extrai a busca e o cálculo que hoje vivem dentro de `analytics/page.tsx` para as subpáginas reutilizarem, sem alterar o cálculo
- Test: `src/components/analytics/analytics.test.tsx`

**Interfaces:**
- **Produz:** `useAnalyticsData(period: 7 | 14 | 30)`, que devolve os mesmos valores que a página calcula hoje (`stats`, `chartData`, `trend` e `envCorrelation`), com nomes iguais aos atuais.
- **Consome:** `SegmentedControl`, `BigNumber`, `Card`, `ListRow`, `DetailHeader` e `StatusPill`.

- [ ] **Step 1: escrever os testes com falha.**
  - O período padrão é 7 e fica em `?periodo=`. Trocar para 30 chama `useAnalyticsData(30)`.
  - Mostra os rótulos "sono por dia", "sonecas por dia" e "maior noite" com os valores do hook.
  - Sem dados no período, mostra o estado vazio, não zeros (Review Focus 4).
  - Aviso de regressão só quando detectada.
  - Itens com `href`: `/analytics/numbers`, `/analytics/trends`, `/analytics/environment`, `/analytics/naps` e `/analytics/quality`.
- [ ] **Step 2:** os testes devem FALHAR.
- [ ] **Step 3: extrair `useAnalyticsData`.**
  - Mover o código sem mudar a lógica.
  - Rodar `npm test` antes de mexer no visual: tudo verde.
- [ ] **Step 4: tela principal** como `paginas.html`.
  - Gráfico "Sono por dia" com barras empilhadas, noite em `sn-night` e sonecas em `sn-pr`, mais a legenda. Reaproveitar o `SleepBarChart` com as cores por token.
- [ ] **Step 5: subpáginas**, todas com `DetailHeader` (`backHref` `/analytics`), herdando o período via `?periodo=`.
  - **`numbers`:** Sono 24h, Débito de sono, Média de soneca e Sonecas hoje (os `StatTile` atuais, restilizados).
  - **`trends`:** as três tendências.
  - **`environment`:** a tabela de correlação.
  - **`naps`:** `NapPatternHeatmap`.
  - **`quality`:** `SleepQualityTrend`.
  - **`regression`:** `RegressionRadar` completo.
- [ ] **Step 6:** Hallmark `--url` em `/analytics` e `/analytics/numbers`, lint, tsc e build. Commit `feat(redesign): Análise e telas de detalhe`.

### Task 11: Varredura final, limpeza e PR

**Files:** os que a varredura apontar.

- [ ] **Step 1: código órfão.**
  - Rodar `grep -rn` por componentes que ficaram sem import (`AISuggestionCard`, `FamilyActivityFeed`, `TimerRing`, `NextSleepSuggestions`, `TimerDisplay`, `AdvancedControls`, `page-header`, `section-card`, `tabs` e as classes antigas `.surface`, `.glass`, `.glow-*`, `.num-display` e `.shimmer-text`).
  - Apagar só o que não tem uso (inclusive na landing, que continua usando algumas classes; confira).
- [ ] **Step 2: Hallmark `--kept`** sobre todas as rotas. Ver o comando abaixo. Todo `FAIL kept` é restaurado ou registrado no carimbo com o motivo (ex.: `dropped /settings tabs · viraram rotas /more/*`).

```bash
node ~/.claude/skills/hallmark/scripts/sloplint.mjs src/app --scope app --render --kept \
  --url http://localhost:3000/app --url http://localhost:3000/feeding --url http://localhost:3000/history \
  --url http://localhost:3000/analytics --url http://localhost:3000/more
```

- [ ] **Step 3:** a finish review da Hallmark em contexto novo, com antes e depois (`.hallmark/compare.html`). Aplicar as correções e registrar o resultado no log (`theme.mjs log`).
- [ ] **Step 4: gates completos.**
  - Rodar `npm run lint && npx tsc --noEmit && npm test && npm run build`, tudo verde.
  - Conferir no navegador local, como owner e como babá:
    - os três estados da home;
    - mamada no peito iniciada e parada;
    - editar um sono em Registro;
    - os redirects antigos.
- [ ] **Step 5:** atualizar o README (seções de telas, se descreverem o visual antigo) e marcar a spec como implementada. Commit `chore(redesign): limpeza e documentação`.
- [ ] **Step 6:** push e PR "Fase 2 · PR 0 — Redesign da identidade visual". O corpo leva:
  - o resumo;
  - o handoff da Hallmark (antes e depois, waivers);
  - a lista de rotas novas e redirects;
  - a nota de que não há migration;
  - no fim, `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

  CI verde, merge e acompanhamento do deploy na Vercel.
