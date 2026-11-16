# Soninho — Redesign da identidade visual (design)

- **Data:** 2026-11-16
- **Autor:** engviniciusbs (com Claude)
- **Status:** implementado (branch `fase2/00-identidade`, Tarefas 1 a 11)
- **Mockups aprovados:**
  - `docs/superpowers/specs/assets/2026-11-16-redesign/home.html` (home: acordado com noturno a seguir, acordado com soneca a seguir, dormindo)
  - `docs/superpowers/specs/assets/2026-11-16-redesign/paginas.html` (Comida, Comida/Peito, Registro, Análise, Mais)

## 1. Intenção e porquê

Antes da Fase 2 (evolução do produto), o autor quer trocar a identidade visual do Soninho por algo **mais limpo e com cara própria**. O visual atual usa um índigo genérico de template (`#818cf8` sobre `#080e1a`), mistura muita coisa na home e tem seis abas.

A referência é um mockup trazido pelo autor:
- azul-noite profundo com lavanda;
- lua com órbita pontilhada e estrelas;
- serif display pesada nos títulos e números;
- botões em pílula;
- menu inferior com ícones de linha.

O redesign usa a skill **Hallmark** (`redesign`, profundidade **full**, escopo **app**). O Soninho é um projeto de portfólio, então o resultado precisa parecer feito à mão, não gerado.

## 2. Objetivos

1. Um sistema visual único, **só escuro**, definido em tokens:
   - **cores:** azul-noite, lavanda Soninho, dourado só para o sol da soneca, menta só para "tudo certo" e âmbar só para alerta;
   - **tipografia:** Fraunces pesada (eixo SOFT) em títulos e números, Nunito no texto;
   - **raios e superfícies:** definidos nos tokens.
2. A home e as páginas recompostas exatamente como nos mockups aprovados.
3. Navegação com 5 abas: Início, Comida, Registro, Análise e Mais.
4. Toda a lógica, os hooks e os dados atuais preservados. Muda a apresentação e a composição, não o comportamento.

## 3. Não-objetivos

- Landing pública (`/`), login, cadastro e convite (`/invite/[token]`). Ficam para depois.
- Tema claro. Ele é removido, e o app passa a ser só escuro.
- Features novas da Fase 2: fraldas, sons, crescimento e outras.
- Mudanças em APIs, banco ou regras de negócio.
- E-mails (React Email) e o PDF do relatório.

## 4. Anti-objetivos

- **Perder uma função que existe hoje.** Toda ação e todo dado de hoje continua acessível, mesmo que mude de lugar. Exemplos:
  - ambiente e temperatura do sono;
  - início retroativo;
  - revisão pós-sono;
  - edição e exclusão de registros;
  - modo babá;
  - família, convites e papéis;
  - push, relatórios, CSV e PDF;
  - chat e resumos da IA;
  - sugestões de mamada;
  - radar de regressão;
  - correlação com o ambiente;
  - heatmap e qualidade.
- **Quebrar o uso diário** durante o deploy, inclusive o timer em andamento salvo no navegador.
- **Links ou rotas antigas quebrados.** Toda rota antiga redireciona para a nova.
- **Os vícios que a Hallmark proíbe** (o "Floor"):
  - rótulos em CAIXA ALTA espaçada e "eyebrows";
  - emoji como ícone;
  - metadados unidos por "·";
  - card dentro de card;
  - gradiente roxo-azul;
  - cor ou fonte literal fora dos tokens;
  - `transition: all`;
  - foco invisível;
  - animação sem alternativa para `prefers-reduced-motion`.
- **Inventar números** em qualquer tela (Floor 8). Tudo o que aparece vem dos dados.

## 5. Restrições

