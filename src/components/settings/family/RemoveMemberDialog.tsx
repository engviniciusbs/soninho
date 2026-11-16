import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FamilyMember } from "@/types";

interface RemoveMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: FamilyMember | null;
  currentUserId: string;
  onConfirm: () => void;
}

/** Confirms removing `member`, or leaving the family when it is the current user. */
export function RemoveMemberDialog({
  open,
  onOpenChange,
  member,
  currentUserId,
  onConfirm,
}: RemoveMemberDialogProps) {
  const isSelf = member?.user_id === currentUserId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isSelf ? "Sair da família?" : "Remover membro?"}</DialogTitle>
          <DialogDescription>
            {isSelf
              ? "Você não terá mais acesso a este bebê após sair da família."
              : `${member?.display_name ?? member?.email ?? "Este membro"} perderá o acesso ao bebê.`}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {isSelf ? "Sair" : "Remover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
