# Soninho — Correções da varredura (Fase 2, PR 1)

- **Data:** 2026-11-16
- **Autor:** engviniciusbs (com Claude)
- **Status:** aprovado pelo autor ("sim, pode iniciar")
- **Origem:** varredura de quatro revisores independentes sobre `main` (189872a): lógica de sono, avisos/e-mail/IA, dados/APIs e telas/textos.
- **Escopo:** os itens 1–16 e 18–22 abaixo, mais as três decisões do autor (§3).
- **Fora deste PR:** o item 17 ("mamada" para uma bebê de 9 meses) e a correção do texto do aviso noturno, que entram no PR seguinte, da introdução alimentar (`docs/superpowers/specs/2026-11-16-introducao-alimentar-design.md`, na branch `fase2/01-comida`). Neste PR, o aviso de soneca **não** sai quando o próximo sono é noturno (ver item 6).

## 1. Intenção

A família usa o app todo dia. A varredura achou dois tipos de problema:
- números e previsões que contradizem o que os pais veem;
- dados gravados errado quando duas pessoas usam o app.

Antes de adicionar a introdução alimentar, o objetivo é que tudo o que já existe seja correto e coerente.

## 2. Restrições (iguais às da Fase 1 e do redesign)

- **Plataforma:** Next.js 16.4. Ler `node_modules/next/dist/docs/` antes de escrever código.
- **Banco:**
  - Supabase com RLS e pgTAP;
  - DDL só por migration em `supabase/migrations/`, aplicada em produção com `npx supabase db push --remote` depois de backup em `~/soninho-backups/<data>/`;
  - nada é apagado e colunas novas são aditivas.
- **Visual:** sistema do redesign (tokens `sn-*`, primitivos em `src/components/ui`, ícones em `src/components/brand/icons`) e o Floor da Hallmark.
- **Testes:**
  - todo bug corrigido ganha um teste que falha antes e passa depois;
  - testes que afirmam comportamento errado são corrigidos e o motivo é registrado.
- **Gates:** lint 0, `tsc`, `npm test`, build, `supabase test db`, CI verde.
- **Fuso:** dias são locais (`America/Sao_Paulo`, ou o fuso do dispositivo ou das preferências). O servidor roda em UTC.

## 3. Decisões do autor

1. **Babá:**
   - ganha acesso a Comida (`/feeding`) e Notificações (`/more/notifications`);
   - Registro, Análise, Família, Bebês, IA e Relatórios continuam fechados para ela;
   - a navegação dela fica Início, Comida e Mais, e o Mais mostra Notificações e Perfil.
2. **Gênero do bebê:**
   - campo novo `babies.sex text null check (sex in ('F','M'))`, editável no formulário do bebê, com as opções Menina, Menino e Não informar;
   - os textos que concordam em gênero usam um helper `g(baby, { f, m, n })`, com a forma neutra quando o campo é nulo;
   - a migration preenche só o bebê de produção da família do autor como `'F'`, por id. O id é lido no momento da migration, por nome e família, e registrado no PR. Os demais ficam nulos.
3. **Segundo bebê:**
   - entra na família de quem o cria quando essa pessoa é owner de uma família; se ela for owner de mais de uma, usa a família do bebê ativo;
   - só cria família nova quando a pessoa não é owner de nenhuma;
   - mudança na RPC `create_baby_with_family` (parâmetro opcional `p_family_id`, validado como owner), com pgTAP.

## 4. Itens

Cada item traz o problema, a causa e a correção esperada. Os números de linha são da `main` no momento da varredura.

### Dados e números (🔴)

