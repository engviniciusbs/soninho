"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { IconLogout } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";

/** "Sair da conta": ends the Supabase session and goes to the login page. */
export function SignOutButton() {
  const router = useRouter();

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <Button variant="destructive" size="md" onClick={handleLogout} className="w-full">
      <IconLogout />
      Sair da conta
    </Button>
  );
}
