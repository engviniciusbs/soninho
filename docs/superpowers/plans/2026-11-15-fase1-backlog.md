# Fase 1 — backlog herdado do PR 1

Itens adiados durante a execução do PR 1 (#1). Entram nos planos dos PRs 2–4.

## PR 2 — Base de qualidade ✅ (concluído no #2)
- Testes Vitest para `safeRedirectPath` (`src/lib/safeRedirect.ts`), cobrindo pelo menos:
  - Devem voltar para `/app`: `/\t/evil.com`, `/\t\\evil.com`, `//evil.com`, `/\\evil.com`, `/\r\n//evil.com`, `https://evil.com`, `@evil.com`, `""`, `null`, `/.//evil.com`, `/..//evil.com`, `/a/../..//evil.com`, `/%2e%2e//evil.com`.
  - Devem passar inalterados: `/app`, `/history?x=1`, `/invite/abc#top`, `/%2F%2Fevil.com`.
  - Deve normalizar: `/a/./b` → `/a/b`.
- Atualizar `eslint-config-next` para 16.4.x e corrigir os 5 erros novos de `react-hooks`. Fixar a versão de `next` junto (hoje é caret, enquanto `eslint-config-next` está pinado).
- `npm audit`: 1 crítica e 12 altas restantes, quase todas via `shadcn` (MCP SDK). Mover `shadcn` para devDependencies ou vendorizar o CSS.
- Documentar a convenção de migrations: o `revoke` global de default privileges exige `grant execute … to authenticated` explícito para funções fora de `public`.
- `integrity.test.sql:57`: filtrar a contagem de constraints únicas pelo nome.
- Guard triggers: trocar `for update` por `for no key update`.

## PR 3 — Correções da aplicação ✅ (concluído no #3)
Tudo da lista original foi tratado: tokens hex com `encodeURIComponent`, allowlist de push, cota de IA e limites do chat, CSV, timers por bebê, estados da página de convite, 404 em rotas sem efeito, mapeamento de erros por `code`, zod e mensagens PT-BR, `guard_baby_change`, último owner, `proxy.ts` (prefixo `/auth`, query string, headers de cache), revoke de EXECUTE nos triggers, e-mail próprio imutável em `family_members` e dispatch para owners e caregivers. O item "owner insere uid arbitrário na família" foi fechado pelo Task 2 (membros só entram por convite ou pela RPC de criação de bebê).

### Ficou de fora do PR 3 (motivo)
- **Cota de IA consumida antes da busca do bebê:** uma requisição para bebê inexistente gasta cota. Impacto baixo; mover exigiria reordenar a rota.
- **Claim de e-mail gravado como `sent` antes do envio:** uma falha no envio deixa o registro como enviado (evita duplicados, ao custo de possível perda). Exige um estado intermediário.

### Herdado do PR 2 (parcialmente resolvido)
- Headers anti-cache do `setAll` aplicados no `proxy.ts`.
- **Testes** ainda pendentes: limites exatos das faixas de intervalo de mamada (13/19/27/39 semanas), limites de 20 min/8 h dos intervalos válidos, empate `now == sugerido`.

## PR 4 — Refatoração ✅ (concluído no #4)
Itens abaixo tratados (timers com `useNow`, split do SleepTimer/Settings/queries, formulários compartilhados, zero `eslint-disable`, calendar removido, CI fixado por SHA, testes de componente).
- Card de regressão: marcar a chave diária também quando a IA falhar (hoje uma falha da OpenAI faz cada abertura gastar cota); erro do RPC da cota não deveria esconder o card.
- Formulários: limpar o erro de "fim antes do início" também ao mudar a data de fim. (herdado dos PRs 1–2)
- `useWatch` no lugar de `watch()` em `SleepForm`/`FeedingForm`; remover os `eslint-disable` com `TODO(PR4)`.
- Reescrever `useBreastfeedingTimer`: o `tick()` sombreia o estado, e a checagem de tick não compara os totais por lado.
- `useWakeWindow`: o relógio fica congelado quando não há sono concluído.
- `WakeWindowBadge`: o "Dormindo" fica ~2 s atrás do timer principal.
- Mismatch de hidratação no balão de horário de fallback do `SleepTimer`.
- Justificar ou remover os `eslint-disable exhaustive-deps` antigos (`SleepForm.tsx:148`, `BabyProvider.tsx:65`).
- `react-day-picker` e `src/components/ui/calendar.tsx` não são usados: remover, ou usar na Fase 2.
- CI: `actions/checkout` e `setup-node` v7 e fixar por SHA.

## Para a Fase 2
- Selects fechados mostram o valor cru (ex.: `NIGHT_SLEEP`) em vez do rótulo em PT-BR.
- Task 8 (menores): o teste de cota usa spy em `console`; `useSleepExport` deveria resetar o estado num `finally`.
- Testes pendentes herdados do PR 2: limites exatos das faixas de intervalo de mamada (13/19/27/39 semanas), limites de 20 min/8 h dos intervalos válidos, empate `now == sugerido`.

## Fase 2 — PR 1, correções da varredura ✅ (branch `fase2/01-correcoes`)
Spec: `docs/superpowers/specs/2026-11-16-correcoes-fase2-design.md`. Resolvido neste PR:
- Datas locais em todo lugar ("hoje" na IA, na regressão e no e-mail é o dia local, não o UTC); migration de `babies.sex`, `breastfeeding_sessions.side_started_at` e RPCs `create_baby_with_family`/`delete_baby`.
- Sono: madrugada e fim de tarde viram sono noturno, sem aviso de soneca à noite; a regra da madrugada só vale de noite ou até 6 h depois do despertar; virada de dia certa em horário de verão.
- Previsão acompanha o relógio; "previsto" é sempre o meio da janela (home, folha e feedback concordam).
- Análise: regressão, débito, Sono 24h e números do período só com dias completos (os mesmos P dias do débito) e com o sono em andamento; "Maior trecho noturno" cai para a última noite; os números andam com o relógio.
- Peito encerrado em outro celular grava o tempo certo por lado.
- Avisos desligados ficam desligados; atividade da família respeita o silêncio; resumo semanal para a família toda, semana até ontem.
- Cota de IA barra antes da OpenAI e só conta quando o stream começa (resolve "cota consumida antes da busca do bebê", do PR 3).
- Bebês: exportação CSV completa (lê até a página vazia), exclusão só por owner, segundo bebê na mesma família, aviso claro para quem tem várias famílias.
- Acesso: babá registra comida e gerencia avisos; viewer só vê (sem link morto, sem feedback); `useCanWrite` falha aberto; sair limpa o dispositivo, não trava na rede lenta e não roda duas vezes.
- Textos com o gênero do bebê (forma neutra com `sex` nulo), "Mais" no lugar de Configurações, unidades em pt-BR; formulário de bebê, estrelas, ícones da marca (toast de erro com alerta) e reação do bebê com "Não informar".
- Seed local ganhou `viewer@soninho.local` (fictício).

### Ficou para depois (follow-ups)
- Avatar do bebê fica no bucket público depois da exclusão (limpar o storage no `delete_baby` ou numa rotina).
- Precisão: os números do período já usam minutos exatos, mas o débito e a regressão ainda arredondam cada dia a 0,1 h (`buildCompleteDailySleepTotals`); "sono por dia" e a média do débito podem diferir por alguns minutos.
- Consultas do resumo semanal por e-mail não são paginadas (limite de 1000 linhas do PostgREST).
- Mais › Bebês: o lápis some só para os bebês da família ativa em que a pessoa é viewer; para outras famílias a tela não sabe o papel (falha aberta).
- Fim da janela de soneca: a regra "última soneca terminou depois do corte → noite" ainda olha só a hora do fim, sem checar se foi hoje (mesmo tipo de regra sem limite da madrugada, caso raro).
- Peito (baixo, a família não amamenta mais): toast errado ao parar logo depois de trocar de lado; divisão com troca antiga; editar `start_time` de sessão aberta.
- `FeedingSuggestionCard` com contagem congelada (o PR de comida vai substituir); `last-session-key` sem polling para registros manuais de outro celular.
- `analyzeSleep` usa 168 h e não 7 chaves de dia; babá recebe o resumo semanal (aceito: pode desligar); `StarRating` com `label` e `labelledBy` redundantes.

## Ações operacionais pendentes
- Ligar **"Leaked password protection"** em Supabase → Authentication → Passwords. Não foi possível automatizar: o token da CLI fica no keyring. Pode exigir plano pago.
