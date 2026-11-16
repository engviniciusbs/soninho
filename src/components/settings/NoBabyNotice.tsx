import Link from "next/link";
import { IconPlus } from "@/components/brand/icons";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

/** Empty state for a detail page that needs an active baby: what goes here and how to fill it. */
export function NoBabyNotice({ children }: { children: string }) {
  return (
    <Card className="items-start gap-4 px-[18px]">
      <p className="text-base text-sn-mu">{children}</p>
      <Link href="/more/babies" className={buttonVariants({ variant: "secondary", size: "sm" })}>
        <IconPlus />
        Adicionar bebê
      </Link>
    </Card>
  );
}
