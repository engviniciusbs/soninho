import type { BabySex, HowFellAsleep, WakeReason } from "@/types";
import { g } from "@/lib/i18n/gender";

export interface CaptureOption<T extends string> {
  value: T;
  label: string;
  emoji: string;
}

/** How the baby fell asleep, in agreement with `babies.sex` (neutral when null). */
export function howFellAsleepOptions(sex: BabySex | null | undefined): CaptureOption<HowFellAsleep>[] {
  return [
    { value: "peito", label: "No peito", emoji: "🤱" },
    { value: "mamadeira", label: "Mamadeira", emoji: "🍼" },
    { value: "colo", label: "No colo", emoji: "🤗" },
    {
      value: "berco",
      label: g(sex, { f: "Sozinha no berço", m: "Sozinho no berço", n: "No berço, sem ajuda" }),
      emoji: "🛏️",
    },
    { value: "carrinho", label: "No carrinho", emoji: "👶" },
    { value: "movimento", label: "Em movimento", emoji: "🚗" },
  ];
}

/** Reason the baby woke up (mainly night sleep), in agreement with `babies.sex`. */
export function wakeReasonOptions(sex: BabySex | null | undefined): CaptureOption<WakeReason>[] {
  return [
    { value: "fome", label: "Fome", emoji: "🍼" },
    { value: "fralda", label: "Fralda", emoji: "💧" },
    { value: "barulho", label: "Barulho", emoji: "🔊" },
    {
      value: "sozinho",
      label: g(sex, { f: "Acordou sozinha", m: "Acordou sozinho", n: "Acordou por conta própria" }),
      emoji: "😊",
    },
    { value: "desconforto", label: "Desconforto", emoji: "😣" },
    { value: "outro", label: "Outro", emoji: "❓" },
  ];
}

const toLabels = <T extends string>(options: CaptureOption<T>[]): Record<string, string> =>
  Object.fromEntries(options.map((o) => [o.value, o.label]));

export function howFellAsleepLabels(sex: BabySex | null | undefined): Record<string, string> {
  return toLabels(howFellAsleepOptions(sex));
}

export function wakeReasonLabels(sex: BabySex | null | undefined): Record<string, string> {
  return toLabels(wakeReasonOptions(sex));
}
