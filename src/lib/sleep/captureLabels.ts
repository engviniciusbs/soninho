import type { HowFellAsleep, WakeReason } from "@/types";

export interface CaptureOption<T extends string> {
  value: T;
  label: string;
  emoji: string;
}

/** How the baby fell asleep — used in PostSleepReview, SleepForm and SleepCard. */
export const HOW_FELL_ASLEEP_OPTIONS: CaptureOption<HowFellAsleep>[] = [
  { value: "peito", label: "No peito", emoji: "🤱" },
  { value: "mamadeira", label: "Mamadeira", emoji: "🍼" },
  { value: "colo", label: "No colo", emoji: "🤗" },
  { value: "berco", label: "Sozinho no berço", emoji: "🛏️" },
  { value: "carrinho", label: "No carrinho", emoji: "👶" },
  { value: "movimento", label: "Em movimento", emoji: "🚗" },
];

/** Reason the baby woke up — mainly relevant for night sleep. */
export const WAKE_REASON_OPTIONS: CaptureOption<WakeReason>[] = [
  { value: "fome", label: "Fome", emoji: "🍼" },
  { value: "fralda", label: "Fralda", emoji: "💧" },
  { value: "barulho", label: "Barulho", emoji: "🔊" },
  { value: "sozinho", label: "Acordou sozinho", emoji: "😊" },
  { value: "desconforto", label: "Desconforto", emoji: "😣" },
  { value: "outro", label: "Outro", emoji: "❓" },
];

export const HOW_FELL_ASLEEP_LABELS: Record<string, string> = Object.fromEntries(
  HOW_FELL_ASLEEP_OPTIONS.map((o) => [o.value, o.label])
);

export const WAKE_REASON_LABELS: Record<string, string> = Object.fromEntries(
  WAKE_REASON_OPTIONS.map((o) => [o.value, o.label])
);

export const HOW_FELL_ASLEEP_EMOJI: Record<string, string> = Object.fromEntries(
  HOW_FELL_ASLEEP_OPTIONS.map((o) => [o.value, o.emoji])
);

export const WAKE_REASON_EMOJI: Record<string, string> = Object.fromEntries(
  WAKE_REASON_OPTIONS.map((o) => [o.value, o.emoji])
);
