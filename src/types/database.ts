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
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          birth_date: string;
          avatar_emoji?: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          birth_date?: string;
          avatar_emoji?: string;
          avatar_url?: string | null;
          created_at?: string;
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
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
