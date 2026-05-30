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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
