export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      babies: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          birth_date: string;
          avatar_emoji: string;
          avatar_url: string | null;
          family_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          birth_date: string;
          avatar_emoji?: string;
          avatar_url?: string | null;
          family_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          birth_date?: string;
          avatar_emoji?: string;
          avatar_url?: string | null;
          family_id?: string | null;
          created_at?: string;
        };
      };
      families: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_by?: string;
          created_at?: string;
        };
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string;
          role: "owner" | "caregiver" | "viewer";
          display_name: string | null;
          email: string | null;
          family_relation: string | null;
          invited_by: string | null;
          joined_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id: string;
          role?: "owner" | "caregiver" | "viewer";
          display_name?: string | null;
          email?: string | null;
          family_relation?: string | null;
          invited_by?: string | null;
          joined_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string;
          role?: "owner" | "caregiver" | "viewer";
          display_name?: string | null;
          email?: string | null;
          family_relation?: string | null;
          invited_by?: string | null;
          joined_at?: string;
        };
      };
      family_invites: {
        Row: {
          id: string;
          family_id: string;
          token: string;
          role: "caregiver" | "viewer";
          family_relation: string | null;
          created_by: string;
          created_at: string;
          expires_at: string;
          accepted_at: string | null;
          accepted_by: string | null;
          revoked_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          token?: string;
          role?: "caregiver" | "viewer";
          family_relation?: string | null;
          created_by: string;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          token?: string;
          role?: "caregiver" | "viewer";
          family_relation?: string | null;
          created_by?: string;
          created_at?: string;
          expires_at?: string;
          accepted_at?: string | null;
          accepted_by?: string | null;
          revoked_at?: string | null;
        };
      };
      sleep_sessions: {
        Row: {
          id: string;
          baby_id: string;
          type: "NAP" | "NIGHT_SLEEP";
          start_time: string;
          end_time: string | null;
          duration_min: number | null;
          quality: number | null;
          notes: string | null;
          location: string | null;
          room_temp_celsius: number | null;
          weather_condition: string | null;
          sleep_sack_type: string | null;
          sleep_sack_tog: number | null;
          clothing_description: string | null;
          how_fell_asleep: string | null;
          wake_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          type: "NAP" | "NIGHT_SLEEP";
          start_time: string;
          end_time?: string | null;
          duration_min?: number | null;
          quality?: number | null;
          notes?: string | null;
          location?: string | null;
          room_temp_celsius?: number | null;
          weather_condition?: string | null;
          sleep_sack_type?: string | null;
          sleep_sack_tog?: number | null;
          clothing_description?: string | null;
          how_fell_asleep?: string | null;
          wake_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          type?: "NAP" | "NIGHT_SLEEP";
          start_time?: string;
          end_time?: string | null;
          duration_min?: number | null;
          quality?: number | null;
          notes?: string | null;
          location?: string | null;
          room_temp_celsius?: number | null;
          weather_condition?: string | null;
          sleep_sack_type?: string | null;
          sleep_sack_tog?: number | null;
          clothing_description?: string | null;
          how_fell_asleep?: string | null;
          wake_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      nap_suggestion_feedback: {
        Row: {
          id: string;
          baby_id: string;
          user_id: string;
          suggested_time: string | null;
          window_start: string | null;
          window_end: string | null;
          age_weeks: number | null;
          vote: "up" | "down";
          created_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          user_id: string;
          suggested_time?: string | null;
          window_start?: string | null;
          window_end?: string | null;
          age_weeks?: number | null;
          vote: "up" | "down";
          created_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          user_id?: string;
          suggested_time?: string | null;
          window_start?: string | null;
          window_end?: string | null;
          age_weeks?: number | null;
          vote?: "up" | "down";
          created_at?: string;
        };
      };
      family_notes: {
        Row: {
          id: string;
          family_id: string;
          author_id: string | null;
          author_name: string | null;
          body: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          author_id?: string | null;
          author_name?: string | null;
          body: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          author_id?: string | null;
          author_name?: string | null;
          body?: string;
          created_at?: string;
        };
      };
      sleep_activity_log: {
        Row: {
          id: string;
          baby_id: string;
          family_id: string | null;
          actor_user_id: string;
          actor_name: string | null;
          actor_relation: string | null;
          action: "started" | "stopped";
          sleep_session_id: string | null;
          sleep_type: "NAP" | "NIGHT_SLEEP" | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          family_id?: string | null;
          actor_user_id: string;
          actor_name?: string | null;
          actor_relation?: string | null;
          action: "started" | "stopped";
          sleep_session_id?: string | null;
          sleep_type?: "NAP" | "NIGHT_SLEEP" | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          family_id?: string | null;
          actor_user_id?: string;
          actor_name?: string | null;
          actor_relation?: string | null;
          action?: "started" | "stopped";
          sleep_session_id?: string | null;
          sleep_type?: "NAP" | "NIGHT_SLEEP" | null;
          created_at?: string;
        };
      };
      bottle_feedings: {
        Row: {
          id: string;
          baby_id: string;
          start_time: string;
          volume_ml: number;
          milk_type: "FORMULA" | "BREAST_MILK" | "MIXED";
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          start_time: string;
          volume_ml: number;
          milk_type: "FORMULA" | "BREAST_MILK" | "MIXED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          start_time?: string;
          volume_ml?: number;
          milk_type?: "FORMULA" | "BREAST_MILK" | "MIXED";
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      breastfeeding_sessions: {
        Row: {
          id: string;
          baby_id: string;
          start_time: string;
          end_time: string | null;
          side_left_sec: number;
          side_right_sec: number;
          last_side: "LEFT" | "RIGHT" | null;
          duration_min: number | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          start_time: string;
          end_time?: string | null;
          side_left_sec?: number;
          side_right_sec?: number;
          last_side?: "LEFT" | "RIGHT" | null;
          duration_min?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          start_time?: string;
          end_time?: string | null;
          side_left_sec?: number;
          side_right_sec?: number;
          last_side?: "LEFT" | "RIGHT" | null;
          duration_min?: number | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      solid_feedings: {
        Row: {
          id: string;
          baby_id: string;
          start_time: string;
          food_tags: string[];
          reaction:
            | "LOVED"
            | "LIKED"
            | "NEUTRAL"
            | "DISLIKED"
            | "ALLERGIC_REACTION"
            | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          start_time: string;
          food_tags?: string[];
          reaction?:
            | "LOVED"
            | "LIKED"
            | "NEUTRAL"
            | "DISLIKED"
            | "ALLERGIC_REACTION"
            | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          start_time?: string;
          food_tags?: string[];
          reaction?:
            | "LOVED"
            | "LIKED"
            | "NEUTRAL"
            | "DISLIKED"
            | "ALLERGIC_REACTION"
            | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      feeding_activity_log: {
        Row: {
          id: string;
          baby_id: string;
          family_id: string | null;
          actor_user_id: string;
          actor_name: string | null;
          actor_relation: string | null;
          action: "started" | "stopped" | "logged";
          feeding_type: "BOTTLE" | "BREAST" | "SOLID";
          reference_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          baby_id: string;
          family_id?: string | null;
          actor_user_id: string;
          actor_name?: string | null;
          actor_relation?: string | null;
          action: "started" | "stopped" | "logged";
          feeding_type: "BOTTLE" | "BREAST" | "SOLID";
          reference_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          baby_id?: string;
          family_id?: string | null;
          actor_user_id?: string;
          actor_name?: string | null;
          actor_relation?: string | null;
          action?: "started" | "stopped" | "logged";
          feeding_type?: "BOTTLE" | "BREAST" | "SOLID";
          reference_id?: string | null;
          created_at?: string;
        };
      };
      user_profiles: {
        Row: {
          user_id: string;
          display_name: string | null;
          family_relation: string | null;
          ui_mode: "standard" | "nanny";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          display_name?: string | null;
          family_relation?: string | null;
          ui_mode?: "standard" | "nanny";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          display_name?: string | null;
          family_relation?: string | null;
          ui_mode?: "standard" | "nanny";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_family_ids: { Args: { uid: string }; Returns: string[] };
      get_user_owned_family_ids: { Args: { uid: string }; Returns: string[] };
      user_can_write_family: {
        Args: { uid: string; fid: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
  };
}
