import type { ComponentType } from "react";
import {
  IconBottle,
  IconChart,
  IconHome,
  IconList,
  IconMore,
  type IconProps,
} from "@/components/brand/icons";

export interface NavLink {
  href: string;
  label: string;
  icon: ComponentType<IconProps>;
}

/** As 5 abas do menu (spec §8.2), na mesma ordem no mobile e no desktop. */
export const ALL_NAV_LINKS: NavLink[] = [
  { href: "/app", label: "Início", icon: IconHome },
  { href: "/feeding", label: "Comida", icon: IconBottle },
  { href: "/history", label: "Registro", icon: IconList },
  { href: "/analytics", label: "Análise", icon: IconChart },
  { href: "/more", label: "Mais", icon: IconMore },
];

const NANNY_TABS = new Set(["/app", "/feeding", "/more"]);

/** Modo babá: Início (timer e recados), Comida e Mais (onde ela vê Notificações e Perfil). */
export function getNavLinks(nannyMode: boolean): NavLink[] {
  if (!nannyMode) return ALL_NAV_LINKS;
  return ALL_NAV_LINKS.filter((l) => NANNY_TABS.has(l.href));
}

/** A aba fica ativa na própria rota e nas subrotas dela (`/more/family` acende Mais). */
export function isNavLinkActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(href + "/");
}
