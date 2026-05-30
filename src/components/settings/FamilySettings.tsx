"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserPlus,
  Link2,
  Copy,
  Check,
  Trash2,
  ShieldCheck,
  Eye,
  Crown,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { FamilyMember, FamilyInvite, FamilyRole } from "@/types";

interface FamilySettingsProps {
  babyId: string;
  currentUserId: string;
}

const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: "Proprietário",
  caregiver: "Cuidador(a)",
  viewer: "Visualizador(a)",
};

const ROLE_BADGE_CLASSES: Record<FamilyRole, string> = {
  owner: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  caregiver: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  viewer: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

const ROLE_ICONS: Record<FamilyRole, React.ComponentType<{ className?: string }>> = {
  owner: Crown,
  caregiver: ShieldCheck,
  viewer: Eye,
};

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

export function FamilySettings({ babyId, currentUserId }: FamilySettingsProps) {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invites, setInvites] = useState<FamilyInvite[]>([]);
  const [currentUserRole, setCurrentUserRole] = useState<FamilyRole | null>(null);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [inviteRole, setInviteRole] = useState<"caregiver" | "viewer">("caregiver");
  const [generatingLink, setGeneratingLink] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showInvites, setShowInvites] = useState(false);
  const [removingMember, setRemovingMember] = useState<FamilyMember | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    const res = await fetch(`/api/family/members?babyId=${babyId}`);
    if (res.ok) {
      const { data, currentUserRole: role } = await res.json();
      setMembers(data ?? []);
      setCurrentUserRole(role ?? null);
    }
    setLoadingMembers(false);
  }, [babyId]);

  const fetchInvites = useCallback(async () => {
    const res = await fetch(`/api/family/invite?babyId=${babyId}`);
    if (res.ok) {
      const { data } = await res.json();
      setInvites(data ?? []);
    }
  }, [babyId]);

  useEffect(() => {
    // On-mount data fetch (synchronizing with an external system).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();
    fetchInvites();
  }, [fetchMembers, fetchInvites]);

  const handleGenerateLink = async () => {
    setGeneratingLink(true);
    const res = await fetch("/api/family/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ babyId, role: inviteRole }),
    });
    if (res.ok) {
      const { data } = await res.json();
      const link = `${window.location.origin}/invite/${data.token}`;
      setGeneratedLink(link);
      fetchInvites();
    }
    setGeneratingLink(false);
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/family/invite?inviteId=${inviteId}&babyId=${babyId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      if (generatedLink && invites.find((i) => i.id === inviteId)) {
        setGeneratedLink(null);
      }
    }
  };

  const handleConfirmRemove = async () => {
    if (!removingMember) return;
    const res = await fetch(
      `/api/family/members?babyId=${babyId}&userId=${removingMember.user_id}`,
      { method: "DELETE" }
    );
    if (res.ok) {
      setMembers((prev) => prev.filter((m) => m.user_id !== removingMember.user_id));
    }
    setRemovingMember(null);
    setConfirmOpen(false);
  };

  const isOwner = currentUserRole === "owner";

  return (
    <Card className="border-border/60 bg-card/50 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Users className="w-4 h-4 text-primary" />
          Equipe Família
        </CardTitle>
        <CardDescription>
          Compartilhe o acompanhamento do sono com cuidadores e familiares.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Member list */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Membros
          </p>

          {loadingMembers ? (
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
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
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

                    {/* Remove button */}
                    {isOwner && !isThisOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => {
                          setRemovingMember(member);
                          setConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                    {!isOwner && isMe && !isThisOwner && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => {
                          setRemovingMember(member);
                          setConfirmOpen(true);
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Invite section (owner only) */}
        {isOwner && (
          <div className="space-y-3">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Convidar
            </p>

            {/* Role selector */}
            <div className="flex gap-2">
              {(["caregiver", "viewer"] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setInviteRole(r);
                    setGeneratedLink(null);
                  }}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 cursor-pointer ${
                    inviteRole === r
                      ? r === "caregiver"
                        ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400"
                        : "bg-slate-500/20 border-slate-500/50 text-slate-300"
                      : "bg-muted/30 border-border/40 text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {r === "caregiver" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>

            {/* Generate link button */}
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={handleGenerateLink}
              disabled={generatingLink}
            >
              {generatingLink ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              Gerar link de convite
            </Button>

            {/* Generated link */}
            <AnimatePresence>
              {generatedLink && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/30 border border-border/40">
                    <p className="flex-1 text-xs text-muted-foreground truncate font-mono">
                      {generatedLink}
                    </p>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="shrink-0 gap-1 text-xs"
                      onClick={handleCopyLink}
                    >
                      {copied ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      {copied ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground pl-1">
                    Válido por 7 dias · {ROLE_LABELS[inviteRole]}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Active invites (owner only) */}
        {isOwner && invites.length > 0 && (
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
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRevokeInvite(invite.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </CardContent>

      {/* Confirm remove dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {removingMember?.user_id === currentUserId
                ? "Sair da família?"
                : "Remover membro?"}
            </DialogTitle>
            <DialogDescription>
              {removingMember?.user_id === currentUserId
                ? "Você não terá mais acesso a este bebê após sair da família."
                : `${removingMember?.display_name ?? removingMember?.email ?? "Este membro"} perderá o acesso ao bebê.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmRemove}
            >
              {removingMember?.user_id === currentUserId ? "Sair" : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
