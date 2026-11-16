"use client";

import { usePathname } from "next/navigation";
import { useBaby } from "@/components/providers/BabyProvider";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/**
 * Faixa do topo: só o seletor de bebê. A marca fica na Sidebar
 * (desktop) e, na home, dentro da própria página; as outras páginas têm o
 * título em `PageTitle`. Na home (`/app`) ela some: a página tem a marca, o
 * relógio e o seletor de bebê. Sair fica em Mais › Perfil.
 */
export function TopBar() {
  const { babies, activeBaby, setActiveBaby } = useBaby();
  const pathname = usePathname();

  if (pathname === "/app") return null;

  return (
    <header className="flex h-16 items-center justify-end gap-2">
      {babies.length > 0 && activeBaby && (
        <Select
          value={activeBaby.id}
          onValueChange={(id) => {
            const baby = babies.find((b) => b.id === id);
            if (baby) setActiveBaby(baby);
          }}
        >
          <SelectTrigger
            aria-label="Trocar de bebê"
            className="h-11 min-w-[120px] gap-2 rounded-full border-sn-bd bg-sn-s1 pr-3 pl-1 font-sans text-[15px] font-bold text-sn-tx data-[size=default]:h-11 dark:bg-sn-s1 dark:hover:bg-sn-s2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr active:translate-y-px disabled:opacity-55"
          >
            <SelectValue>
              <span className="flex items-center gap-2">
                <BabyAvatar avatarUrl={activeBaby.avatar_url} name={activeBaby.name} size="sm" />
                <span className="max-w-[120px] truncate">{activeBaby.name}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {babies.map((baby) => (
              <SelectItem key={baby.id} value={baby.id}>
                <span className="flex items-center gap-2">
                  <BabyAvatar avatarUrl={baby.avatar_url} name={baby.name} size="sm" />
                  <span>{baby.name}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </header>
  );
}
