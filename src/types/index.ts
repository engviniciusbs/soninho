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

export type UserProfile = Database["public"]["Tables"]["user_profiles"]["Row"];
export type UserProfileUpdate =
  Database["public"]["Tables"]["user_profiles"]["Update"];

export type SleepActivityLog =
  Database["public"]["Tables"]["sleep_activity_log"]["Row"];

export type UiMode = "standard" | "nanny";

export type FamilyRelationValue =
  import("@/lib/family/relations").FamilyRelationValue;

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
  /** Whether the next sleep is a daytime nap or night/bedtime sleep. */
  kind: SleepType;
  suggestedNapTime: string;
  windowStart: string;
  windowEnd: string;
  reasoning: string;
  confidence: "high" | "medium" | "low";
  /** Minutes until suggested time (0 when overdue or "Assim que possível"). */
  minutesUntilSuggested: number;
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

/* ─── Feeding (Mamadeiras) ──────────────────────────────────────────────── */

export type MilkType = "FORMULA" | "BREAST_MILK" | "MIXED";
export type BreastSide = "LEFT" | "RIGHT";
export type FoodReaction =
  | "LOVED"
  | "LIKED"
  | "NEUTRAL"
  | "DISLIKED"
  | "ALLERGIC_REACTION";
export type FeedingType = "BOTTLE" | "BREAST" | "SOLID";

export type BottleFeeding =
  Database["public"]["Tables"]["bottle_feedings"]["Row"];
export type BottleFeedingInsert =
  Database["public"]["Tables"]["bottle_feedings"]["Insert"];
export type BottleFeedingUpdate =
  Database["public"]["Tables"]["bottle_feedings"]["Update"];

export type BreastfeedingSession =
  Database["public"]["Tables"]["breastfeeding_sessions"]["Row"];
export type BreastfeedingSessionInsert =
  Database["public"]["Tables"]["breastfeeding_sessions"]["Insert"];
export type BreastfeedingSessionUpdate =
  Database["public"]["Tables"]["breastfeeding_sessions"]["Update"];

export type SolidFeeding =
  Database["public"]["Tables"]["solid_feedings"]["Row"];
export type SolidFeedingInsert =
  Database["public"]["Tables"]["solid_feedings"]["Insert"];
export type SolidFeedingUpdate =
  Database["public"]["Tables"]["solid_feedings"]["Update"];

export type FeedingActivityLog =
  Database["public"]["Tables"]["feeding_activity_log"]["Row"];
export type FeedingActivityLogInsert =
  Database["public"]["Tables"]["feeding_activity_log"]["Insert"];

/** Normalized item used to render a unified feeding timeline/history. */
export interface FeedingTimelineItem {
  id: string;
  type: FeedingType;
  startTime: string;
  endTime: string | null;
  /** Short human-readable summary, e.g. "120ml fórmula" or "12min (E/D)". */
  summary: string;
  raw: BottleFeeding | BreastfeedingSession | SolidFeeding;
}

export interface FeedingSuggestion {
  suggestedTime: string;
  minutesUntilSuggested: number;
  avgIntervalMinutes: number | null;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}