1. **Peito encerrado em outro celular grava menos minutos.**
   - **Onde:** `store/feedingStore.ts:136` (`restoreBreastSession`), `hooks/useBreastfeedingTimer.ts:146`, `lib/supabase/feedingQueries.ts:131`.
   - **Causa:** na restauração, `sideStartedAt` = agora, então o tempo do lado em andamento se perde. O stop sobrescreve os totais com os valores locais menores. `updateBreastfeedingSides` não tem guarda `.is("end_time", null)` e ignora o erro.
   - **Correção:**
     - persistir o início do lado atual (coluna `side_started_at timestamptz null` em `breastfeeding_sessions`, atualizada a cada troca e no início);
     - restaurar a partir dela; parar soma o tempo desde ela;
     - guarda `end_time is null` em toda atualização de lados, com erro verificado.
   - **Teste:** começa às 10:00 em A; B restaura às 10:15 e para às 10:20 → `side_left_sec` = 1200.
2. **Previsão da home congelada e nunca "atrasada".**
   - **Onde:** `hooks/useAISuggestions.ts:55-60`, `components/sleep/SleepTimer.tsx:227-236`.
   - **Correção:**
     - o servidor devolve horários absolutos (ISO);
     - o cliente calcula "em X min" e "atrasado" pelo relógio de 60 s (`useNow`);
     - o fallback sem sugestão usa o meio da janela de vigília, como a sugestão (item 6 da varredura de sono: hoje usa o fim e pula ~30 min).
   - **Teste:** a mesma sugestão vista às 10:00 e às 11:45 mostra "Em cerca de 1h 30min" e depois "Agora / Já passou".
3. **Despertar de madrugada vira "Soneca, agora".**
   - **Onde:** `lib/sleep/inferNextSleepKind.ts:367-396`, `computeNapSuggestion.ts:108-118`, `SleepTimer.tsx:73-79`.
   - **Correção:**
     - se o último sono noturno terminou entre 19:00 e 05:00 locais, o próximo é `NIGHT_SLEEP`;
     - se a janela calculada termina às 18:00 ou depois, é `NIGHT_SLEEP` independentemente do `nowHour`;
     - `minutesUntilClock` rola para o dia seguinte quando o horário já passou;
     - o seletor não é trocado automaticamente para Soneca durante a madrugada;
     - `estimateWakeTime` só considera fins de noite entre 04:00 e 10:00;
     - corrigir o teste `inferNextSleepKind.test.ts:56`, que afirma NAP às 17:30.
4. **"Possível regressão" falso toda manhã e "Débito de sono" inflado.**
   - **Onde:** `lib/sleep/regression.ts:29,95`, `app/api/ai/regression/route.ts:61-62`, `components/analytics/useAnalyticsData.ts:68`.
   - **Correção:**
     - só dias locais completos, no fuso recebido;
     - sono em andamento com fim provisório (`withProvisionalEnd`);
     - mesma regra no débito de "Mais números".
   - **Teste:** bebê regular de 13,5 h/dia, às 07:00 → `detected=false`, débito ≈ 0.
5. **"Sono 24h" e "Maior trecho noturno" despencam à noite.**
   - **Onde:** `lib/sleep/statistics.ts:107-118,202-207`, `app/(dashboard)/analytics/numbers/page.tsx`.
   - **Correção:**
     - "Sono 24h" soma a sobreposição de cada sono com as últimas 24 h, incluindo o em andamento;
     - "Maior trecho noturno" só considera `NIGHT_SLEEP` terminado.
6. **Aviso de soneca antes do sono noturno.**
   - **Onde:** `lib/notifications/selectAlerts.ts:105-128`.
   - **Correção neste PR:** usar a mesma inferência do app (item 3) e **não enviar** `NAP_SOON`/`OVERDUE` quando o próximo sono é noturno. O aviso próprio de sono noturno vem no PR da comida.
   - **Teste:** 9 meses, último sono às 15:00, agora 18:10 → nenhum aviso de soneca.
