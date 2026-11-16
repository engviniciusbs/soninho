import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconCheck, IconCopy, IconEye, IconLink, IconShield } from "@/components/brand/icons";
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

/** Labels for `<SelectValue>`, which otherwise shows the raw value. */
const RELATION_ITEMS = [
  { value: "none", label: "Não especificar" },
  ...FAMILY_RELATIONS.map((r) => ({ value: r.value, label: r.label })),
];

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
      <p className="text-sm font-bold text-sn-mu">
        Convidar
      </p>

      {/* Role selector */}
      <div className="flex flex-col gap-2">
        {(["caregiver", "viewer"] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onRoleChange(r)}
            aria-pressed={role === r}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 text-left text-base font-bold whitespace-nowrap outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr ${
              role === r
                ? "border-sn-pr bg-sn-pr/15 text-sn-tx"
                : "border-sn-bd bg-sn-s2/50 text-sn-mu hover:text-sn-tx"
            }`}
          >
            {r === "caregiver" ? (
              <IconShield size={18} />
            ) : (
              <IconEye size={18} />
            )}
            {ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <p className="text-sm font-bold text-sn-mu">
          Papel na família (opcional no convite)
        </p>
        <Select
          items={RELATION_ITEMS}
          value={relation || "none"}
          onValueChange={(v) => onRelationChange(!v || v === "none" ? "" : v)}
        >
          <SelectTrigger className="h-11 w-full rounded-xl border-sn-mu/70 text-base">
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
        loading={generating}
      >
        {!generating && <IconLink size={18} />}
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
                  <IconCheck size={16} className="text-sn-ok" />
                ) : (
                  <IconCopy size={16} />
                )}
                {copied ? "Copiado!" : "Copiar"}
              </Button>
            </div>
            <p className="mt-1 text-xs text-muted-foreground pl-1">
              Válido por 7 dias, {ROLE_LABELS[role]}
              {relation ? `, ${getFamilyRelationLabel(relation)}` : ""}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
