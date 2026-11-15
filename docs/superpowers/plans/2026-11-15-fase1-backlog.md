# Fase 1 — backlog herdado do PR 1

Itens adiados durante a execução do PR 1 (#1). Entram nos planos dos PRs 2–4.

## PR 2 — Base de qualidade
- Testes Vitest para `safeRedirectPath` (`src/lib/safeRedirect.ts`), cobrindo pelo menos:
  - Devem voltar para `/app`: `/\t/evil.com`, `/\t\\evil.com`, `//evil.com`, `/\\evil.com`, `/\r\n//evil.com`, `https://evil.com`, `@evil.com`, `""`, `null`, `/.//evil.com`, `/..//evil.com`, `/a/../..//evil.com`, `/%2e%2e//evil.com`.
  - Devem passar inalterados: `/app`, `/history?x=1`, `/invite/abc#top`, `/%2F%2Fevil.com`.
  - Deve normalizar: `/a/./b` → `/a/b`.
- Atualizar `eslint-config-next` para 16.4.x e corrigir os 5 erros novos de `react-hooks`. Fixar a versão de `next` junto (hoje é caret, enquanto `eslint-config-next` está pinado).
- `npm audit`: 1 crítica e 12 altas restantes, quase todas via `shadcn` (MCP SDK). Mover `shadcn` para devDependencies ou vendorizar o CSS.
- Documentar a convenção de migrations: o `revoke` global de default privileges exige `grant execute … to authenticated` explícito para funções fora de `public`.
- `integrity.test.sql:57`: filtrar a contagem de constraints únicas pelo nome.
- Guard triggers: trocar `for update` por `for no key update`.

## PR 3 — Correções da aplicação
- **Tokens de convite em base64** podem conter `/`, `+` e `=`, o que quebra `/invite/[token]` em cerca de 40% dos casos. Gerar com default hex/base64url e usar `encodeURIComponent`.
- **SSRF via endpoint de push** (auditoria, low): allowlist dos hosts de push (FCM, Mozilla, Windows, Apple).
- **IA:** cota por usuário e limites de mensagens (já está no design). Hoje os viewers também chamam a IA.
- **Export CSV:** escapar aspas e neutralizar prefixos `= + - @`.
- **Timer:**
  - `restoreBreastSession` não define `activeBabyId`;
  - fazer retry quando a sessão ativa vier nula logo após um 23505;
  - rascunhos locais podem ser gravados na sessão de outro cuidador ao parar;
  - store por bebê.
- **Página de convite:** tratar `status` (aceito, expirado, revogado) com mensagens específicas.
- **Rotas que não alteram nada:** retornar 404 quando nenhuma linha foi afetada (revogação de convite, PATCH/DELETE de membro).
- **Mapeamento de erros:** usar `code` em vez de substring da mensagem.
- **Validação e consistência:**
  - zod no `role` do POST de convite;
  - padronizar mensagens de erro em PT-BR;
  - remover o parâmetro não usado `user_id` de `createBaby`;
  - `Baby.avatar_emoji` nullable ou `NOT NULL`.
- **`guard_baby_change`:** proibir `family_id = NULL` quando já existe família. Também remover o fallback `created_by` da policy de leitura de `families`.
- **Remoção de owner:** checagem no app de "último owner" no DELETE de membros (hoje só o trigger impede).
- **`proxy.ts`:** o prefixo `/auth` também casa `/authors`, e o redirect para o login perde a query string.
- **Funções de trigger:** revogar `EXECUTE` de `authenticated` em `guard_baby_change` e `guard_family_member_change` (alerta do Supabase).
- **Pendências estacionadas no PR 1:**
  - owner consegue inserir um uid arbitrário na própria família (expõe `user_profiles`);
  - membro consegue editar o próprio `email` em `family_members`.
- **Dispatch:** notificar todos os owners e caregivers e consolidar as queries (já está no design). O aviso de segredo ausente fica silencioso em produção.

## Ações operacionais pendentes
- Ligar **"Leaked password protection"** em Supabase → Authentication → Passwords. Não foi possível automatizar: o token da CLI fica no keyring. Pode exigir plano pago.
