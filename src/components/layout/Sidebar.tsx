"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SoninhoLogo } from "@/components/brand/SoninhoLogo";
import { cn } from "@/lib/utils";
import { getNavLinks, isNavLinkActive } from "@/components/layout/navLinks";
import { useUserProfile } from "@/components/providers/UserProfileProvider";

/** Coluna de navegação do desktop: a marca no topo e as mesmas abas do menu inferior. */
export function Sidebar() {
  const pathname = usePathname();
  const { isNannyMode } = useUserProfile();
  const links = getNavLinks(isNannyMode);

  return (
    <aside className="hidden border-r border-sn-bd bg-sn-bg/60 md:flex md:w-60 md:shrink-0 md:flex-col">
      <div className="flex h-20 items-center px-6">
        <SoninhoLogo href="/app" markSize={34} textClassName="text-xl font-bold text-sn-tx" />
      </div>

      <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-1 px-3 pb-6">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = isNavLinkActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex min-h-12 items-center gap-3.5 rounded-xl px-3.5 font-sans text-base font-bold outline-none hover:bg-sn-s2/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr",
                isActive ? "bg-sn-s2 text-sn-pr" : "text-sn-tx"
              )}
            >
              <Icon size={26} />
              <span>{label}</span>
              <span
                aria-hidden="true"
                className={cn(
                  "absolute top-1/2 left-0 h-7 w-1 -translate-y-1/2 rounded-full",
                  isActive ? "bg-sn-pr" : "bg-transparent"
                )}
              />
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
