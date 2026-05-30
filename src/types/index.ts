import type { Database } from "./database";

export type Baby = Database["public"]["Tables"]["babies"]["Row"];
export type BabyInsert = Database["public"]["Tables"]["babies"]["Insert"];
export type BabyUpdate = Database["public"]["Tables"]["babies"]["Update"];

export type Family = Database["public"]["Tables"]["families"]["Row"];
export type FamilyInsert = Database["public"]["Tables"]["families"]["Insert"];

export type FamilyMember =
  Database["public"]["Tables"]["family_members"]["Row"];
export type FamilyMemberInsert =
  Database["public"]["Tables"]["family_members"]["Insert"];

export type FamilyInvite =
  Database["public"]["Tables"]["family_invites"]["Row"];
export type FamilyInviteInsert =
  Database["public"]["Tables"]["family_invites"]["Insert"];

export type FamilyRole = "owner" | "caregiver" | "viewer";

export type SleepSession =
  Database["public"]["Tables"]["sleep_sessions"]["Row"];
export type SleepSessionInsert =
  Database["public"]["Tables"]["sleep_sessions"]["Insert"];
export type SleepSessionUpdate =
  Database["public"]["Tables"]["sleep_sessions"]["Update"];

export type SleepType = "NAP" | "NIGHT_SLEEP";

export type NapSuggestionFeedback =
  Database["public"]["Tables"]["nap_suggestion_feedback"]["Row"];
export type NapSuggestionFeedbackInsert =
  Database["public"]["Tables"]["nap_suggestion_feedback"]["Insert"];

export type FamilyNote = Database["public"]["Tables"]["family_notes"]["Row"];
export type FamilyNoteInsert =
  Database["public"]["Tables"]["family_notes"]["Insert"];

/** How the baby fell asleep — captured on stop / manual entry. */
export type HowFellAsleep =
  | "peito"
  | "mamadeira"
  | "colo"
  | "berco"
  | "carrinho"
  | "movimento";

/** Reason the baby woke up — mainly for night sleep. */
export type WakeReason =
  | "fome"
  | "fralda"
  | "barulho"
  | "sozinho"
  | "desconforto"
  | "outro";

export interface AISuggestion {
  suggestedNapTime: string;
  windowStart: string;
  windowEnd: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
}

export interface SleepStats {
  totalSleepMinutes: number;
  napCount: number;
  avgNapDuration: number;
  longestStretch: number;
}

export interface WakeWindowRange {
  minMinutes: number;
  maxMinutes: number;
  label: string;
}