- **Plataforma:** Next.js 16.4, React 19.3, Tailwind 4, componentes shadcn sobre Base UI, framer-motion 14 e `next-themes` (hoje usado pelo `sonner`).
- **Fontes:** já carregadas por `next/font` (Fraunces e Nunito em `src/app/layout.tsx`).
- **Hallmark:**
  - seguir `~/.claude/skills/hallmark/SKILL.md`, `references/redesign.md` (full) e `flow.md` § App screens;
  - os tokens saem de `theme.mjs scaffold --brand --redesign full --scope app`, com os valores da seção 8.1;
  - o carimbo Hallmark vai no topo da CSS;
  - `sloplint --scope app --render` sem nenhum FAIL ao fim de cada tela;
  - log em `.hallmark/log.json`.
- **Qualidade:** testes de caracterização do PR 4. Os testes de comportamento continuam valendo. Os snapshots visuais mudam, como esperado, e são regravados conscientemente, um commit por tela, com o diff do snapshot revisado.
- **Gates:** lint 0, `tsc`, `npm test` e build. O CI tem que estar verde.

## 6. Estado atual (resumo)

- **Rotas** (`src/app/(dashboard)/`): `app` (home), `feeding`, `history`, `analytics`, `ai-insights` e `settings` (abas Geral, Notificações e Ferramentas).
- **Navegação:** `src/components/layout/navLinks.ts` (6 links), `BottomNav`, `Sidebar` (desktop), `TopBar` e `MiniTimerBar`.
- **Tokens:** `src/app/globals.css`, com índigo, tema claro e escuro e as classes utilitárias `surface`.
- **Componentes da home:**
  - `SleepTimer` (já dividido em `sleep/timer/*`);
  - `WakeWindowBadge`, `AISuggestionCard` e `RegressionRadar`;
  - `FamilyNoteCard` e `FamilyActivityFeed`;
  - `SleepTimeline`.

## 7. Abordagens consideradas

| | Abordagem | Trade-off | Decisão |
|---|---|---|---|
| **A** | Redesign completo com a Hallmark sobre a estrutura atual: tokens e componentes base primeiro, depois tela por tela, reaproveitando hooks e lógica, com rotas novas para "Mais" e redirects | Snapshots mudam (regravados por tela); risco baixo porque a lógica fica intacta | ✅ **Escolhida pelo autor** |
| B | Telas novas em rotas paralelas e troca no fim | Código duplicado por semanas e risco de divergência | Descartada |
| — | Só trocar tokens e manter os layouts | Não chega nos layouts aprovados | Descartada |

## 8. Design

### 8.1 Sistema visual (tokens)

Valores dos mockups aprovados, todos como tokens em `:root`, só escuro:

| Token | Valor | Uso |
|---|---|---|
| fundo | `#0D0F24`, com brilho radial `#181B42` no topo | página |
| superfície 1 | `#15183A` (cards: `rgba(21,24,58,.72)`) | cards, menu |
| superfície 2 | `#1F2350` | trilhas, chips, ícones de lista |
| borda | `#2C3168` | cards, separadores |
| texto | `#F4F2FF` | principal |
| texto suave | `#A3A0CC` | rótulos, legendas |
| lavanda (primária) | `#BCAEF7`, texto sobre ela `#16132F` | ação principal, seleção, aba ativa, lua |
| menta | `#86E7C4` | só "tudo certo" (janela ideal) |
| âmbar | `#F4CB86` | só alerta (regressão, passou da janela) |
| dourado | `#FFD48A` | só o sol da soneca |
| noite (gráficos) | `#6C63C9` | sono noturno em gráficos e faixas |

- **Tipografia:**
  - **Fraunces 600/700**, `font-variation-settings: "SOFT" 50`: nome do bebê, títulos de página, horários grandes, tempos e números de destaque.
  - **Nunito 500–800:** todo o resto.
  - Números usam `tabular-nums`.
  - Rótulos sempre em caixa normal (Floor 9).
- **Forma:**
  - cards com raio 24px e borda de 1px;
  - botões, seletores, rótulos de status e chips em pílula (raio total);
  - ícones de lista em quadrados de raio 12.
