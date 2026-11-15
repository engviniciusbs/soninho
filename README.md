# Soninho 🌙

[![CI](https://github.com/engviniciusbs/soninho/actions/workflows/ci.yml/badge.svg)](https://github.com/engviniciusbs/soninho/actions/workflows/ci.yml)

[English](README.en.md) · **Português**

Monitor de sono e alimentação do bebê para famílias. Pais e cuidadores registram sonecas, sono noturno e mamadas pelo celular; o Soninho calcula janelas de vigília pela idade do bebê, sugere o horário da próxima soneca e mamada, avisa por push quando a janela está acabando e gera análises, relatórios por e-mail e insights com IA — tudo em português brasileiro.

## Principais funcionalidades

- **Timer de sono** (soneca / sono noturno) com início retroativo ("começou há 10 min"), um por bebê, sincronizado entre cuidadores e persistido localmente (estado antigo é migrado v0→v1); o fim nunca fica antes do início.
- **Janela de vigília** por idade (semáforo verde/amarelo/vermelho) e **sugestão determinística da próxima soneca** — sem LLM, mesma tabela em todo o app.
- **Revisão pós-sono**: qualidade (1–5), como adormeceu, motivo do despertar, temperatura do quarto, clima, saco de dormir/TOG e roupa — com **recomendação de roupa** pela temperatura.
- **Alimentação**: timer de amamentação por lado (esquerdo/direito), mamadeira (fórmula / leite materno / misto, em ml) e introdução alimentar com tags de alimentos e reação (inclusive alergia). Sugestão da próxima mamada pelo intervalo médio recente.
- **Família compartilhada**: convite por link (token hex de 48 caracteres; tokens base64 antigos continuam válidos; a página do convite mostra estados específicos: usado, expirado, revogado ou inexistente) com papéis (`owner`, `caregiver`, `viewer`), parentesco (mãe, pai, avó, babá…), mural de recados, feed de atividade e toasts/push quando outro cuidador inicia ou encerra um sono/mamada.
- **Modo babá**: interface reduzida (só Início e Configurações).
- **Análises**: gráfico de barras de sono diário, tendência de qualidade, heatmap de horários de soneca, correlação ambiente × sono, dívida de sono e radar de regressão.
- **IA (OpenAI `gpt-4o-mini`)**: chat com consultora de sono com streaming, insights (avaliação do dia, padrões, tendências, recomendações) e análise de regressão do sono. **Cota diária de 50 chamadas por usuário** (dia de `America/Sao_Paulo`), somando chat e regressão; a sugestão de soneca é determinística e não consome cota. O chat aceita no máximo 20 mensagens de até 2000 caracteres (o cliente corta o histórico); ao estourar a cota a API responde 429 e o app mostra "Limite diário de uso da IA atingido…".
- **Notificações push (Web Push/VAPID)**: "soneca chegando" e "passou da janela", enviados a todos os owners e caregivers com notificações ligadas (viewers não recebem), com horário de silêncio e fuso horário por usuário. Só endpoints de FCM, Mozilla, Apple e Windows são aceitos (na inscrição e no envio); inscrições inválidas ou mortas (400/404/410/413) são desativadas.
- **E-mails (Resend + React Email)**: relatório semanal automático (cron) e relatório sob demanda de 7/14/30 dias, com dias e períodos calculados no fuso do usuário (`notification_preferences.timezone`); exportação em PDF (`@react-pdf/renderer`).
- **Landing page pública** em `/`; usuários logados vão direto para `/app`.

---

## Sumário

- [Stack](#stack)
- [Pré-requisitos](#pré-requisitos)
- [Primeiros passos](#primeiros-passos)
- [Variáveis de ambiente](#variáveis-de-ambiente)
- [Banco de dados (Supabase)](#banco-de-dados-supabase)
- [Arquitetura](#arquitetura)
- [Rotas da API](#rotas-da-api)
- [Lógica de domínio](#lógica-de-domínio)
- [Scripts](#scripts)
- [Testes e qualidade](#testes-e-qualidade)
- [Deploy (Vercel)](#deploy-vercel)
- [Solução de problemas](#solução-de-problemas)

---

## Stack

| Camada | Tecnologia |
| --- | --- |
| Framework | **Next.js 16.4** (App Router, Route Handlers, Proxy) |
| UI | **React 19.3**, TypeScript 5 |
| Estilo | **Tailwind CSS 4** (`@tailwindcss/postcss`), `tw-animate-css`, `next-themes` |
| Componentes | **shadcn/ui** (estilo `base-nova`) sobre **Base UI** (`@base-ui/react`), ícones `lucide-react` |
| Animação | `framer-motion` |
| Estado cliente | **Zustand** (com `persist` → `localStorage`) |
| Dados servidor | **TanStack Query 5** |
| Formulários | `react-hook-form` + **Zod 4** |
| Datas | `date-fns` + `date-fns-tz` (padrão `America/Sao_Paulo`) |
| Gráficos | `recharts` |
| Backend / Auth / DB / Storage | **Supabase** (`@supabase/ssr`, `@supabase/supabase-js`, Postgres + RLS) |
| IA | **OpenAI** SDK (`gpt-4o-mini`) |
| E-mail | **Resend** + `@react-email/components` |
| PDF | `@react-pdf/renderer` |
| Push | `web-push` + Service Worker (`public/sw.js`) |
| Fontes | Nunito + Fraunces (`next/font/google`) |
| Deploy | **Vercel** (com Vercel Cron) |

> ⚠️ **Next.js 16 tem mudanças incompatíveis** com versões anteriores. Antes de alterar código, consulte os guias em `node_modules/next/dist/docs/` (veja `AGENTS.md`).

## Pré-requisitos

- **Node.js 22** (`engines` `22.x`; openai 7 e supabase-js exigem Node ≥ 22)
- **npm** (o repositório usa `package-lock.json`)
- Um projeto **Supabase** (gratuito serve) — Auth, Postgres e Storage
- Opcional, mas necessário para as respectivas features:
  - Chave da **OpenAI** (chat / insights / regressão)
  - Conta **Resend** com domínio verificado (e-mails)
  - Par de chaves **VAPID** (notificações push)

## Primeiros passos

### 1. Clonar e instalar

```bash
git clone https://github.com/engviniciusbs/soninho.git
cd soninho
npm install
```

### 2. Configurar o Supabase

1. Crie um projeto em [supabase.com](https://supabase.com/dashboard).
2. Em **Project Settings → API**, copie a URL, a `anon key` e a `service_role key`.
3. Crie o schema a partir das migrations versionadas em `supabase/migrations/` (tabelas, RLS, funções e o bucket público `baby-avatars`): localmente rode `npx supabase start`, `npx supabase db reset` e `npx supabase test db`; no projeto hospedado use `npx supabase link` e `npx supabase db push --remote` (rode antes com `--dry-run`). Veja [Banco de dados](#banco-de-dados-supabase).
4. O bucket `baby-avatars` (fotos dos bebês, caminho `<user_id>/<timestamp>.<ext>`) é criado pelas migrations.
5. Em **Authentication → URL Configuration**, adicione `http://localhost:3000/auth/callback` (e a URL de produção) às *Redirect URLs*.
6. (Opcional) Use o template em `src/lib/email/templates/supabase-confirm-signup.html` em **Authentication → Email Templates → Confirm signup**. Ele usa `{{ .ConfirmationURL }}` (fluxo padrão via `/auth/callback`). A rota `/api/auth/confirm` também está disponível caso você troque o link por `{{ .SiteURL }}/api/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.

### 3. Variáveis de ambiente

Copie o modelo `.env.example` para `.env.local` na raiz (arquivos `.env*` são ignorados pelo git, exceto o `.env.example`) e preencha:

```bash
cp .env.example .env.local
```

Exemplo do conteúdo:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_APP_URL=http://localhost:3000

OPENAI_API_KEY=sk-...
RESEND_API_KEY=re_...

NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_CONTACT_EMAIL=mailto:voce@exemplo.com

CRON_SECRET=uma-string-aleatoria-longa
```

Gerar as chaves VAPID e o segredo do cron:

```bash
npx web-push generate-vapid-keys
openssl rand -hex 32
```

### 4. Rodar

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Crie uma conta em `/register`, confirme o e-mail e cadastre o bebê em **Configurações**.

> Push notifications exigem contexto seguro: `localhost` funciona; para testar no celular use HTTPS (ex.: túnel `ngrok`/`cloudflared`).

## Variáveis de ambiente

| Variável | Onde é usada | Obrigatória | Descrição |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | cliente, servidor, middleware | ✅ | URL do projeto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | cliente, servidor, middleware | ✅ | Chave pública (respeita RLS) |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts` | ✅ p/ crons, convites e push de família | Chave admin — **ignora RLS, nunca exponha no cliente** |
| `NEXT_PUBLIC_APP_URL` | links nos e-mails | — | Padrão `https://soninho.baby` |
| `OPENAI_API_KEY` | `/api/ai/chat`, `/api/ai/regression` | p/ IA | Chave da OpenAI |
| `RESEND_API_KEY` | `src/lib/email/sleepReport.ts` | p/ e-mail | Remetente fixo `Soninho <sono@soninho.baby>` — o domínio precisa estar verificado no Resend |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | cliente (inscrição) e servidor | p/ push | Chave pública VAPID |
| `VAPID_PRIVATE_KEY` | servidor | p/ push | Chave privada VAPID |
| `VAPID_CONTACT_EMAIL` | servidor | p/ push | Contato VAPID, no formato `mailto:...` |
| `CRON_SECRET` | `/api/email/weekly`, `/api/notifications/dispatch` | p/ crons | Exigido como `Authorization: Bearer <CRON_SECRET>`. A Vercel envia esse header automaticamente nos crons quando a variável existe |

> Variáveis `NEXT_PUBLIC_*` são embutidas no build — altere-as e **faça novo deploy**.

## Banco de dados (Supabase)

Os tipos de referência estão em `src/types/database.ts`. As tabelas de notificações/e-mail não estão nesse arquivo, mas são usadas no código (colunas inferidas das queries).

### Tabelas

```
babies                     — bebês
├── id (uuid, PK) · user_id (→ auth.users) · family_id (→ families, null)
├── name · birth_date (date) · avatar_emoji (default '🍼') · avatar_url
└── created_at

sleep_sessions             — sonecas e sono noturno
├── id · baby_id (→ babies) · type ('NAP' | 'NIGHT_SLEEP')
├── start_time · end_time (null = em andamento) · duration_min (trigger)
├── quality (1–5) · notes · location
├── room_temp_celsius · weather_condition · sleep_sack_type · sleep_sack_tog
├── clothing_description · how_fell_asleep · wake_reason
└── created_at · updated_at

families                   — id · name · created_by · created_at
family_members             — family_id · user_id · role ('owner'|'caregiver'|'viewer')
                             display_name · email · family_relation · invited_by · joined_at
family_invites             — family_id · token · role ('caregiver'|'viewer') · family_relation
                             created_by · expires_at · accepted_at · accepted_by · revoked_at
family_notes               — family_id · author_id · author_name · body · created_at

bottle_feedings            — baby_id · start_time · volume_ml · milk_type ('FORMULA'|'BREAST_MILK'|'MIXED') · notes
breastfeeding_sessions     — baby_id · start_time · end_time · side_left_sec · side_right_sec
                             last_side ('LEFT'|'RIGHT') · duration_min · notes
solid_feedings             — baby_id · start_time · food_tags (text[])
                             reaction ('LOVED'|'LIKED'|'NEUTRAL'|'DISLIKED'|'ALLERGIC_REACTION') · notes

sleep_activity_log         — baby_id · family_id · actor_user_id · actor_name · actor_relation
                             action ('started'|'stopped') · sleep_session_id · sleep_type
feeding_activity_log       — … · action ('started'|'stopped'|'logged') · feeding_type ('BOTTLE'|'BREAST'|'SOLID') · reference_id

nap_suggestion_feedback    — baby_id · user_id · suggested_time · window_start · window_end · age_weeks · vote ('up'|'down')
user_profiles              — user_id (PK) · display_name · family_relation · ui_mode ('standard'|'nanny')

notification_preferences   — user_id (unique) · enabled · alert_before_minutes · quiet_hours_start/end ('HH:MM')
                             timezone · weekly_email_enabled · updated_at
push_subscriptions         — user_id · endpoint (unique) · p256dh · auth · user_agent · is_active · last_seen_at
notification_events        — dedupe de pushes (eventType 'NAP_SOON' | 'OVERDUE', chave baby:session:tipo)
email_log                  — user_id · kind · period_start · period_end · dedupe_key · status · sent_at
```

### Funções SQL (RLS helpers)

- `get_user_family_ids(uid) → uuid[]`
- `get_user_owned_family_ids(uid) → uuid[]`
- `user_can_write_family(uid, fid) → boolean`

### Segurança

Integridade da família: membros só entram por convite (`accept_family_invite`) ou pela RPC de criação de bebê; cada membro só edita o próprio `display_name`/`family_relation`; a família sempre mantém um owner; `end_time ≥ start_time` é garantido em sono e amamentação. A API valida toda entrada com zod, nunca vaza erros do banco e responde em PT-BR. O export CSV neutraliza prefixos de fórmula (`= + - @`), o proxy aplica os headers de cache do cookie do Supabase e o redirect para o login preserva a query string.

Todas as tabelas devem ter **Row Level Security** habilitada. O padrão original (dono do bebê via `auth.uid()`) está em `supabase/migrations/20260101000000_initial_schema.sql`; com famílias, as políticas devem permitir acesso a bebês das famílias do usuário (`get_user_family_ids`) e escrita só para `owner`/`caregiver` (`user_can_write_family`). Operações que cruzam usuários (crons, aceite de convite, push para a família) usam o client admin (`service_role`).

O trigger `calculate_sleep_duration` preenche `duration_min` e `updated_at` em `sleep_sessions`.

> O schema completo está versionado como migrations da Supabase CLI em `supabase/migrations/`.

## Arquitetura

### Estrutura de diretórios

```
src/
├── middleware.ts              # Sessão Supabase + regras de redirect/autorização
├── app/
│   ├── layout.tsx             # Fontes, metadata, tema
│   ├── page.tsx               # Landing pública (/)
│   ├── (auth)/                # /login, /register, /auth/callback (troca code→sessão)
│   ├── (dashboard)/           # Área logada (layout com Sidebar/BottomNav/providers)
│   │   ├── app/               #   Início: timer, janela de vigília, sugestões, recados
│   │   ├── feeding/           #   Alimentação
│   │   ├── history/           #   Registro (histórico)
│   │   ├── analytics/         #   Análise (gráficos)
│   │   ├── ai-insights/       #   Insights e chat com IA
│   │   └── settings/          #   Bebê, perfil, família, notificações, ferramentas
│   ├── invite/[token]/        # Página pública de aceite de convite
│   └── api/                   # Route Handlers (ver "Rotas da API")
├── components/
│   ├── ui/                    # Primitivos shadcn/Base UI
│   ├── sleep/ feeding/ family/ ai/ charts/ settings/ baby/ brand/ landing/
│   ├── layout/                # Sidebar, TopBar, BottomNav, MiniTimerBar, NannyRouteGuard, navLinks
│   └── providers/             # QueryProvider, BabyProvider, UserProfileProvider
├── hooks/                     # useSleepTimer, useBreastfeedingTimer, useWakeWindow, usePushNotifications…
├── store/                     # Zustand: sleepStore ("soninho-timer"), feedingStore ("soninho-feeding-timer")
├── lib/
│   ├── supabase/              # client.ts (browser), server.ts (cookies), admin.ts (service role), queries
│   ├── sleep/                 # Regras de sono (janelas, sugestão, estatísticas, regressão…)
│   ├── feeding/               # Intervalos, sugestão, estatísticas, tags de alimentos
│   ├── family/                # Parentescos, mensagens e registro de atividade
│   ├── ai/                    # Cliente OpenAI, prompts, contexto de sono
│   ├── notifications/         # Dispatch de push, push para família, cliente de inscrição
│   ├── email/                 # Relatório de sono, envio semanal, templates
│   └── report/                # PDF do relatório
├── emails/                    # Templates React Email (WeeklyReport)
└── types/                     # database.ts (schema) e index.ts (tipos de domínio)
public/
├── sw.js                      # Service Worker: exibe push e trata clique
└── brand/                     # Logo
```

### Autenticação e roteamento (`src/middleware.ts`)

1. Em toda requisição (exceto estáticos/imagens), cria um client Supabase SSR e renova a sessão via cookies.
2. Rotas públicas: `/`, `/login`, `/register`, `/auth/*`, `/invite/*`, `/api/family/accept/*`.
3. Sem usuário em rota privada → redirect para `/login?redirect=<rota>`.
4. Usuário logado em `/login`, `/register` ou `/` → redirect para `/app`.
5. `/landing` (URL antiga) → `/`.

Confirmação de cadastro: `emailRedirectTo` aponta para `/auth/callback` (fluxo PKCE com `code`); a rota `/api/auth/confirm` (`verifyOtp` com `token_hash`) existe como alternativa para templates que enviem `token_hash`.

### Fluxo de dados

```
Componente ──(TanStack Query / fetch)──▶ Route Handler /api/* ──▶ Supabase (RLS, client do usuário)
    │                                            └──▶ client admin (crons, convites, push família)
    └── Zustand persist (timer ativo no localStorage) ── sincroniza com sleep_sessions em andamento
```

- **Timer**: o estado do timer fica no `localStorage` para sobreviver a recarregamentos; a sessão em andamento (`end_time = null`) no banco é a fonte da verdade entre dispositivos/cuidadores.
- **Atividade de família**: ao iniciar/parar sono ou registrar mamada, o cliente chama `/api/family/sleep-activity` ou `/feeding-activity` (fire-and-forget), que grava no log e envia push para os outros membros (`src/lib/notifications/familyActivity.ts`). O hook `useFamilyActivityToasts` mostra toasts em tempo real.
- **Push**: `usePushNotifications` registra `public/sw.js`, inscreve com a chave VAPID e salva em `push_subscriptions` (re-sincroniza ao montar).

### Papéis e modos

| Papel | Pode |
| --- | --- |
| `owner` | tudo, incluindo convidar, mudar papéis e remover membros |
| `caregiver` | registrar sono/alimentação e recados |
| `viewer` | apenas visualizar |

`ui_mode = 'nanny'` (Modo babá) limita a navegação a `/app` e `/settings` (`NannyRouteGuard` + `getNavLinks`).

## Rotas da API

| Rota | Métodos | Descrição |
| --- | --- | --- |
| `/api/sleep` | GET, POST | Listar / criar sessões de sono |
| `/api/sleep/[id]` | GET, PUT, DELETE | Ler / atualizar (encerrar, revisar) / excluir sessão |
| `/api/ai/suggest` | POST | Próxima soneca/sono noturno (**determinístico**, sem LLM) |
| `/api/ai/chat` | POST | Chat com IA (streaming) |
| `/api/ai/regression` | POST | Análise de regressão do sono com IA |
| `/api/feeding/suggest` | POST | Próxima mamada (determinístico) |
| `/api/suggestions/feedback` | POST | 👍/👎 na sugestão de soneca |
| `/api/profile` | GET, PATCH | Perfil do usuário (nome, parentesco, modo babá) |
| `/api/family/invite` | GET, POST, DELETE | Listar / criar / revogar convites |
| `/api/family/accept/[token]` | GET, POST | Ver / aceitar convite (**público**) |
| `/api/family/members` | GET, PATCH, DELETE | Membros, mudar papel, remover (owner) |
| `/api/family/notes` | GET, POST, DELETE | Mural de recados |
| `/api/family/activity` | GET | Feed de atividade |
| `/api/family/sleep-activity` | POST | Registrar início/fim de sono + push à família |
| `/api/family/feeding-activity` | POST | Registrar alimentação + push à família |
| `/api/notifications/subscribe` | POST, DELETE | Inscrever / desativar push |
| `/api/notifications/test` | POST | Enviar push de teste |
| `/api/notifications/dispatch` | GET | **Cron**: alertas "soneca chegando" / "passou da janela" |
| `/api/email/report` | POST | Relatório sob demanda (7/14/30 dias; limite 1/hora por período) |
| `/api/email/weekly` | GET | **Cron**: relatório semanal |
| `/api/auth/confirm` | GET | Confirmação de e-mail via `token_hash` |

## Lógica de domínio

Tudo em `src/lib/` é TypeScript puro e determinístico — bom ponto de partida para testes.

- **`sleep/wakeWindows.ts`** — tabela de janelas de vigília por idade (ex.: 0–6 semanas: 45–60 min; 9–12 meses: 180–240 min) e status verde/amarelo/vermelho.
- **`sleep/schedules.ts`** — metas de sono total, nº de sonecas e sono noturno por faixa etária.
- **`sleep/computeNapSuggestion.ts` + `inferNextSleepKind.ts`** — sugere a próxima janela e se é soneca ou sono noturno (pelo horário, histórico — mediana de início do sono noturno com ≥ 3 noites — e agenda).
- **`sleep/sessionDayAllocation.ts`** — divide sessões que cruzam a meia-noite entre os dias de calendário locais (base de todas as estatísticas diárias).
- **`sleep/statistics.ts`** — totais diários, sonecas/dia, maior período noturno, heatmap, stats gerais e últimas 24h.
- **`sleep/regression.ts`** — dívida de sono vs. meta da idade e janelas de regressão conhecidas.
- **`sleep/environmentCorrelation.ts`** — temperatura/TOG/clima × qualidade e duração.
- **`sleep/clothingRecommendation.ts`** — roupa recomendada por temperatura, tipo de saco e TOG.
- **`feeding/computeFeedingSuggestion.ts`** — próxima mamada pelo intervalo médio recente; fallback por idade (`feedingIntervals.ts`).
- **`notifications/dispatch.ts`** — para cada usuário com push ativo, fora do horário de silêncio e sem sono em andamento: envia `NAP_SOON` quando faltam `alert_before_minutes` (padrão 15) para o fim da janela e `OVERDUE` quando passou. Dedupe em `notification_events`. Destinatários: todos os owners e caregivers com notificações ligadas, cada um com seu horário de silêncio e fuso; consultas em lote; falha transitória é repetida no próximo tick; claims antigos são liberados após 10 min; TTL por evento.
- **`ai/analyzeSleep.ts` + `ai/prompts.ts`** — monta o contexto de sono no fuso do navegador e usa prompts em PT-BR.

## Scripts

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento em `http://localhost:3000` |
| `npm run build` | Build de produção |
| `npm run start` | Serve o build de produção |
| `npm run lint` | ESLint (`eslint-config-next`) |
| `npx tsc --noEmit` | Checagem de tipos |
| `npx shadcn add <componente>` | Adiciona componente shadcn em `src/components/ui` |

## Testes e qualidade

```bash
npm test            # testes unitários (Vitest)
npm run test:db     # testes do banco (pgTAP; requer Docker e `npx supabase db start`)
```

O CI (GitHub Actions) roda lint, `tsc`, testes, build e testes do banco em todo PR. Antes de abrir PR, rode localmente:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

Para mudanças no banco, veja [docs/CONTRIBUTING-DB.md](docs/CONTRIBUTING-DB.md).

## Deploy (Vercel)

O projeto é feito para a **Vercel** (`vercel.json`).

1. Importe o repositório na Vercel (framework detectado: Next.js).
2. Configure **todas** as variáveis de ambiente da tabela acima em *Production* (e *Preview*, se quiser).
3. Ajuste `NEXT_PUBLIC_APP_URL` para o domínio final e adicione `https://<dominio>/auth/callback` às Redirect URLs do Supabase.
4. Deploy: cada push na `main` gera deploy de produção.

### Crons

`vercel.json` agenda apenas o e-mail semanal (os alertas de soneca rodam via `pg_cron`, veja abaixo):

```json
{ "crons": [{ "path": "/api/email/weekly", "schedule": "0 11 * * 1" }] }
```

Toda segunda às 11:00 UTC (08:00 em Brasília). Com `CRON_SECRET` definido, a Vercel envia `Authorization: Bearer <CRON_SECRET>`.

Os alertas de soneca (`/api/notifications/dispatch`) são agendados pelo Supabase `pg_cron` + `pg_net` a cada 5 minutos (migration `20261115120300_schedule_notification_dispatch.sql`). Para chamar manualmente:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<dominio>/api/notifications/dispatch
```

Teste manual do e-mail semanal:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/email/weekly
# {"ok":true,"sent":1,"skipped":0,"timestamp":"..."}
```

### Outras plataformas

Funciona em qualquer host Node (`npm run build && npm run start`, porta 3000) ou em Docker com a saída padrão do Next. Nesse caso, configure os crons externamente com o header `Authorization`.

## Solução de problemas

**Redirect infinito para `/login` / sessão não persiste**
Verifique `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e se o domínio está nas Redirect URLs do Supabase.

**`/login?error=auth` ou `?error=confirmation` após clicar no e-mail**
O link expirou ou a Redirect URL não está cadastrada. Confira se o template de e-mail e a Redirect URL apontam para o mesmo domínio do app.

**Dados não aparecem / erro de permissão**
Quase sempre é RLS: confira as políticas e as funções `get_user_family_ids` / `user_can_write_family`.

**Upload de foto falha ("Erro ao enviar foto")**
Crie o bucket `baby-avatars` como público e permita upload para usuários autenticados. `next.config.ts` já libera imagens de `*.supabase.co/storage/v1/object/public/**`.

**Push não chega**
- Precisa de HTTPS (ou `localhost`) e permissão do navegador. No iOS, só funciona com o app adicionado à tela inicial (iOS 16.4+).
- Confira as três variáveis VAPID — `VAPID_CONTACT_EMAIL` deve começar com `mailto:`.
- Use **Configurações → Notificações → Testar** (`/api/notifications/test`).
- O dispatch roda por `pg_cron` a cada 5 min (ver [Crons](#crons)); confira se o job `soninho-notification-dispatch` existe.

**`RESEND_API_KEY not configured` / e-mail não enviado**
Defina a chave e verifique o domínio `soninho.baby` no Resend (ou altere `FROM` em `src/lib/email/sleepReport.ts`).

**`401 Unauthorized` nos crons**
O header precisa ser exatamente `Authorization: Bearer <CRON_SECRET>`, e a variável precisa existir no ambiente.

**IA retorna erro 500**
Verifique `OPENAI_API_KEY` e os créditos da conta.

**Horários errados**
O app assume `America/Sao_Paulo` por padrão; o fuso do navegador é enviado nas chamadas de IA/sugestão e o fuso das notificações fica em `notification_preferences.timezone`.

## Licença

[MIT](LICENSE) © 2026 engviniciusbs
