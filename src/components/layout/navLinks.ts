import {
  Home,
  List,
  BarChart3,
  Sparkles,
  Settings,
  type LucideIcon,
} from "lucide-react";

export interface NavLink {
  href: string;
  label: string;
  icon: LucideIcon;
  mobileLabel?: string;
}

export const ALL_NAV_LINKS: NavLink[] = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/history", label: "Registro", icon: List },
  { href: "/analytics", label: "Análise", icon: BarChart3 },
  { href: "/ai-insights", label: "IA Insights", icon: Sparkles, mobileLabel: "IA" },
  { href: "/settings", label: "Configurações", icon: Settings, mobileLabel: "Config" },
];

/** Modo babá: só início (timer + recados) e configurações. */
export function getNavLinks(nannyMode: boolean): NavLink[] {
  if (!nannyMode) return ALL_NAV_LINKS;
  return ALL_NAV_LINKS.filter(
    (l) => l.href === "/app" || l.href === "/settings"
  );
}
