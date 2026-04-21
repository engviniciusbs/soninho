"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, BarChart3, Sparkles, Settings } from "lucide-react";
import { SoninhoLogo } from "@/components/brand/SoninhoLogo";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/history", label: "Registro", icon: List },
  { href: "/analytics", label: "Análise", icon: BarChart3 },
  { href: "/ai-insights", label: "IA Insights", icon: Sparkles },
  { href: "/settings", label: "Configurações", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
        <SoninhoLogo href="/app" markSize={34} textClassName="text-lg" />
      </div>

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-0.5 p-3">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-indicator"
                  className="absolute inset-0 rounded-xl bg-primary/12"
                  transition={{ type: "spring", stiffness: 500, damping: 38 }}
                />
              )}
              <Icon className="relative z-10 h-4.5 w-4.5" aria-hidden="true" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
