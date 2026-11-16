"use client";

import { useState } from "react";
import { useBabySettings } from "@/hooks/settings/useBabySettings";
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

/** Babies list (Mais › Bebês) with the add, edit, photo and delete dialogs. */
export function BabiesSettings() {
  const { babies, remove } = useBabySettings();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BabyRow | null>(null);
  const [formSession, setFormSession] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function openForm(baby: BabyRow | null) {
    setEditing(baby);
    setFormSession((n) => n + 1);
    setFormOpen(true);
  }

  async function handleDelete(id: string) {
    await remove(id);
    setDeleteId(null);
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
                  subtitle={`Nascimento: ${new Date(baby.birth_date).toLocaleDateString("pt-BR")}`}
                  value={
                    <span className="flex gap-1">
                      <Button
                        variant="icon"
                        size="icon"
                        onClick={() => openForm(baby)}
                        aria-label="Editar"
                      >
                        <IconPen size={20} />
                      </Button>
                      <Button
                        variant="icon"
                        size="icon"
                        className="text-sn-danger"
                        onClick={() => setDeleteId(baby.id)}
                        aria-label="Excluir"
                      >
                        <IconTrash size={20} />
                      </Button>
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

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Excluir bebê</DialogTitle>
            <DialogDescription>
              Todos os registros de sono deste bebê serão excluídos permanentemente. Esta ação não
              pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteId(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteId && handleDelete(deleteId)}
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
