/**
 * Rotas que a babá pode abrir (spec §8.2): Início, Mais e, dentro do Mais,
 * só o Perfil. A comparação é exata, sem prefixo: qualquer subrota ou
 * caminho com `..` fica de fora e o guard manda para `/app`.
 */
const NANNY_ALLOWED: ReadonlySet<string> = new Set(["/app", "/more", "/more/profile"]);

export function isNannyAllowed(pathname: string): boolean {
  return NANNY_ALLOWED.has(pathname);
}
