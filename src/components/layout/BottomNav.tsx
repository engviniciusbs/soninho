"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, List, BarChart3, Sparkles, Settings } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const links = [
  { href: "/app", label: "Início", icon: Home },
  { href: "/history", label: "Registro", icon: List },
  { href: "/analytics", label: "Análise", icon: BarChart3 },
  { href: "/ai-insights", label: "IA", icon: Sparkles },
  { href: "/settings", label: "Config", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      {/* Solid backdrop */}
      <div className="border-t border-border bg-background/90 backdrop-blur-md supports-backdrop-filter:bg-background/75">
        <div className="flex items-center justify-around px-2 py-1">
          {links.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors min-h-[52px] justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                {/* Sliding indicator pill */}
                {isActive && (
                  <motion.div
                    layoutId="bottom-nav-indicator"
                    className="absolute inset-x-1 inset-y-0.5 rounded-xl bg-secondary"
                    transition={{ type: "spring", stiffness: 500, damping: 38 }}
                  />
                )}

                <motion.div
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  className="relative z-10"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </motion.div>
                <span className="relative z-10 tracking-tight">{label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
