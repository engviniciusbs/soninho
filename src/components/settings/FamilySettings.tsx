"use client";

import { useState } from "react";
import { Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { FamilyMember } from "@/types";
import {
  toastApiError,
  useFamilyInvites,
  useFamilyMembers,
} from "@/hooks/settings/useFamilyTeam";
import { MembersList } from "./family/MembersList";
import { InviteManager } from "./family/InviteManager";
import { RemoveMemberDialog } from "./family/RemoveMemberDialog";

interface FamilySettingsProps {
  babyId: string;
  currentUserId: string;
}

export function FamilySettings({ babyId, currentUserId }: FamilySettingsProps) {
  const team = useFamilyMembers(babyId);
  const invites = useFamilyInvites(babyId);
  const [removingMember, setRemovingMember] = useState<FamilyMember | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleConfirmRemove = () => {
    if (!removingMember) return;
    const close = () => {
      setRemovingMember(null);
      setConfirmOpen(false);
    };
    team.remove.mutate(removingMember.user_id, {
      onSuccess: close,
      onError: (error) => {
        toastApiError(error);
        close();
      },
    });
  };

  const isOwner = team.currentUserRole === "owner";

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="w-4 h-4 text-primary" />
          Equipe Família
        </CardTitle>
        <CardDescription>
          Convide pai, mãe, avós, babá e quem mais cuida do bebê — cada um com seu papel na família.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        <MembersList
          members={team.members}
          isLoading={team.isLoading}
          currentUserId={currentUserId}
          isOwner={isOwner}
          onRemove={(member) => {
            setRemovingMember(member);
            setConfirmOpen(true);
          }}
        />

        {/* Invite section and active invites (owner only) */}
        {isOwner && <InviteManager invites={invites} />}
      </CardContent>

      <RemoveMemberDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        member={removingMember}
        currentUserId={currentUserId}
        onConfirm={handleConfirmRemove}
      />
    </Card>
  );
}