- **Botões:**
  - **primário:** lavanda cheio, ~56px de altura, ícone de linha;
  - **secundário:** contorno lavanda;
  - **seletor:** trilha com a opção ativa em lavanda;
  - **link de texto:** lavanda.
- **Ícones:** linha, traço 1.8, numa única família. Se o `lucide-react` já usado tiver equivalentes fiéis aos do mockup (casa, mamadeira, lista, gráfico, três pontos, sol, lua, play, relógio), usa ele; senão, SVGs próprios num único módulo `src/components/brand/icons/`.
- **Ilustrações** (`src/components/brand/illustrations/`):
  - `MoonOrbit`: lua crescente com órbita pontilhada e duas estrelas, com brilho lavanda;
  - `SunOrbit`: sol com raios, mesma órbita e uma estrela, em dourado.
  - Ambas em SVG inline, decorativas (`aria-hidden`), com animação sutil opcional que respeita `prefers-reduced-motion`.
- **Remoções:** tema claro, toggle de tema e classes do tema claro. O `next-themes` sai se nada mais o usar; o `sonner` passa a ter tema fixo escuro.

### 8.2 Navegação e casca

- **Menu inferior (mobile)** com 5 abas: Início `/app`, Comida `/feeding`, Registro `/history`, Análise `/analytics` e Mais `/more`.
  - Ícone de linha de 26px e rótulo de 13px.
  - A aba ativa fica em lavanda, com uma barra de 28×4px abaixo.
- **Desktop:** a `Sidebar` atual vira uma coluna com os mesmos 5 itens e o mesmo estilo. O conteúdo fica centralizado, com largura máxima de ~480px nas telas de uso.
- **Topo** (só na home): marca (lua mais "Soninho" em Fraunces) e relógio. As outras páginas têm o título da página em Fraunces.
- **Modo babá** (decisão do autor):
  - continua limitando o acesso: Início e Mais, e dentro do Mais só Perfil;
  - a home da babá mostra um card compacto com o último recado da família e "Ver todos", que abre a lista de recados em um painel. Isso reaproveita o `FamilyNoteCard`, sem dar acesso a Família;
  - para a babá, o link "Ver registro" do card "Hoje" não aparece.
- **`MiniTimerBar`:** mantido nas páginas que não são a home quando há sono em andamento, no estilo novo.

### 8.3 Home (`/app`)

Exatamente como o mockup da home.

- **Topo:** bebê com avatar, nome e idade, e a seta para trocar de bebê (comportamento atual de troca).
- **Acordado:**
  - **"Previsão de sono":** tipo (soneca ou noturno), horário grande e "Em cerca de X min", com a ilustração `MoonOrbit` ou `SunOrbit` conforme o tipo. Dados de `useAISuggestions` e da sugestão determinística.
  - **"Por que esse horário?":** abre um painel (sheet) com a explicação que hoje fica no `AISuggestionCard`, incluindo o feedback 👍/👎.
  - **"Tempo acordada":** valor grande, rótulo "Na janela ideal" / "Quase na hora" / "Passou da janela", barra com marcador e a faixa da janela. Dados de `useWakeWindow`.
  - **Seletor Soneca/Noturno, botão "Iniciar …" e "Começou antes?":** o último abre os chips de início retroativo atuais.
  - **Card "Hoje":** último sono e última mamada, com o link "Ver registro".
- **Dormindo:**
  - card com "Sono X em andamento", anel com o tempo, "Desde HH:MM", chips de ambiente (temperatura, TOG e "Ambiente", que abre o `EnvironmentPicker`), botão "Acordou" e "Anotar algo" para as notas;
  - card "Hoje" com a estimativa de despertar (média das últimas noites, quando houver dados) e a última mamada.
