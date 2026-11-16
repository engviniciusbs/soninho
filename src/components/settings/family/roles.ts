import type { ComponentType } from "react";
import { Crown, Eye, ShieldCheck } from "lucide-react";
import { PERMISSION_ROLE_LABELS } from "@/lib/family/relations";
import type { FamilyRole } from "@/types";

export const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: PERMISSION_ROLE_LABELS.owner,
  caregiver: PERMISSION_ROLE_LABELS.caregiver,
  viewer: PERMISSION_ROLE_LABELS.viewer,
};

export const ROLE_BADGE_CLASSES: Record<FamilyRole, string> = {
  owner: "bg-indigo-500/20 text-indigo-400 border-indigo-500/30",
  caregiver: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  viewer: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export const ROLE_ICONS: Record<FamilyRole, ComponentType<{ className?: string }>> = {
  owner: Crown,
  caregiver: ShieldCheck,
  viewer: Eye,
};
