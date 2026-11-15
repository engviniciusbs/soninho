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

## PR 4 — Refatoração (herdado dos PRs 1–2)
- `useWatch` no lugar de `watch()` em `SleepForm`/`FeedingForm`; remover os `eslint-disable` com `TODO(PR4)`.
- Reescrever `useBreastfeedingTimer`: o `tick()` sombreia o estado, e a checagem de tick não compara os totais por lado.
- `useWakeWindow`: o relógio fica congelado quando não há sono concluído.
- `WakeWindowBadge`: o "Dormindo" fica ~2 s atrás do timer principal.
- Mismatch de hidratação no balão de horário de fallback do `SleepTimer`.
- Justificar ou remover os `eslint-disable exhaustive-deps` antigos (`SleepForm.tsx:148`, `BabyProvider.tsx:65`).
- `react-day-picker` e `src/components/ui/calendar.tsx` não são usados: remover, ou usar na Fase 2.
- CI: `actions/checkout` e `setup-node` v7 e fixar por SHA.

## Ações operacionais pendentes
- Ligar **"Leaked password protection"** em Supabase → Authentication → Passwords. Não foi possível automatizar: o token da CLI fica no keyring. Pode exigir plano pago.
