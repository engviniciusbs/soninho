import { useCallback, useContext } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserProfileContext } from "@/components/providers/UserProfileProvider";

export const NO_BABY_MESSAGE = "Adicione um bebê em Mais › Bebês";
/** Nanny mode cannot open Mais › Bebês: same copy as the home without a baby. */
export const NO_BABY_NANNY_MESSAGE =
  "Ainda não há bebê na família. Peça a quem administra a família para adicionar o bebê.";

/**
 * Error toast for a write with no baby yet. The default names the place and
 * links to it; in nanny mode it asks the family admin instead, with no link.
 */
export function toastNoBaby({ nanny = false }: { nanny?: boolean } = {}) {
  if (nanny) {
    toast.error(NO_BABY_NANNY_MESSAGE);
    return;
  }
  toast.error(NO_BABY_MESSAGE, {
    action: (
      <Link
        href="/more/babies"
        className="ml-auto shrink-0 rounded-lg px-2 py-1 font-sans text-sm font-bold text-sn-pr underline-offset-2 hover:underline"
      >
        Abrir Bebês
      </Link>
    ),
  });
}

/**
 * `toastNoBaby` bound to the current UI mode. Reads the profile context
 * directly (no throw outside the provider): without it, the default copy.
 */
export function useNoBabyToast() {
  const nanny = useContext(UserProfileContext)?.isNannyMode ?? false;
  return useCallback(() => toastNoBaby({ nanny }), [nanny]);
}
