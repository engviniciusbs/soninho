"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baby, LogOut, Pencil, Plus, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBabySettings } from "@/hooks/settings/useBabySettings";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { BabyProfileForm } from "@/components/settings/BabyProfileForm";
import { FamilySettings } from "@/components/settings/FamilySettings";
import { UserProfileSettings } from "@/components/settings/UserProfileSettings";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Baby as BabyRow } from "@/types";

/** "Geral" tab: babies list (+ add/edit/delete dialogs), profile, family, account. */
export function GeneralTab({ currentUserId }: { currentUserId: string | null }) {
  const router = useRouter();
  const { baby: activeBaby, babies, remove } = useBabySettings();
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

  async function handleLogout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Bebês
          </CardTitle>
          <Button size="sm" onClick={() => openForm(null)} className="rounded-xl gap-1">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {babies.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Nenhum bebê cadastrado. Adicione o primeiro!
            </p>
          ) : (
            babies.map((baby) => (
              <div
                key={baby.id}
                className="flex items-center justify-between rounded-xl bg-secondary/50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <BabyAvatar
                    avatarUrl={baby.avatar_url}
                    emoji={baby.avatar_emoji ?? "🍼"}
                    name={baby.name}
                    size="md"
                  />
                  <div>
                    <p className="text-sm font-semibold">{baby.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Nascimento: {new Date(baby.birth_date).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg"
                    onClick={() => openForm(baby)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => setDeleteId(baby.id)}
                    aria-label="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <UserProfileSettings />

      {activeBaby && currentUserId && (
        <FamilySettings babyId={activeBaby.id} currentUserId={currentUserId} />
      )}

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Conta
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sair da conta
          </Button>
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={() => setDeleteId(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteId && handleDelete(deleteId)}
              className="rounded-xl"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
