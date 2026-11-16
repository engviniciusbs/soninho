import type { BabySex } from "@/types";

/** The three forms of a gendered word or phrase: menina, menino, não informado. */
export interface GenderForms {
  f: string;
  m: string;
  /** Neutral, always grammatical: used when `babies.sex` is null. */
  n: string;
}

/**
 * Picks the form that agrees with the baby's sex (`babies.sex`). Anything
 * other than 'F' or 'M' (null, undefined, an unexpected value) is treated as
 * "não informado" and gets the neutral form.
 */
export function g(sex: BabySex | null | undefined, forms: GenderForms): string {
  if (sex === "F") return forms.f;
  if (sex === "M") return forms.m;
  return forms.n;
}

/** `babies.sex` as stored (text) narrowed to the app type; anything else is null. */
export function toBabySex(value: unknown): BabySex | null {
  return value === "F" || value === "M" ? value : null;
}
