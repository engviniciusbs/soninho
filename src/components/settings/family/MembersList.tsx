import { motion } from "framer-motion";
import { Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFamilyRelationLabel } from "@/lib/family/relations";
import type { FamilyMember, FamilyRole } from "@/types";
import { ROLE_BADGE_CLASSES, ROLE_ICONS, ROLE_LABELS } from "./roles";

function getInitials(name: string | null, email: string | null): string {
  const source = name ?? email ?? "?";
  return source
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

interface MembersListProps {
  members: FamilyMember[];
  isLoading: boolean;
  currentUserId: string;
  isOwner: boolean;
  /** Asks to remove `member` (or, for the current user, to leave). */
  onRemove: (member: FamilyMember) => void;
}

export function MembersList({
  members,
  isLoading,
  currentUserId,
  isOwner,
  onRemove,
}: MembersListProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-bold text-sn-mu">
        Membros
      </p>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const RoleIcon = ROLE_ICONS[member.role as FamilyRole] ?? Users;
            const isMe = member.user_id === currentUserId;
            const isThisOwner = member.role === "owner";

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 rounded-xl bg-sn-s2/60 p-3"
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-semibold text-primary shrink-0">
                  {getInitials(member.display_name, member.email)}
                </div>

                {/* Name + email */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {member.display_name ?? member.email ?? "Membro"}
                    {isMe && (
                      <span className="ml-1 text-xs text-muted-foreground">(você)</span>
                    )}
                  </p>
                  {getFamilyRelationLabel(member.family_relation) && (
                    <p className="text-xs text-primary/90 truncate">
                      {getFamilyRelationLabel(member.family_relation)}
                    </p>
                  )}
                  {member.email && member.display_name && (
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
                  )}
                </div>

                {/* Role badge */}
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${ROLE_BADGE_CLASSES[member.role as FamilyRole]}`}
                >
                  <RoleIcon className="w-3 h-3" />
                  {ROLE_LABELS[member.role as FamilyRole]}
                </span>

                {/* Remove button (owner removes others; others may leave) */}
                {((isOwner && !isThisOwner) || (!isOwner && isMe && !isThisOwner)) && (
                  <Button
                    variant="icon"
                    size="icon"
                    className="shrink-0 text-sn-mu hover:text-sn-danger"
                    onClick={() => onRemove(member)}
                    aria-label={isMe ? "Sair da família" : "Remover membro"}
                  >
                    <Trash2 className="size-4" aria-hidden="true" />
                  </Button>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
