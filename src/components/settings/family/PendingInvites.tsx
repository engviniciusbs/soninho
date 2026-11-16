import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconChevronDown, IconChevronUp, IconTrash, IconUserPlus } from "@/components/brand/icons";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { getFamilyRelationLabel } from "@/lib/family/relations";
import type { FamilyInvite, FamilyRole } from "@/types";
import { ROLE_LABELS } from "./roles";

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
        className="flex min-h-11 w-full cursor-pointer items-center gap-1.5 rounded-xl text-sm font-bold text-sn-mu outline-none hover:text-sn-tx focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
      >
        <IconUserPlus size={16} />
        Convites pendentes ({invites.length})
        {showInvites ? (
          <IconChevronUp size={16} className="ml-auto" />
        ) : (
          <IconChevronDown size={16} className="ml-auto" />
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
                  <StatusPill tone="attention" className="mt-1">
                    {ROLE_LABELS[invite.role as FamilyRole]}
                    {invite.family_relation
                      ? ` · ${getFamilyRelationLabel(invite.family_relation)}`
                      : ""}
                  </StatusPill>
                </div>
                <Button
                  variant="icon"
                  size="icon"
                  className="shrink-0 text-sn-mu hover:text-sn-danger"
                  onClick={() => onRevoke(invite.id)}
                  aria-label="Cancelar convite"
                >
                  <IconTrash size={18} />
                </Button>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