7. **Datas um dia antes (fuso).**
   - **Onde:**
     - `lib/ai/analyzeSleep.ts:112-121,213`: chaves de dia formatadas duas vezes no fuso;
     - `new Date("YYYY-MM-DD")` em `lib/utils.ts:37` (`getBabyAge`), `computeNapSuggestion.ts:215`, `regression.ts:88`, `WhyThisTimeSheet.tsx:73`, `settings/BabiesSettings.tsx:71`.
   - **Correção:**
     - um helper único `parseLocalDate("YYYY-MM-DD")` (date-fns `parseISO`), usado em todo lugar;
     - chaves de dia com `formatInTimeZone(nowUtc, tz, …)` e aritmética de string, como `reportPeriod.ts`.
   - **Teste:** com `TZ=UTC` e fuso SP, a IA vê hoje; o nascimento 2026-02-10 aparece 10/02.
8. **E-mail semanal.**
   - **Onde:** `lib/email/weekly.ts:19-48`, `lib/email/sleepReport.ts:118,180,245`, `emails/WeeklyReport.tsx:447`, `vercel.json`.
   - **Correção:**
     - destinatários por família (owners e caregivers), não por `babies.user_id`;
     - sem linha de preferência conta como ligado;
     - período termina ontem; sessões buscadas por sobreposição;
     - maior noite por sessão;
     - "Média soneca" passa a ser a duração média da soneca;
     - textos "Mais → Notificações" e "Mais → Relatórios".

### Comportamento (🟠)

9. **Desligar alertas não persiste.**
   - **Onde:** `app/api/notifications/subscribe/route.ts:61`, `hooks/usePushNotifications.ts:46`.
   - **Correção:** o subscribe só cria a linha de preferência se ela não existir. Teste.
10. **Avisos de atividade da família.**
    - **Onde:** `lib/notifications/familyActivity.ts:52-60`, `public/sw.js:29,44`, `app/api/family/activity/route.ts:48-67`, `hooks/useFamilyActivityToasts.ts:46-48,111`.
    - **Correção:**
      - respeitar o horário de silêncio de cada destinatário;
      - `requireInteraction` só para `OVERDUE`;
      - a resposta inclui `actor_user_id` e `kind`;
      - ações próprias são ignoradas;
      - itens de comida usam o formatador de comida;
      - `lastSeenId` é reiniciado ao trocar de bebê;
      - `notificationclick` cai para `openWindow` quando `navigate` falha.
11. **Exportação CSV corta em 1000 linhas.**
    - **Onde:** `hooks/settings/useSleepExport.ts:38`.
    - **Correção:** paginar com `.range()` até o fim e verificar erro (com aviso de erro, não "nenhum registro"); `finally` reinicia o estado (pendência da Fase 1).
12. **Excluir bebê como não-owner.**
    - **Onde:** `hooks/settings/useBabySettings.ts`, `components/settings/BabiesSettings.tsx`.
    - **Correção:**
      - botão só para owner;
      - `.delete().select()` confere a linha;
      - ao excluir o último bebê de uma família, a família também é excluída (cascade de membros, convites e recados), por RPC com pgTAP.
13. **Papel "Só visualizar" vê controles de escrita.**
    - **Correção:**
      - um hook `useCanWrite()` (owner/caregiver) esconde iniciar, registrar, editar e excluir em home, Comida e Registro;
      - viewer vê os dados e um aviso discreto "Você tem acesso só para ver".
14. **Telas desatualizadas após mudanças.**
    - **Onde:** `components/sleep/SleepForm.tsx:188,274`, `hooks/useAISuggestions.ts:18`.
    - **Correção:**
      - um helper `invalidateSleepQueries(queryClient, babyId)` usado por SleepForm, timer e exclusões (sessões, last-session, last-session-key, ai-suggestion, regression);
      - sem timer local, a home consulta a sessão aberta a cada 30 s com a tela visível e adota o sono iniciado por outro cuidador.
