"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FamilyInvite, FamilyMember, FamilyRole } from "@/types";

/** Non-2xx answer from the family API; `message` is the server's `error` text. */
export class FamilyApiError extends Error {}

async function apiError(res: Response): Promise<FamilyApiError> {
  try {
    const body = await res.json();
    if (typeof body?.error === "string") return new FamilyApiError(body.error);
  } catch {}
  return new FamilyApiError("Ocorreu um erro. Tente novamente.");
}

/** Server errors become toasts; anything else (e.g. offline) is left silent. */
export function toastApiError(error: Error) {
  if (error instanceof FamilyApiError) toast.error(error.message);
}

export interface FamilyMembersData {
  members: FamilyMember[];
  currentUserRole: FamilyRole | null;
}

const EMPTY_MEMBERS: FamilyMembersData = { members: [], currentUserRole: null };
const EMPTY_INVITES: FamilyInvite[] = [];

export const familyMembersKey = (babyId: string) => ["family-members", babyId] as const;
export const familyInvitesKey = (babyId: string) => ["family-invites", babyId] as const;

/**
 * Settings data is refetched on every mount (`staleTime: 0`) and never retried,
 * matching the former on-mount fetch. A failed (non-2xx) load keeps whatever
 * was loaded before for that baby.
 */
const LOAD_OPTIONS = { staleTime: 0, retry: false } as const;

/** Members of the baby's family plus the signed-in user's role; remove a member. */
export function useFamilyMembers(babyId: string) {
  const queryClient = useQueryClient();
  const key = familyMembersKey(babyId);

  const query = useQuery({
    queryKey: key,
    ...LOAD_OPTIONS,
    queryFn: async (): Promise<FamilyMembersData> => {
      const res = await fetch(`/api/family/members?babyId=${babyId}`);
      if (!res.ok) return queryClient.getQueryData<FamilyMembersData>(key) ?? EMPTY_MEMBERS;
      const { data, currentUserRole } = await res.json();
      return { members: data ?? [], currentUserRole: currentUserRole ?? null };
    },
  });

  const remove = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/family/members?babyId=${babyId}&userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw await apiError(res);
    },
    onSuccess: (_, userId) => {
      queryClient.setQueryData<FamilyMembersData>(key, (prev) =>
        prev ? { ...prev, members: prev.members.filter((m) => m.user_id !== userId) } : prev
      );
    },
  });

  return {
    members: query.data?.members ?? EMPTY_MEMBERS.members,
    currentUserRole: query.data?.currentUserRole ?? null,
    isLoading: query.isPending,
    remove,
  };
}

/** Pending invites for the baby; create (refetches the list) and revoke. */
export function useFamilyInvites(babyId: string) {
  const queryClient = useQueryClient();
  const key = familyInvitesKey(babyId);

  const query = useQuery({
    queryKey: key,
    ...LOAD_OPTIONS,
    queryFn: async (): Promise<FamilyInvite[]> => {
      const res = await fetch(`/api/family/invite?babyId=${babyId}`);
      if (!res.ok) return queryClient.getQueryData<FamilyInvite[]>(key) ?? EMPTY_INVITES;
      const { data } = await res.json();
      return data ?? [];
    },
  });

  /** Resolves the new invite's token. */
  const create = useMutation({
    mutationFn: async (input: { role: "caregiver" | "viewer"; familyRelation: string | null }) => {
      const res = await fetch("/api/family/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ babyId, role: input.role, familyRelation: input.familyRelation }),
      });
      if (!res.ok) throw await apiError(res);
      const { data } = await res.json();
      return data.token as string;
    },
  });

  const revoke = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/family/invite?inviteId=${inviteId}&babyId=${babyId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw await apiError(res);
    },
    onSuccess: (_, inviteId) => {
      queryClient.setQueryData<FamilyInvite[]>(key, (prev) =>
        prev?.filter((i) => i.id !== inviteId)
      );
    },
  });

  return {
    invites: query.data ?? EMPTY_INVITES,
    create,
    revoke,
    /** Refetches the invite list (after a new invite was created). */
    refresh: () => queryClient.invalidateQueries({ queryKey: key }),
  };
}
