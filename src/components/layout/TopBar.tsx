"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useBaby } from "@/components/providers/BabyProvider";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LogOut, Moon } from "lucide-react";

export function TopBar() {
  const { babies, activeBaby, setActiveBaby } = useBaby();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 px-4 md:px-6 glass">
      {/* Mobile logo */}
      <div className="flex items-center gap-2.5 md:hidden">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15">
          <Moon className="h-4 w-4 text-primary animate-breathe" aria-hidden="true" />
        </div>
        <span className="text-base font-bold shimmer-text">Soninho</span>
      </div>

      {/* Right side controls */}
      <div className="flex items-center gap-2 ml-auto">
        {babies.length > 0 && activeBaby && (
          <Select
            value={activeBaby.id}
            onValueChange={(id) => {
              const baby = babies.find((b) => b.id === id);
              if (baby) setActiveBaby(baby);
            }}
          >
            <SelectTrigger className="h-9 rounded-full border-border/50 bg-muted/40 px-3 text-sm gap-2 w-auto min-w-[120px]">
              <SelectValue>
                <span className="flex items-center gap-2">
                  <BabyAvatar
                    avatarUrl={activeBaby.avatar_url}
                    emoji={activeBaby.avatar_emoji}
                    name={activeBaby.name}
                    size="sm"
                  />
                  <span className="truncate max-w-[80px]">{activeBaby.name}</span>
                </span>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {babies.map((baby) => (
                <SelectItem key={baby.id} value={baby.id}>
                  <span className="flex items-center gap-2">
                    <BabyAvatar
                      avatarUrl={baby.avatar_url}
                      emoji={baby.avatar_emoji}
                      name={baby.name}
                      size="sm"
                    />
                    <span>{baby.name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <Button
          variant="ghost"
          size="icon"
          onClick={handleLogout}
          className="h-9 w-9 rounded-full text-muted-foreground hover:text-foreground"
          aria-label="Sair da conta"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </header>
  );
}
