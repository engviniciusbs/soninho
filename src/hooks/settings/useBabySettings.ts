"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  createBaby,
  updateBaby,
  deleteBaby,
  getOwnedFamilyIds,
} from "@/lib/supabase/queries/babies";
import { useBaby } from "@/components/providers/BabyProvider";
import type { Baby } from "@/types";

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
export const OWNED_FAMILIES_KEY = ["owned-families"] as const;

interface Ownership {
  userId: string | null;
  familyIds: string[];
}

/** PostgREST error shape as far as these calls need it. */
type DbError = { code?: string; message?: string } | null;

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

  // Families where the signed-in user is owner: only they may delete a baby.
  const { data: ownership } = useQuery({
    queryKey: OWNED_FAMILIES_KEY,
    queryFn: async (): Promise<Ownership> => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return { userId: null, familyIds: [] };
      const { data, error } = await getOwnedFamilyIds(supabase, user.id);
      if (error) throw error;
      return { userId: user.id, familyIds: data };
    },
  });

  /** Mirrors `delete_baby`: owner of the baby's family (or creator of a family-less baby). */
  function canDelete(baby: Pick<Baby, "family_id" | "user_id">): boolean {
    if (!ownership) return false;
    return baby.family_id
      ? ownership.familyIds.includes(baby.family_id)
      : !!ownership.userId && baby.user_id === ownership.userId;
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["babies"] });
    queryClient.invalidateQueries({ queryKey: OWNED_FAMILIES_KEY });
  }

  /** Resolves `false` when the form must stay open (signed out or the write failed). */
  async function save(values: BabyValues): Promise<boolean> {
    setIsSaving(true);
    const { id, ...data } = values;

    if (id) {
      const { error } = await updateBaby(supabase, id, data);
      if (error) {
        toast.error("Erro ao atualizar bebê");
        setIsSaving(false);
        return false;
      }
      toast.success("Bebê atualizado");
    } else {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Usuário não autenticado");
        setIsSaving(false);
        return false;
      }
      // Looked up fresh: the cached list may predate a family deletion.
      const { data: owned, error: ownedError } = await getOwnedFamilyIds(supabase, user.id);
      if (ownedError) {
        toast.error("Erro ao adicionar bebê");
        setIsSaving(false);
        return false;
      }
      // The new baby joins the active baby's family when the user owns it;
      // otherwise the RPC uses the only family they own, or creates one.
      const activeFamily = activeBaby?.family_id ?? null;
      const familyId = activeFamily && owned.includes(activeFamily) ? activeFamily : null;
      const { error } = await createBaby(supabase, data, familyId);
      if (error) {
        toast.error(
          (error as DbError)?.message === "family_required"
            ? "Selecione um bebê da família onde quer adicionar o novo bebê"
            : "Erro ao adicionar bebê"
        );
        setIsSaving(false);
        return false;
      }
      toast.success("Bebê adicionado");
    }

    invalidate();
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

  /** Resolves `true` only when the server confirmed the deletion. */
  async function remove(id: string): Promise<boolean> {
    const { error } = await deleteBaby(supabase, id);
    if (error) {
      toast.error(
        (error as DbError)?.code === "42501"
          ? "Só quem é dono da família pode excluir o bebê"
          : "Erro ao excluir bebê"
      );
      return false;
    }
    toast.success("Bebê excluído");
    invalidate();
    return true;
  }

  return {
    baby: activeBaby,
    babies,
    save,
    uploadAvatar,
    remove,
    canDelete,
    isSaving,
    isUploading,
  };
}
