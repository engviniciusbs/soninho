/** Family-facing labels (who you are to the baby), not permission roles. */
export const FAMILY_RELATIONS = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "avo", label: "Avô" },
  { value: "ava", label: "Avó" },
  { value: "irmao", label: "Irmão" },
  { value: "irma", label: "Irma" },
  { value: "tio", label: "Tio" },
  { value: "tia", label: "Tia" },
  { value: "padrinho", label: "Padrinho" },
  { value: "madrinha", label: "Madrinha" },
  { value: "babá", label: "Babá" },
  { value: "cuidador", label: "Cuidador(a)" },
  { value: "outro", label: "Outro" },
] as const;

export type FamilyRelationValue = (typeof FAMILY_RELATIONS)[number]["value"];

export function getFamilyRelationLabel(
  value: string | null | undefined
): string | null {
  if (!value) return null;
  const found = FAMILY_RELATIONS.find((r) => r.value === value);
  return found?.label ?? value;
}

/** Short label for push / toasts: "Pai", "Mãe", etc. */
export function getActorDisplayLabel(
  relation: string | null | undefined,
  displayName: string | null | undefined,
  email: string | null | undefined
): string {
  const relationLabel = getFamilyRelationLabel(relation);
  if (relationLabel) return relationLabel;
  if (displayName?.trim()) return displayName.trim();
  if (email) return email.split("@")[0] ?? "Alguém";
  return "Alguém";
}

export const PERMISSION_ROLE_LABELS = {
  owner: "Administrador(a)",
  caregiver: "Pode registrar sono",
  viewer: "Só visualizar",
} as const;
