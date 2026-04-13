"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { createBaby, updateBaby, deleteBaby } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Download,
  LogOut,
  Baby,
  User,
} from "lucide-react";
import type { SleepSession } from "@/types";

const EMOJIS = ["🍼", "👶", "🌙", "⭐", "💤", "🧸", "🎀", "🦊", "🐰", "🐻"];

export default function SettingsPage() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const router = useRouter();
  const { babies, activeBaby } = useBaby();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showBabyForm, setShowBabyForm] = useState(false);
  const [editingBaby, setEditingBaby] = useState<string | null>(null);
  const [babyName, setBabyName] = useState("");
  const [babyBirthDate, setBabyBirthDate] = useState("");
  const [babyEmoji, setBabyEmoji] = useState("🍼");
  const [babyAvatarUrl, setBabyAvatarUrl] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState(false);

  function openAddForm() {
    setEditingBaby(null);
    setBabyName("");
    setBabyBirthDate("");
    setBabyEmoji("🍼");
    setBabyAvatarUrl(null);
    setShowBabyForm(true);
  }

  function openEditForm(baby: { id: string; name: string; birth_date: string; avatar_emoji: string; avatar_url: string | null }) {
    setEditingBaby(baby.id);
    setBabyName(baby.name);
    setBabyBirthDate(baby.birth_date);
    setBabyEmoji(baby.avatar_emoji);
    setBabyAvatarUrl(baby.avatar_url);
    setShowBabyForm(true);
  }

  async function handleAvatarUpload(file: File) {
    if (!file) return;

    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      toast.error("Foto muito grande. Máximo 5 MB.");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { toast.error("Não autenticado"); return; }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("baby-avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadError) {
        toast.error("Erro ao enviar foto");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("baby-avatars")
        .getPublicUrl(path);

      setBabyAvatarUrl(publicUrl);
      toast.success("Foto carregada!");
    } catch {
      toast.error("Erro inesperado ao enviar foto");
    } finally {
      setUploading(false);
    }
  }

  async function handleSaveBaby() {
    setSaving(true);

    if (!babyName.trim() || !babyBirthDate) {
      toast.error("Preencha nome e data de nascimento");
      setSaving(false);
      return;
    }

    if (editingBaby) {
      const { error } = await updateBaby(supabase, editingBaby, {
        name: babyName.trim(),
        birth_date: babyBirthDate,
        avatar_emoji: babyEmoji,
        avatar_url: babyAvatarUrl,
      });
      if (error) {
        toast.error("Erro ao atualizar bebê");
      } else {
        toast.success("Bebê atualizado");
      }
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setSaving(false);
        return;
      }

      const { error } = await createBaby(supabase, {
        user_id: user.id,
        name: babyName.trim(),
        birth_date: babyBirthDate,
        avatar_emoji: babyEmoji,
        avatar_url: babyAvatarUrl,
      });
      if (error) {
        toast.error("Erro ao adicionar bebê");
      } else {
        toast.success("Bebê adicionado");
      }
    }

    queryClient.invalidateQueries({ queryKey: ["babies"] });
    setShowBabyForm(false);
    setSaving(false);
  }

  async function handleDeleteBaby(id: string) {
    const { error } = await deleteBaby(supabase, id);
    if (error) {
      toast.error("Erro ao excluir bebê");
    } else {
      toast.success("Bebê excluído");
      queryClient.invalidateQueries({ queryKey: ["babies"] });
    }
    setShowDeleteConfirm(null);
  }

  async function handleExport() {
    if (!activeBaby) return;
    setExporting(true);

    try {
      const { data } = await supabase
        .from("sleep_sessions")
        .select("*")
        .eq("baby_id", activeBaby.id)
        .order("start_time", { ascending: false }) as { data: SleepSession[] | null };

      if (!data || data.length === 0) {
        toast.info("Nenhum registro para exportar");
        setExporting(false);
        return;
      }

      const headers = [
        "Tipo",
        "Início",
        "Fim",
        "Duração (min)",
        "Qualidade",
        "Local",
        "Notas",
      ];
      const rows = data.map((s) => [
        s.type === "NAP" ? "Soneca" : "Sono Noturno",
        s.start_time,
        s.end_time ?? "",
        s.duration_min?.toString() ?? "",
        s.quality?.toString() ?? "",
        s.location ?? "",
        s.notes ?? "",
      ]);

      const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `soninho-${activeBaby.name}-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("Dados exportados com sucesso");
    } catch {
      toast.error("Erro ao exportar dados");
    }

    setExporting(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold">Configurações</h1>

      {/* Baby profiles */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Baby className="h-4 w-4" />
            Bebês
          </CardTitle>
          <Button
            size="sm"
            onClick={openAddForm}
            className="rounded-xl gap-1"
          >
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
                    emoji={baby.avatar_emoji}
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
                    onClick={() => openEditForm(baby)}
                    aria-label="Editar"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-lg text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(baby.id)}
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

      {/* Data export */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="h-4 w-4" />
            Exportar Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Exporte todos os registros de sono em formato CSV.
          </p>
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={!activeBaby || exporting}
            className="rounded-xl gap-2"
          >
            <Download className="h-4 w-4" />
            {exporting ? "Exportando..." : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
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

      {/* Baby form dialog */}
      <Dialog open={showBabyForm} onOpenChange={setShowBabyForm}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingBaby ? "Editar bebê" : "Adicionar bebê"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Avatar upload area */}
            <div className="flex flex-col items-center gap-2 py-2">
              <BabyAvatar
                avatarUrl={babyAvatarUrl}
                emoji={babyEmoji}
                name={babyName || "Bebê"}
                size="xl"
                editable
                uploading={uploading}
                onUploadClick={() => fileInputRef.current?.click()}
              />
              <p className="text-xs text-muted-foreground">
                {babyAvatarUrl ? "Toque para alterar a foto" : "Toque para adicionar uma foto"}
              </p>
              {babyAvatarUrl && (
                <button
                  type="button"
                  onClick={() => setBabyAvatarUrl(null)}
                  className="text-xs text-destructive hover:underline"
                >
                  Remover foto
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="sr-only"
                aria-label="Selecionar foto do bebê"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleAvatarUpload(file);
                  e.target.value = "";
                }}
              />
            </div>

            <Input
              placeholder="Nome do bebê"
              value={babyName}
              onChange={(e) => setBabyName(e.target.value)}
              className="rounded-xl"
              autoComplete="off"
            />
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                Data de nascimento
              </label>
              <Input
                type="date"
                value={babyBirthDate}
                onChange={(e) => setBabyBirthDate(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Emoji (fallback sem foto)</label>
              <div className="flex flex-wrap gap-2">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setBabyEmoji(emoji)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${
                      babyEmoji === emoji
                        ? "bg-primary/20 ring-2 ring-primary"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBabyForm(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveBaby}
              disabled={saving || uploading}
              className="rounded-xl"
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!showDeleteConfirm}
        onOpenChange={() => setShowDeleteConfirm(null)}
      >
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Excluir bebê</DialogTitle>
            <DialogDescription>
              Todos os registros de sono deste bebê serão excluídos permanentemente. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(null)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => showDeleteConfirm && handleDeleteBaby(showDeleteConfirm)}
              className="rounded-xl"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