15. **IA.**
    - **Onde:** `app/api/ai/chat/route.ts:31`, `components/ai/AIInsights.tsx:44`, `lib/ai/prompts.ts:8`.
    - **Correção:**
      - `retry: false` para 429 e erros da IA;
      - mensagem de limite diário no 429;
      - cota cobrada só quando o stream começa;
      - prompt usa a idade real, nunca "recém-nascidos".
16. **Logout.**
    - **Onde:** `components/settings/SignOutButton.tsx`, `components/layout/TopBar.tsx:71`.
    - **Correção:**
      - remover o botão de sair do topo (fica só em Mais › Perfil);
      - ao sair: cancelar a inscrição de push deste dispositivo, limpar os stores de timer e o gate de regressão local.

### Telas e textos (🟡)

18. **Gênero:** aplicar o helper da decisão 2 em todos os textos que concordam em gênero ("acordada/o", "sozinha/o", "dela/dele", "minha bebê", o prompt da IA). Formas neutras quando o campo é nulo.
19. **"Configurações" nos textos:** trocar por "Mais" nos toasts de "adicione um bebê" (`BottleQuickLog.tsx:41`, `SolidFeedingLog.tsx:58`, `useSleepTimer.ts:90`, `useBreastfeedingTimer.ts:102`) e nos e-mails. Os mesmos toasts passam a oferecer o link para `/more/babies`.
20. **Unidades:**
    - horas sempre no formato "10h 54min" via o formatador único (`formatDuration`), inclusive em Análise e gráficos (rótulos de eixo podem usar "11h");
    - números decimais com vírgula (`Intl.NumberFormat('pt-BR')`) em temperatura, TOG e qualquer decimal exibido.
21. **Redesign incompleto:**
    - `BabyProfileForm` e o diálogo de excluir bebê no sistema, com rótulos ligados aos campos e título no padrão;
    - ícones lucide restantes nas telas logadas e em `ui/dialog`, `ui/sheet`, `ui/select`, `ui/sonner` trocados pelos da marca (adicionar os que faltarem);
    - qualidade do sono com o mesmo controle (estrelas) no PostSleepReview e no SleepForm;
    - selects do SleepForm podem ser limpos;
    - o campo livre "Local", que duplica "Como adormeceu?", sai da tela (a coluna continua);
    - "Noite" vs "Sono noturno": usar "Sono noturno" em títulos e "Noite" só no filtro curto;
    - títulos distintos "Editar sono" e "Editar alimentação";
    - "mural/equipe/recados" unificado como "Recados";
    - o papel de cuidador passa a dizer "Pode registrar sono e alimentação";
    - excluir bebê avisa sobre todos os registros.
22. **Teclado:** remover `onKeyDown` redundante onde há `onClick` em botões nativos (`SleepForm.tsx:372`, `TempStepper.tsx:37-84` e semelhantes), com teste de que Enter abre uma vez.

### Desta varredura, mas fora deste PR

- **Item 17:** "mamada" para uma bebê de 9 meses, e o aviso próprio de sono noturno. Vão para o PR da introdução alimentar.
- **Páginas fora do redesign:** convite, login e cadastro com ícones lucide e manchas roxas. Ficam para quando a landing e o login forem redesenhados.
- **Logo repetido no desktop:** a home repete a marca que já está na barra lateral. Ajuste pequeno, incluído no item 21 se couber.

## 5. Abordagem

Uma única abordagem faz sentido: corrigir dentro do código atual, um grupo de itens por tarefa, cada bug com teste. Há duas migrations aditivas:
- `babies.sex`;
- `breastfeeding_sessions.side_started_at`.

Há também uma mudança na RPC `create_baby_with_family` e uma RPC nova para excluir a família vazia. Não há alternativa razoável que preserve os dados e corrija os comportamentos.

## 6. Deixado ao construtor

- Agrupamento exato das tarefas e nomes de helpers.
- O texto do aviso de "só visualizar".
- Onde a babá vê Notificações no Mais, mantendo a ordem dos grupos.
