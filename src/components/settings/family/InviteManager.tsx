import { useState } from "react";
import { toastApiError, type useFamilyInvites } from "@/hooks/settings/useFamilyTeam";
import { buildInviteLink } from "@/lib/invites/inviteLink";
import { InviteCreator } from "./InviteCreator";
import { PendingInvites } from "./PendingInvites";

interface InviteManagerProps {
  invites: ReturnType<typeof useFamilyInvites>;
}

/** Owner-only: creates invite links and lists/revokes the pending ones. */
export function InviteManager({ invites }: InviteManagerProps) {
  const [inviteRole, setInviteRole] = useState<"caregiver" | "viewer">("caregiver");
  const [inviteRelation, setInviteRelation] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  const handleGenerateLink = () => {
    invites.create.mutate(
      { role: inviteRole, familyRelation: inviteRelation || null },
      {
        onSuccess: (token) => {
          setGeneratedLink(buildInviteLink(window.location.origin, token));
          invites.refresh();
        },
        onError: toastApiError,
      }
    );
  };

  const handleRevokeInvite = (inviteId: string) => {
    const wasListed = invites.invites.some((i) => i.id === inviteId);
    invites.revoke.mutate(inviteId, {
      onSuccess: () => {
        if (generatedLink && wasListed) setGeneratedLink(null);
      },
      onError: toastApiError,
    });
  };

  return (
    <>
      <InviteCreator
        role={inviteRole}
        onRoleChange={(r) => {
          setInviteRole(r);
          setGeneratedLink(null);
        }}
        relation={inviteRelation}
        onRelationChange={(r) => {
          setInviteRelation(r);
          setGeneratedLink(null);
        }}
        generating={invites.create.isPending}
        onGenerate={handleGenerateLink}
        generatedLink={generatedLink}
      />

      {/* Active invites */}
      {invites.invites.length > 0 && (
        <PendingInvites invites={invites.invites} onRevoke={handleRevokeInvite} />
      )}
    </>
  );
}
