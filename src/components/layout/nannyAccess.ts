/**
 * Rotas que a babá pode abrir (spec §8.2, correções fase 2, decisão 1):
 * Início, Comida, Mais e, dentro do Mais, Notificações e Perfil. A comparação
 * é exata, sem prefixo: qualquer subrota ou caminho com `..` fica de fora e o
 * guard manda para `/app`.
 */
const NANNY_ALLOWED: ReadonlySet<string> = new Set([
  "/app",
  "/feeding",
  "/more",
  "/more/notifications",
  "/more/profile",
]);

export function isNannyAllowed(pathname: string): boolean {
  return NANNY_ALLOWED.has(pathname);
}
