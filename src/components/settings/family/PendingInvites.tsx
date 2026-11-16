import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFamilyRelationLabel } from "@/lib/family/relations";
import type { FamilyInvite, FamilyRole } from "@/types";
import { ROLE_BADGE_CLASSES, ROLE_LABELS } from "./roles";

interface PendingInvitesProps {
  invites: FamilyInvite[];
  onRevoke: (inviteId: string) => void;
}

/** Collapsible list of active invites (rendered only when there is at least one). */
export function PendingInvites({ invites, onRevoke }: PendingInvitesProps) {
  const [showInvites, setShowInvites] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setShowInvites(!showInvites)}
        className="flex items-center gap-1 text-xs font-medium text-muted-foreground uppercase tracking-wide cursor-pointer hover:text-foreground transition-colors"
      >
        <UserPlus className="w-3.5 h-3.5" />
        Convites pendentes ({invites.length})
        {showInvites ? (
          <ChevronUp className="w-3 h-3 ml-auto" />
        ) : (
          <ChevronDown className="w-3 h-3 ml-auto" />
        )}
      </button>

      <AnimatePresence>
        {showInvites && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {invites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/20 border border-border/30"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    Expira em{" "}
                    {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border mt-0.5 ${ROLE_BADGE_CLASSES[invite.role as FamilyRole]}`}
                  >
                    {ROLE_LABELS[invite.role as FamilyRole]}
                    {invite.family_relation
                      ? ` · ${getFamilyRelationLabel(invite.family_relation)}`
                      : ""}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onRevoke(invite.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