- **Revisão pós-sono:** continua abrindo ao parar, no estilo novo.
- **Saem da home:**
  - `FamilyNoteCard`: o mural continua acessível em Mais › Família;
  - `FamilyActivityFeed`: os toasts de atividade continuam;
  - `AISuggestionCard` como card: vira o painel "Por que esse horário?";
  - `RegressionRadar` completo: vai para Análise, e na home só aparece um aviso compacto quando há regressão detectada;
  - `SleepTimeline`: vai para Registro.

### 8.4 Comida (`/feeding`)

- "Próxima mamada", com horário grande e a explicação do intervalo.
- Seletor Mamadeira / Peito / Sólidos:
  - **Mamadeira:** +/− em ml (passo de 10), tipo de leite em chips e "Registrar mamadeira";
  - **Peito:** dois lados como botões grandes com o tempo, troca com um toque e "Terminar mamada";
  - **Sólidos:** alimentos em chips (`foodTags`), reação e "Registrar".
- "Registrar mamada passada" abre o `FeedingForm`.
- Lista "Hoje" com o total; tocar num item edita.

### 8.5 Registro (`/history`)

- Faixa da semana para escolher o dia (dias anteriores por rolagem).
- Card "Sono no dia" com total, rótulo de status (compara com o esperado para a idade) e faixa de blocos (noite e sonecas no horário).
- Lista de sonos do dia com tipo, intervalo, como adormeceu, despertares e duração. Tocar num item abre o `SleepForm`, onde também se exclui.
- Botão "Adicionar sono".

### 8.6 Análise (`/analytics`)

- Período 7 / 14 / 30 dias.
- Três números do período: sono por dia, sonecas por dia e maior noite.
- Gráfico "Sono por dia" com noite e sonecas empilhadas.
- Aviso de regressão quando detectada, que abre o radar completo.
- Itens que abrem telas de detalhe:
  - Ambiente e sono: correlação;
  - Padrão de sonecas: heatmap;
  - Qualidade do sono: tendência.
- Rotas: `/analytics/environment`, `/analytics/naps`, `/analytics/quality` e `/analytics/regression`.

### 8.7 Mais (`/more`) e telas de detalhe

Lista agrupada como no mockup. Cada item é uma rota:

| Grupo | Item | Rota nova | Conteúdo (de onde vem) |
|---|---|---|---|
| Assistente | Pergunte à IA | `/more/ai/chat` | `AIChat` |
| Assistente | Resumos da IA | `/more/ai` | abas Hoje, Padrões e Recomendações da página `ai-insights` |
| Casa | Bebês | `/more/babies` | `GeneralTab`: lista, adicionar, editar, foto, excluir |
| Casa | Família | `/more/family` | `FamilySettings`: membros, papéis, convites, mais o mural de recados |
| Conta | Notificações | `/more/notifications` | `NotificationsTab` + `PushNotificationsCard` |
| Conta | Relatórios e exportar | `/more/reports` | `ToolsTab` / `ToolsSettings`: relatório por e-mail, CSV, PDF |
| Conta | Perfil e preferências | `/more/profile` | `UserProfileSettings`, modo babá, sair |

- **Redirects (Next 16, `redirects` no `next.config.ts` ou via proxy):**
  - `/settings` → `/more`
  - `/settings?tab=…` → a subrota equivalente
  - `/ai-insights` → `/more/ai`
- **Hooks reaproveitados:** os de `src/hooks/settings/*`, sem duplicar.
- **Botão voltar:** toda tela de detalhe tem título em Fraunces e um botão voltar com ícone de seta à esquerda.

### 8.8 Componentes base (`src/components/ui` e `src/components/brand`)

Restilizar ou criar e usar em todas as telas:
- `Card`;
- `Button` (primário, secundário, fantasma/link);
- `SegmentedControl` (pílula com ícone opcional);
- `StatusPill` (ok, atenção, alerta);
- `Chip` (normal e selecionado);
- `ListRow` (ícone, título, subtítulo, valor ou seta);
- `PageTitle`;
- `BigNumber` (Fraunces tabular);
- `ProgressTrack` (barra da janela de vigília com marcador);
- `Ring` (anel do timer);
- `BottomNav`;
- `MoonOrbit` e `SunOrbit`.

