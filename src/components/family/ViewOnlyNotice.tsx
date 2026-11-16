import { IconEye } from "@/components/brand/icons";
import { cn } from "@/lib/utils";

/** Discreet line for a viewer ("Só visualizar"): the data is shown, the write controls are not. */
export function ViewOnlyNotice({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-center justify-center gap-1.5 font-sans text-[13px] font-semibold text-sn-mu",
        className
      )}
    >
      <IconEye size={16} />
      Você tem acesso só para ver
    </p>
  );
}
