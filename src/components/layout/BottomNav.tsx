"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getNavLinks, isNavLinkActive } from "@/components/layout/navLinks";
import { useUserProfile } from "@/components/providers/UserProfileProvider";

/** Menu inferior do mobile (mockup `.nav`): ícone de 26px, rótulo de 13px, aba ativa em lavanda com barra de 28×4px. */
export function BottomNav() {
  const pathname = usePathname();
  const { isNannyMode } = useUserProfile();
  const links = getNavLinks(isNannyMode);

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-sn-bd bg-sn-bg/94 backdrop-blur-md md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex w-full max-w-[480px] items-stretch justify-around px-1 pt-2 pb-2">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = isNavLinkActive(pathname, href);
          return (
            <li key={href} className="flex">
              <Link
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex min-h-14 min-w-14 flex-col items-center justify-center gap-1.5 rounded-xl px-1.5 py-1 font-sans text-[13px] leading-none font-bold outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
                  isActive ? "text-sn-pr" : "text-sn-tx hover:text-sn-pr"
                )}
              >
                <Icon size={26} />
                <span>{label}</span>
                <span
                  aria-hidden="true"
                  className={cn("h-1 w-7 rounded-full", isActive ? "bg-sn-pr" : "bg-transparent")}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
