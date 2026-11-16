import Link from "next/link";
import { toast } from "sonner";

export const NO_BABY_MESSAGE = "Adicione um bebê em Mais › Bebês";

/** Error toast for a write with no baby yet: names the place and links to it. */
export function toastNoBaby() {
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
