import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Copy, Eye, Link2, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FAMILY_RELATIONS, getFamilyRelationLabel } from "@/lib/family/relations";
import { ROLE_LABELS } from "./roles";

type InviteRole = "caregiver" | "viewer";

interface InviteCreatorProps {
  role: InviteRole;
  onRoleChange: (role: InviteRole) => void;
  /** Family relation value, `""` when unspecified. */
  relation: string;
  onRelationChange: (relation: string) => void;
  generating: boolean;
  onGenerate: () => void;
  generatedLink: string | null;
}

/** Role/relation pickers, the "generate link" button and the copyable link. */
export function InviteCreator({
  role,
  onRoleChange,
  relation,
  onRelationChange,
  generating,
  onGenerate,
  generatedLink,
}: InviteCreatorProps) {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Convidar
      </p>

      {/* Role selector */}
      <div className="flex gap-2">
        {(["caregiver", "viewer"] as const).map((r) => (
          <button
            key={r}
            onClick={() => onRoleChange(r)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all duration-150 cursor-pointer ${
              role === r
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

      <div className="space-y-1.5">
        <p className="text-xs text-muted-foreground">
          Papel na família (opcional no convite)
        </p>
        <Select
          value={relation || "none"}
          onValueChange={(v) => onRelationChange(!v || v === "none" ? "" : v)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Ex.: Avó, Babá…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Não especificar</SelectItem>
            {FAMILY_RELATIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>
                {r.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Generate link button */}
      <Button
        variant="outline"
        className="w-full gap-2"
        onClick={onGenerate}
        disabled={generating}
      >
        {generating ? (
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
              Válido por 7 dias · {ROLE_LABELS[role]}
              {relation ? ` · ${getFamilyRelationLabel(relation)}` : ""}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
