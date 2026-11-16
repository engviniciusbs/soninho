import type { ComponentType } from "react";
import { IconCrown, IconEye, IconShield, type IconProps } from "@/components/brand/icons";
import { PERMISSION_ROLE_LABELS } from "@/lib/family/relations";
import type { FamilyRole } from "@/types";

export const ROLE_LABELS: Record<FamilyRole, string> = {
  owner: PERMISSION_ROLE_LABELS.owner,
  caregiver: PERMISSION_ROLE_LABELS.caregiver,
  viewer: PERMISSION_ROLE_LABELS.viewer,
};

export const ROLE_ICONS: Record<FamilyRole, ComponentType<IconProps>> = {
  owner: IconCrown,
  caregiver: IconShield,
  viewer: IconEye,
};