Regras de estado e acessibilidade dos componentes:
- Oito estados por controle, conforme a Hallmark: padrão, hover, foco, ativo, desabilitado, carregando, erro e selecionado.
- Foco visível imediato.
- Alvo de toque de 44px.

### 8.9 Estados

Toda região que carrega dados tem carregando (skeleton com a forma do conteúdo), vazio (o que vai ali e a ação que preenche) e erro, conforme o `flow.md` § App screens. A home sem bebê mantém o convite para adicionar um bebê, que agora leva para `/more/babies`.


### 8.10 Decisões do Claude após a revisão do construtor

- **Nenhuma métrica atual se perde.**
  - Análise mantém na tela principal os três números e o gráfico do mockup.
  - Os demais indicadores de hoje ficam em telas de detalhe:
    - **"Mais números"** (`/analytics/numbers`): Sono 24h, Débito de sono, Média de soneca, Sonecas hoje;
    - **"Tendências"** (`/analytics/trends`): duração média da soneca, sonecas por dia e horas de noite;
    - **Ambiente**, **Padrão de sonecas** (heatmap) e **Qualidade** (`SleepQualityTrend`).
  - Registro mantém o filtro por tipo (chips Todos / Sonecas / Noite) sobre o dia escolhido.
  - O botão de PDF passa para Mais › Relatórios e exportar.
- **Cálculos novos dos mockups** entram como funções puras com testes primeiro, no padrão do PR 2:
  - **estimativa de despertar:** média do fim das últimas noites, só com 3 ou mais noites; sem dados, o item não aparece;
  - **status do dia em Registro:** "Dentro do esperado" quando o total fica a até 1h da meta de `getAgeSchedule`, "Abaixo do esperado" ou "Acima do esperado" fora disso;
  - **texto da próxima mamada:** derivado do que `computeFeedingSuggestion` realmente usou (histórico ou faixa da idade).
  - Nenhum número inventado.
- **Ambiente para checar as telas com a Hallmark:** Supabase local (`npx supabase start`) com um script de seed **só de dados fictícios** (`supabase/seed.sql` ou um script em `scripts/`), mais uma conta de teste local. Produção nunca é usada para isso.
- **Conflitos entre a Hallmark e o mockup.**
  - O que foi aprovado no mockup é obrigatório: Fraunces nos números grandes, ilustrações, sidebar de 5 itens no desktop.
  - Os gates Reflex que dispararem por causa disso são dispensados formalmente no carimbo (`waive`), com o motivo "aprovado pelo autor no mockup".
  - Os gates do Floor não têm exceção, e nenhum conflita com o mockup.

- **Avatar do bebê** (decisão do autor):
  - o `BabyAvatar` mostra a foto quando houver; senão, a inicial do nome em Fraunces sobre fundo lavanda;
  - o emoji deixa de aparecer, e o seletor de emoji sai do `BabyProfileForm`;
  - a coluna `babies.avatar_emoji` continua no banco, sem migration e sem perda de dados.

## 9. Decisões deixadas ao construtor

- Nomes exatos de componentes e arquivos novos, seguindo as pastas acima.
- Usar `lucide-react` ou SVG próprio em cada ícone, desde que a família visual seja única.
- Detalhes de microanimação dentro das regras da Hallmark.
- Ordem das telas no plano (sugestão: tokens e base → casca/nav → home → Comida → Registro → Análise → Mais e detalhes).

## 10. Processo

- Execução por subagentes (preferência do autor), um PR com várias tarefas.
- Revisão por tarefa e revisão final da branch.
- Merge e deploy pelo Claude (autonomia aprovada na Fase 1). Não há migrations.
