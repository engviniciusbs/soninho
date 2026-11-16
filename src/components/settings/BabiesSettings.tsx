"use client";

import { useState } from "react";
import { useBabySettings } from "@/hooks/settings/useBabySettings";
import { useBaby } from "@/components/providers/BabyProvider";
import { Skeleton } from "@/components/ui/skeleton";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { BabyProfileForm } from "@/components/settings/BabyProfileForm";
import { IconPen, IconPlus, IconTrash } from "@/components/brand/icons";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListRow } from "@/components/ui/list-row";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Baby as BabyRow } from "@/types";
import { formatLocalDate } from "@/lib/dates/localDate";

/** Babies list (Mais › Bebês) with the add, edit, photo and delete dialogs. */
export function BabiesSettings() {
  const { babies, remove, canDelete } = useBabySettings();
  const { isLoading } = useBaby();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BabyRow | null>(null);
  const [formSession, setFormSession] = useState(0);
  // The baby is kept whole while the dialog is up (and while it animates out):
  // the list refetches after the deletion and would otherwise rewrite the text.
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [toDelete, setToDelete] = useState<{ baby: BabyRow; lastOfFamily: boolean } | null>(null);
  const [deleting, setDeleting] = useState(false);

  function openForm(baby: BabyRow | null) {
    setEditing(baby);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  }

  function askDelete(baby: BabyRow) {
    // Mirrors delete_baby: the family's last baby takes the family with it.
    const lastOfFamily =
      !!baby.family_id && babies.filter((b) => b.family_id === baby.family_id).length === 1;
    setToDelete({ baby, lastOfFamily });
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!toDelete || deleting) return;
    setDeleting(true);
    try {
      await remove(toDelete.baby.id);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  }

  if (isLoading) {
    return (
      <Card className="gap-0 px-3.5 py-1" role="status" aria-label="Carregando bebês">
        <div className="flex items-center gap-3.5 px-1 py-3">
          <Skeleton className="size-[38px] shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-1.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card className="gap-0 px-3.5 py-1">
        {babies.length === 0 ? (
          <p className="px-1 py-4 text-base text-sn-mu">
            Nenhum bebê cadastrado. Adicione o primeiro para começar a registrar o sono.
          </p>
        ) : (
          <ul className="divide-y divide-sn-bd">
            {babies.map((baby) => (
              <li key={baby.id}>
                <ListRow
                  icon={<BabyAvatar avatarUrl={baby.avatar_url} name={baby.name} size="sm" />}
                  title={baby.name}
                  subtitle={`Nascimento: ${formatLocalDate(baby.birth_date)}`}
                  value={
                    <span className="flex gap-1">
                      <Button
                        variant="icon"
                        size="icon"
                        onClick={() => openForm(baby)}
                        aria-label={`Editar ${baby.name}`}
                      >
                        <IconPen size={20} />
                      </Button>
                      {canDelete(baby) && (
                        <Button
                          variant="icon"
                          size="icon"
                          className="text-sn-danger"
                          onClick={() => askDelete(baby)}
                          aria-label={`Excluir ${baby.name}`}
                        >
                          <IconTrash size={20} />
                        </Button>
                      )}
                    </span>
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Button variant="secondary" size="md" className="mt-4 w-full" onClick={() => openForm(null)}>
        <IconPlus />
        Adicionar
      </Button>

      <BabyProfileForm
        open={formOpen}
        onOpenChange={setFormOpen}
        baby={editing}
        session={formSession}
      />

      <Dialog open={deleteOpen} onOpenChange={(open) => !deleting && setDeleteOpen(open)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Excluir bebê</DialogTitle>
            <DialogDescription>
              Todos os registros de sono e alimentação{" "}
              {toDelete ? `de ${toDelete.baby.name}` : "deste bebê"} serão excluídos permanentemente.
              {toDelete?.lastOfFamily &&
                " Como é o último bebê da família, a família, os convites e os recados também serão excluídos, e as outras pessoas da família perdem o acesso."}{" "}
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" loading={deleting} onClick={handleDelete}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
