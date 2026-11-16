# Soninho — Fase 1: Estabilização (design)

- **Data:** 2026-11-15
- **Autor:** engviniciusbs (com Claude)
- **Status:** aprovado pelo autor em 2026-11-15; Fase 1 concluída (PRs #1–#4) em 2026-11-16

## 1. Intenção e porquê

O Soninho (soninho.baby) é um projeto **open source de portfólio**, que nunca será pago. Ele existe para demonstrar a qualidade de engenharia do autor. O app está em produção e é usado diariamente pela família do autor: 965 sessões de sono, 401 mamadeiras e 1.164 eventos de atividade em 2026-11-15. A ideia é que outras famílias passem a usar.

Ficou um tempo sem manutenção, e o diagnóstico de 2026-11-15 mostrou falhas graves de segurança, crons que nunca rodaram, dependências com CVEs, ausência de testes/CI e arquivos grandes demais. A Fase 1 deixa o projeto **seguro, correto e com aparência profissional para quem lê o repositório**, antes da Fase 2 (evolução de produto, fora deste documento).

Quem avalia um portfólio lê o código. Por isso, cada correção deve deixar evidência visível: migrations versionadas, testes (inclusive de RLS), CI verde e PRs bem descritos.

## 2. Objetivos

1. Fechar todas as falhas de autorização confirmadas (seção 6) e as que a auditoria da skill `security-audit` confirmar.
2. Versionar o banco: schema, RLS, funções, triggers e storage em `supabase/migrations/`, reproduzível localmente com `supabase start`.
3. Fazer os crons funcionarem (e-mail semanal e alertas de soneca) e agendar os alertas.
4. Corrigir os bugs de correção de dados: sessões duplicadas, timer fantasma, fuso horário nos relatórios.
5. Base de qualidade: Vitest, pgTAP, GitHub Actions, dependências atualizadas e limpas, `.env.example`, licença.
6. Refatorar o que for necessário para o código ficar legível: arquivos gigantes, hooks duplicados, `eslint-disable`.

## 3. Não-objetivos

- Features novas de produto (fraldas, PWA/offline, sons, crescimento, vários filhos): ficam para a Fase 2.
- Converter as páginas para Server Components / RSC. É uma mudança de arquitetura que pertence à Fase 2, junto com PWA e performance.
- Monetização, analytics e i18n.
- Redesenho visual. A UI pode mudar só onde uma correção exigir.

## 4. Anti-objetivos (seria um fracasso mesmo que "funcione")

- **Perder ou alterar dados de produção** da família do autor.
- **Vazar dados pessoais no repositório público**: nomes, e-mails, UUIDs de usuários reais, tokens. Atenção especial à migration de reparo de dados de 2026-04-13 (versão `20260413155216`), cujo nome original contém nomes reais.
- Mudar o comportamento que a família já usa sem que isso seja uma correção intencional.
- Aplicar SQL em produção sem backup prévio e sem o SQL registrado no PR correspondente.
- Deixar o app quebrado entre a aplicação da migration e o deploy do código.

## 5. Restrições

- **Next.js 16.2+**, com mudanças incompatíveis. Consultar `node_modules/next/dist/docs/` antes de alterar convenções (AGENTS.md).
- **Supabase de produção:** acessível pelo MCP `supabase` (configurado em `.mcp.json`; o project ref é público por estar no bundle do app, mas não é repetido em docs). Não existem branches e não se deve criá-los (abordagem A).
- O deploy na Vercel é automático a cada push/merge na `main`.
- Docker está disponível localmente. A Supabase CLI entra como devDependency (`supabase`).
- O `gh` está autenticado como `engviniciusbs`. Os commits devem sair com essa identidade (já configurada no repositório).
- Idioma: UI e mensagens em PT-BR; código e comentários seguem o padrão atual (inglês).

## 6. Estado atual confirmado (produção, 2026-11-15)

### Falhas de autorização (RLS em produção)

| # | Política / local | Problema |
|---|---|---|
| S1 | `family_invites` → `Anyone can read invite by token` (`USING true`) | Qualquer pessoa, até sem login, lista todos os tokens de convite com a chave anon |
| S2 | `family_members` → `Self or owner can insert members` (`auth.uid() = user_id OR owner`) | Qualquer usuário se insere em qualquer família com qualquer papel, inclusive `owner` |
| S3 | `family_members` → `Members can update own family relation` (`auth.uid() = user_id`) | O membro pode alterar qualquer coluna da própria linha, inclusive `role`; um viewer vira owner |
| S4 | `GET /api/family/invite` (`src/app/api/family/invite/route.ts:20`) | Aceita qualquer papel; hoje a RLS limita a owner, mas S1 anula isso |
| S5 | `acceptFamilyInvite` (`src/lib/supabase/queries.ts:352`) | Não é atômico, ignora o erro ao marcar `accepted_at`, e o convite pode ser reutilizado |
| S6 | Funções `get_user_family_ids`, `get_user_owned_family_ids`, `user_can_write_family` | São `SECURITY DEFINER` executáveis por `anon` via `/rest/v1/rpc/*` |
| S7 | `calculate_duration` | Sem `search_path` fixo (alerta do Supabase) |
| S8 | Auth | Proteção contra senha vazada desligada (ação manual no dashboard) |

### Outros fatos

- 12 migrations aplicadas em produção, todas com SQL em `supabase_migrations.schema_migrations.statements`. As tabelas `babies` e `sleep_sessions` foram criadas antes delas, pelo SQL Editor; o conteúdo está em `supabase-schema.sql`.
- Não há sessões abertas duplicadas (`end_time is null`) nem sessões com `end_time < start_time`. Todas as famílias têm owner.
- `notification_events` está vazia, o que confirma que o dispatch nunca rodou. O `email_log` tem 3 registros.
- O middleware (`src/middleware.ts:48-60`) redireciona para `/login` tudo que não é público, **inclusive `/api/*`**. Os crons e o `/api/auth/confirm` são bloqueados.
- O diagnóstico completo de código (agentes de 2026-11-15) está resumido nos itens das seções 8.3 e 8.4.

## 7. Abordagens consideradas

| | Abordagem | Trade-off | Decisão |
|---|---|---|---|
| **A** | Supabase local (Docker + CLI) + migrations no repo + testes pgTAP rodando no CI; produção recebe migrations aprovadas | Mais setup inicial, banco local sem dados reais; custo zero, testes de segurança viram evidência permanente | ✅ **Escolhida pelo autor** |
| B | Branch do Supabase na nuvem | Mais perto de produção, mas cobrado e sem evidência automatizada no repo | Descartada |
| C | Revisar e aplicar direto em produção | Arriscado com dados reais, sem evidência | Descartada |

**Entrega em PRs sequenciais** (escolhida pelo autor): (1) segurança e banco → (2) base de qualidade → (3) correções da aplicação → (4) refatoração.

## 8. Design

### 8.0 Fluxo de trabalho comum a todos os PRs

- Uma branch por PR a partir da `main` atualizada (`fase1/01-seguranca`, `fase1/02-qualidade`, `fase1/03-correcoes`, `fase1/04-refatoracao`). Um PR por branch via `gh`, com descrição explicando o problema, a correção e como foi testado.
- Antes de abrir cada PR, devem passar `npm run lint`, `npx tsc --noEmit`, `npm run build` (com env fictícia), os testes existentes e, a partir do PR 1, `supabase test db`.
- **Autorização** *(decisão do autor, 2026-11-15)*: o autor pré-aprovou o SQL de todas as migrations, os merges de todos os PRs e qualquer ação operacional que o Claude consiga executar. O Claude aplica e faz o merge sozinho, mas **mantém as salvaguardas**: backup antes de cada migration, SQL completo na descrição do PR, CI verde antes do merge, e verificação pós-deploy (advisors, smoke test do site). Para se o resultado divergir do esperado.
- **Produção:** ordem obrigatória: (1) backup, (2) aplicar a migration, (3) merge do PR (deploy). Cada migration precisa ser **compatível com o código antigo** durante a janela entre os passos 2 e 3, ou a janela precisa ser minimizada e anunciada ao autor.
- **Ferramenta de produção** *(decisão do autor: opção A)*: Supabase CLI `supabase@3.1.0` já autenticada (`supabase login`) e vinculada ao projeto (`supabase link`) pelo autor. Migrations vão para produção com `npx supabase db push` (preserva as versões dos arquivos). Não usar `apply_migration` do MCP para DDL de produção, porque ele gera versões próprias e o histórico divergiria; o MCP fica para leitura (`execute_sql` de consulta, `get_advisors`, `generate_typescript_types`). Na CLI 3.x, `--linked` está depreciado: usar `--remote`. O diretório `supabase/.temp/` criado pelo `link` não pode ser commitado (o `supabase init` gera `supabase/.gitignore`; conferir).
- **Backup antes de cada migration em produção:** `supabase db dump --data-only` (e `--schema`), salvo **fora do repositório** (ex.: `~/soninho-backups/AAAA-MM-DD/`).

### 8.1 PR 1 — Segurança e banco

**Passo 1. Auditoria de entrada com a skill `security-audit` (Cloudflare)**

- Instalar a skill em nível de usuário: `npx skills add https://github.com/cloudflare/security-audit-skill --skill security-audit --global`.
- Rodar em **modo full audit**, perfil `standard`, alvo `/mnt/dados/dev/soninho`, saída fora do repo (`~/security-audit-skill/soninho/run-1`). A skill opera só sobre código-fonte e não toca no site ou banco de produção.
- Contexto adicional fornecido à auditoria: o dump das políticas RLS e funções de produção (seção 6), salvo como arquivo na pasta de saída da auditoria, nunca no repo, porque a RLS ainda não está versionada.
- Resultado: `findings.json` e `REPORT.md`. Todo achado `confirmed` entra no escopo deste PR ou, se for de aplicação, no PR 3, com referência ao ID do achado. Achados `needs_validation` são listados ao autor.
- Aviso de custo: a skill dispara vários agentes (hunters, críticos, verificadores).

**Passo 2. Versionar o banco (sem mudar nada em produção)**

- `npx supabase init` → `supabase/config.toml`. Desligar no config local o que não for usado.
- `supabase/migrations/`:
  - `20260101000000_initial_schema.sql`: `babies`, `sleep_sessions`, trigger `calculate_duration` e índices (conteúdo de `supabase-schema.sql`, com as políticas legadas que a migration `drop_legacy_babies_sleep_rls_policies` depois remove).
  - As 12 migrations de produção, extraídas de `supabase_migrations.schema_migrations`, com **a mesma `version`** e o mesmo nome (exceto a de reparo de dados, abaixo).
  - Migration `20260413155216` (reparo de dados): arquivo com **nome neutro** `20260413155216_repair_family_data.sql` e conteúdo no-op comentado ("reparo de dados pontual de produção; removido por conter dados pessoais"). A CLI casa migrations pela versão; o nome divergente no histórico remoto é inofensivo e **não** é alterado em produção. *(decisão do Claude)*
  - **Revisar todas as 12 em busca de dados pessoais** (UUIDs, e-mails, nomes) e higienizar da mesma forma.
- Marcar a migration inicial como aplicada em produção com `supabase migration repair --status applied 20260101000000`. Isso só toca a tabela de histórico; mostrar ao autor antes.
- Bucket `baby-avatars` e políticas de `storage.objects`: incluir em migration (ou `seed`) para que `supabase start` reproduza o ambiente.
- Verificação: `supabase db reset` local precisa terminar sem erro, e um diff do schema local contra produção (`supabase db diff --remote` ou comparação de `pg_policies`/`pg_proc`) precisa sair vazio.
- `supabase-schema.sql` é removido (substituído pelas migrations), e o README é atualizado.

**Passo 3. Migration de correção: `AAAAMMDDhhmmss_fix_family_authorization.sql`**

- S1: `drop policy "Anyone can read invite by token"`. Os owners continuam lendo via `Owner can manage invites`.
- Nova função `public.get_invite_preview(p_token text)`: `SECURITY DEFINER`, `search_path` fixo, executável por `anon` e `authenticated`. Retorna apenas `family_name`, `role`, `family_relation`, `inviter_name`, `status` (`valid|expired|revoked|accepted|not_found`). **Nunca** retorna token, IDs de usuários nem e-mails.
- Nova função `public.accept_family_invite(p_token text, p_display_name text)`: `SECURITY DEFINER`, só para `authenticated`. Numa única transação:
  1. Exige `auth.uid()`.
  2. Faz `select … for update` do convite.
  3. Valida que não foi revogado, não foi aceito e não expirou.
  4. Se o usuário já é membro da família, retorna sem alterar papel.
  5. Insere `family_members` com o papel do convite (`caregiver|viewer`, nunca `owner`).
  6. Marca `accepted_at` e `accepted_by`.
  7. Retorna `family_id`.
- S2: substituir `Self or owner can insert members` por **somente owner** (`family_id in get_user_owned_family_ids(auth.uid())`). A entrada por convite passa a ser exclusivamente via `accept_family_invite`. O caminho de criação de família, em que o criador vira owner, precisa continuar funcionando: verificar como o código cria hoje e, se o criador se insere sozinho, cobrir com uma condição específica (`exists family where id = family_id and created_by = auth.uid()` **e** `role = 'owner'` **e** a família ainda não tem membros) ou com uma função `create_family`.
- S3: trigger `BEFORE UPDATE` em `family_members`. Se `role`, `family_id` ou `user_id` mudarem e o executor não for owner da família, lança erro. Também lança erro se a mudança deixar a família sem nenhum owner. As exclusões que removam o último owner são bloqueadas por trigger semelhante.
- S6: `revoke execute … from anon, public` nas três funções helper e nas novas funções exclusivas de `authenticated`. Garantir `grant execute … to authenticated`, necessário para as políticas.
- S7: `alter function calculate_duration() set search_path = public`.
- Integridade (necessária para PR 3):
  - `create unique index … on sleep_sessions(baby_id) where end_time is null`
  - o mesmo para `breastfeeding_sessions`
  - `unique (dedupe_key)` em `notification_events` e `email_log`. Antes, verificar duplicatas existentes em produção; se houver, a migration as resolve de forma determinística e o autor é avisado.
- Compatibilidade: depois desta migration, o fluxo antigo de convite (preview e aceite via anon) quebra até o deploy do código novo. Aceitável porque não há outros usuários; avisar o autor e fazer o merge logo após aplicar.

**Passo 4. Código do PR 1**

- **Atualização de segurança antecipada** *(decisão do Claude)*: `next` → 16.4.x e `zod` → ≥ 4.6.6 entram já no PR 1 (bumps dentro da major, corrigem CVE crítico/alto), para o PR de segurança não sair com CVE crítico aberto e o `proxy.ts` ser testado na versão final. O resto das dependências segue no PR 2.
- **Conflito de sessão aberta** *(decisão do Claude)*: como o índice único de sessão aberta entra neste PR, o tratamento mínimo também entra: ao iniciar sono/amamentação, se o insert falhar por conflito (`23505`), o app busca a sessão aberta existente, sincroniza o timer com ela e mostra um toast ("Já existe um sono em andamento, iniciado por X"). O endurecimento completo do timer continua no PR 3.
- O PR 1 também inclui: a correção pendente dos READMEs (template de confirmação), `.mcp.json` e este documento de design.

- `src/middleware.ts` → `src/proxy.ts` com `export function proxy` (Next 16). Regra: **não redirecionar `/api/*`**; cada handler responde 401/403 sozinho. Público também: `/sw.js` e futuros `manifest`/ícones.
- Auditar todos os handlers em `src/app/api/**`: cada um chama `getUser()` (ou valida `CRON_SECRET`) e checa o papel quando escreve. Em especial `/api/ai/*`, que hoje dependem só da RLS.
- `/api/family/invite` GET exige `owner`. `/api/family/accept/[token]` usa as duas RPCs novas. `queries.ts` perde `getInviteByToken`/`acceptFamilyInvite` antigos.
- `/api/family/members` PATCH/DELETE: zod (`role: caregiver|viewer`), proibindo mexer no próprio papel e remover o último owner (defesa em profundidade além do trigger).
- Regenerar `src/types/database.ts` com `generate_typescript_types`, incluindo as tabelas que hoje faltam (`notification_*`, `push_subscriptions`, `email_log`) e as RPCs novas.
- Agendar `/api/notifications/dispatch` a cada 5 min com **Supabase `pg_cron` + `pg_net`**, guardando `CRON_SECRET` e a URL no **Supabase Vault**, nunca em texto na migration. A migration cria o job lendo do Vault; o autor cadastra o segredo no Vault manualmente (instrução no PR). Motivo: o plano da Vercel pode não permitir cron a cada 5 min e isso não custa nada. O e-mail semanal continua no `vercel.json`.
- **Testes pgTAP** em `supabase/tests/`, rodando com `supabase test db`, cobrindo pelo menos:
  - anon não lê `family_invites`;
  - usuário qualquer não insere a si mesmo em família alheia;
  - viewer não altera o próprio `role`;
  - convite aceito não pode ser reaceito;
  - convite expirado ou revogado é recusado;
  - aceite nunca concede `owner`;
  - família não fica sem owner;
  - viewer não escreve `sleep_sessions`;
  - caregiver de outra família não lê dados;
  - segunda sessão aberta para o mesmo bebê é recusada;
  - helpers não executáveis por anon.

**Passo 5. Auditoria de saída**

- Rodar a skill de novo (run-2), aproveitando o run-1 (ela é incremental), para confirmar que os achados `confirmed` foram resolvidos e procurar regressões no diff.
- Rodar `get_advisors` (security e performance) em produção depois de aplicar a migration; o resultado deve estar limpo, exceto S8.
- S8: instruir o autor a ligar "Leaked password protection" no dashboard.

### 8.2 PR 2 — Base de qualidade

- **Testes:** Vitest (+ `@testing-library/react`, `jsdom` quando necessário). Testes unitários de `src/lib/sleep/*` e `src/lib/feeding/*`, com prioridade para `sessionDayAllocation`, `computeNapSuggestion`, `inferNextSleepKind`, `wakeWindows`, `regression`, `computeFeedingSuggestion` e `statistics`, incluindo casos de meia-noite, fuso `America/Sao_Paulo` e horário de verão histórico. Scripts `test` e `test:db` no `package.json`.
- **CI** (`.github/workflows/ci.yml`), em PRs e na `main`: `npm ci` → lint → `tsc` → `vitest` → `build` com env fictícia → `supabase start` + `supabase test db`. Badge no README.
- **Dependências:**
  - Bumps dentro da major (exceto `next`/`zod`, já feitos no PR 1): `react`/`react-dom` 19.3.x, `lucide-react`, `resend`, `@base-ui/react` e demais minors.
  - Remover `next-intl` e `@tanstack/react-query-devtools` (0 imports).
  - Mover `@types/web-push` e `shadcn` para devDependencies. Verificar que `@import "shadcn/tailwind.css"` continua funcionando no build; senão, vendorizar o CSS.
  - Majors (`openai` 7, `framer-motion` 14, `@hookform/resolvers` 7, `react-day-picker` 10, `web-push` 4, `eslint` 10, `@types/node` alinhado ao Node usado): **uma major por commit**, cada uma com lint/tsc/test/build verdes. Se alguma exigir reescrita desproporcional, fica fora e é listada no PR.
  - `typescript` 7: avaliar; se quebrar ferramentas (eslint/next), manter 5.x e registrar o motivo.
  - Meta: `npm audit --omit=dev` sem críticas nem altas.
- `.env.example` com todas as variáveis do README (exceção `!.env.example` no `.gitignore`).
- `LICENSE` MIT, `Copyright (c) 2026 engviniciusbs`.
- Remover os SVGs do template em `public/` (`file`, `globe`, `next`, `vercel`, `window`).
- Corrigir o erro de lint em `SleepTimer.tsx:160` e os 3 warnings.

### 8.3 PR 3 — Correções da aplicação

- **Timer e sessões:**
  - Só tratar como "parado por outro cuidador" uma resposta **bem-sucedida** sem linhas para aquele `sessionId`. Erro de rede não para o timer.
  - Estado do timer **por bebê** no store, migrando a chave `soninho-timer` do localStorage sem perder um timer em andamento.
  - Encerrar sessão com `.is("end_time", null)` (uma parada tardia não sobrescreve).
  - Iniciar sessão tratando o conflito do índice único: mostrar ao usuário que já existe um sono em andamento e sincronizar com ele.
  - O mesmo vale para amamentação.
- **Fuso horário:** relatórios (`sleepReport.ts`, `weekly.ts`) e estatísticas usadas no servidor calculam dias no fuso do usuário (`notification_preferences.timezone`, padrão `America/Sao_Paulo`) com `date-fns-tz`.
- **IA:**
  - zod com no máximo 20 mensagens × 2.000 caracteres, papéis `user|assistant`;
  - `getUser()` e checagem de acesso ao bebê;
  - **cota diária por usuário guardada no banco**: tabela `ai_usage(user_id, day, count)` mais uma RPC atômica de incremento; limite inicial de 50 chamadas/dia somando as rotas de IA, configurável por constante. Excedeu → 429 com mensagem em PT-BR.
- **Open redirect:** helper `safeRedirectPath(value)` (aceita só caminhos começando com `/`, sem `//` nem `/\`), usado em `/auth/callback` e no login.
- **Push:**
  - helper único e lazy para VAPID (`src/lib/notifications/webpush.ts`), usado nos 3 lugares; env ausente só desativa push;
  - nome do bebê lido do banco nas rotas de atividade;
  - desativar inscrições com 404/410 também no push para a família;
  - corrigir o ícone `/icons/icon-192.png` (gerar o asset a partir de `public/brand` ou apontar para um existente);
  - dispatch notifica **todos os membros owner/caregiver** com notificações ativas, não só `babies.user_id`;
  - dispatch em lote (menos queries por usuário);
  - dedupe com `insert … on conflict do nothing`.
- **Relatório sob demanda:** dedupe pelo `unique(dedupe_key)`.
- **Validação e erros:**
  - zod em todas as rotas que hoje usam `as`;
  - `limit` com teto em `/api/family/activity`;
  - `timezone` validado como IANA;
  - `end_time >= start_time` (na rota e com `check` no banco, se não houver dados violando);
  - respostas de erro genéricas para o cliente, com detalhe só no `console.error`.
- **Docs:** README PT/EN atualizado (migrations, testes, CI, `proxy.ts`, cron via pg_cron, cota da IA).
- Testes Vitest para os helpers novos (`safeRedirectPath`, validações, cota da IA, timer por bebê).

### 8.4 PR 4 — Refatoração

Critério: arquivo com mais de ~300 linhas ou com responsabilidades misturadas é dividido; comportamento e visual se mantêm iguais.

- `settings/page.tsx` (794 linhas, 20 `useState`): uma seção por aba (`general`, `notifications`, `tools`) em componentes próprios, mais hooks de dados (`useBabySettings`, `useNotificationSettings`), com react-hook-form + zod onde há formulário.
- `SleepTimer.tsx` (733) dividido em subcomponentes (display, ações, início retroativo, revisão).
- `useSleepTimer` e `useBreastfeedingTimer`: extrair a base comum (`useElapsedTimer` / sincronização com sessão ativa) e eliminar os `eslint-disable` de dependências corrigindo-as de verdade.
- `SleepForm`/`FeedingForm`: extrair campos e lógica compartilhada.
- `src/lib/supabase/queries.ts` (530) dividido por domínio (`sleep`, `family`, `notifications`, `profile`), mantendo `feedingQueries.ts`.
- `LandingPage.tsx` (549), `EnvironmentPicker.tsx` (498), `FamilySettings.tsx` (478): dividir em seções.
- Zero `eslint-disable` sem justificativa escrita.
- Os testes do PR 2 e PR 3 precisam continuar verdes. Para os componentes refatorados mais críticos (timer, settings), adicionar testes de componente antes de refatorar.

## 9. Decisões deixadas ao construtor

- Nomes exatos de arquivos, funções e branches, desde que sigam o padrão acima.
- Estrutura interna dos testes pgTAP e Vitest.
- Divisão em commits dentro de cada PR. Preferência: commits pequenos com mensagens convencionais (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`).
- Se um achado da skill `security-audit` exigir mudança fora do escopo descrito, o construtor o inclui no PR mais adequado e registra o motivo; se mudar o comportamento do produto, pergunta ao autor.

## 10. Ações operacionais (executadas pelo Claude quando possível)

Todas pré-aprovadas pelo autor. Se alguma não puder ser automatizada, o Claude informa ao final do PR, explicando o motivo e o passo exato.

1. `CRON_SECRET` no Supabase Vault: se o valor atual não estiver acessível, gerar um novo e atualizar a Vercel (`vercel env`, se a CLI estiver autenticada) e o Vault juntos.
2. Ligar "Leaked password protection": via Management API do Supabase com o token da CLI, se o plano permitir.
3. Conferir as variáveis de ambiente da Vercel (VAPID, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`).
