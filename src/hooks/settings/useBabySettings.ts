"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createBaby, updateBaby, deleteBaby } from "@/lib/supabase/queries";
import { useBaby } from "@/components/providers/BabyProvider";

export interface BabyValues {
  /** Baby being edited; `null` creates a new one. */
  id: string | null;
  name: string;
  birth_date: string;
  avatar_emoji: string;
  avatar_url: string | null;
}

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const AVATAR_BUCKET = "baby-avatars";

/**
 * Baby CRUD and avatar upload for the settings page. `baby` is the active baby;
 * `babies` the whole list. Every call reports its outcome through a toast.
 */
export function useBabySettings() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const { babies, activeBaby } = useBaby();
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  /** Resolves `false` only when the form must stay open (signed out). */
  async function save(values: BabyValues): Promise<boolean> {
    setIsSaving(true);
    const { id, ...data } = values;

    if (id) {
      const { error } = await updateBaby(supabase, id, data);
      if (error) toast.error("Erro ao atualizar bebê");
      else toast.success("Bebê atualizado");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setIsSaving(false);
        return false;
      }
      const { error } = await createBaby(supabase, data);
      if (error) toast.error("Erro ao adicionar bebê");
      else toast.success("Bebê adicionado");
    }

    queryClient.invalidateQueries({ queryKey: ["babies"] });
    setIsSaving(false);
    return true;
  }

  /** Uploads to `baby-avatars/${userId}/${Date.now()}.${ext}`; resolves the public URL. */
  async function uploadAvatar(file: File): Promise<string | null> {
    if (file.size > MAX_AVATAR_SIZE) {
      toast.error("Foto muito grande. Máximo 5 MB.");
      return null;
    }

    setIsUploading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Não autenticado");
        return null;
      }

      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, { upsert: true, contentType: file.type });
      if (uploadError) {
        toast.error("Erro ao enviar foto");
        return null;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      toast.success("Foto carregada!");
      return publicUrl;
    } catch {
      toast.error("Erro inesperado ao enviar foto");
      return null;
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(id: string) {
    const { error } = await deleteBaby(supabase, id);
    if (error) {
      toast.error("Erro ao excluir bebê");
    } else {
      toast.success("Bebê excluído");
      queryClient.invalidateQueries({ queryKey: ["babies"] });
    }
  }

  return { baby: activeBaby, babies, save, uploadAvatar, remove, isSaving, isUploading };
}
