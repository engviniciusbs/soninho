
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "babies": {
                  Row: {
                    "avatar_emoji": string | null,"avatar_url": string | null,"birth_date": string,"created_at": string | null,"family_id": string | null,"id": string,"name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_emoji"?: string | null,"avatar_url"?: string | null,"birth_date": string,"created_at"?: string | null,"family_id"?: string | null,"id"?: string,"name": string,"user_id": string
                  }
                  Update: {
                    "avatar_emoji"?: string | null,"avatar_url"?: string | null,"birth_date"?: string,"created_at"?: string | null,"family_id"?: string | null,"id"?: string,"name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "babies_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"bottle_feedings": {
                  Row: {
                    "baby_id": string,"created_at": string,"id": string,"milk_type": string,"notes": string | null,"start_time": string,"updated_at": string,"volume_ml": number
                  }
                  ComputedFields: never
                  Insert: {
                    "baby_id": string,"created_at"?: string,"id"?: string,"milk_type": string,"notes"?: string | null,"start_time": string,"updated_at"?: string,"volume_ml": number
                  }
                  Update: {
                    "baby_id"?: string,"created_at"?: string,"id"?: string,"milk_type"?: string,"notes"?: string | null,"start_time"?: string,"updated_at"?: string,"volume_ml"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "bottle_feedings_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    }
                  ]
                },"breastfeeding_sessions": {
                  Row: {
                    "baby_id": string,"created_at": string,"duration_min": number | null,"end_time": string | null,"id": string,"last_side": string | null,"notes": string | null,"side_left_sec": number,"side_right_sec": number,"start_time": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "baby_id": string,"created_at"?: string,"duration_min"?: number | null,"end_time"?: string | null,"id"?: string,"last_side"?: string | null,"notes"?: string | null,"side_left_sec"?: number,"side_right_sec"?: number,"start_time": string,"updated_at"?: string
                  }
                  Update: {
                    "baby_id"?: string,"created_at"?: string,"duration_min"?: number | null,"end_time"?: string | null,"id"?: string,"last_side"?: string | null,"notes"?: string | null,"side_left_sec"?: number,"side_right_sec"?: number,"start_time"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "breastfeeding_sessions_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    }
                  ]
                },"email_log": {
                  Row: {
                    "dedupe_key": string | null,"id": string,"kind": string,"period_end": string | null,"period_start": string | null,"sent_at": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "dedupe_key"?: string | null,"id"?: string,"kind": string,"period_end"?: string | null,"period_start"?: string | null,"sent_at"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "dedupe_key"?: string | null,"id"?: string,"kind"?: string,"period_end"?: string | null,"period_start"?: string | null,"sent_at"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"created_by": string,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by": string,"id"?: string,"name"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"created_by": string,"expires_at": string,"family_id": string,"family_relation": string | null,"id": string,"revoked_at": string | null,"role": string,"token": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by": string,"expires_at"?: string,"family_id": string,"family_relation"?: string | null,"id"?: string,"revoked_at"?: string | null,"role"?: string,"token"?: string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"family_id"?: string,"family_relation"?: string | null,"id"?: string,"revoked_at"?: string | null,"role"?: string,"token"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_invites_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"family_members": {
                  Row: {
                    "display_name": string | null,"email": string | null,"family_id": string,"family_relation": string | null,"id": string,"invited_by": string | null,"joined_at": string,"role": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "display_name"?: string | null,"email"?: string | null,"family_id": string,"family_relation"?: string | null,"id"?: string,"invited_by"?: string | null,"joined_at"?: string,"role"?: string,"user_id": string
                  }
                  Update: {
                    "display_name"?: string | null,"email"?: string | null,"family_id"?: string,"family_relation"?: string | null,"id"?: string,"invited_by"?: string | null,"joined_at"?: string,"role"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"family_notes": {
                  Row: {
                    "author_id": string | null,"author_name": string | null,"body": string,"created_at": string,"family_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string | null,"author_name"?: string | null,"body": string,"created_at"?: string,"family_id": string,"id"?: string
                  }
                  Update: {
                    "author_id"?: string | null,"author_name"?: string | null,"body"?: string,"created_at"?: string,"family_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_notes_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"feeding_activity_log": {
                  Row: {
                    "action": string,"actor_name": string | null,"actor_relation": string | null,"actor_user_id": string,"baby_id": string,"created_at": string,"family_id": string | null,"feeding_type": string,"id": string,"reference_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_name"?: string | null,"actor_relation"?: string | null,"actor_user_id": string,"baby_id": string,"created_at"?: string,"family_id"?: string | null,"feeding_type": string,"id"?: string,"reference_id"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_name"?: string | null,"actor_relation"?: string | null,"actor_user_id"?: string,"baby_id"?: string,"created_at"?: string,"family_id"?: string | null,"feeding_type"?: string,"id"?: string,"reference_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "feeding_activity_log_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feeding_activity_log_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"nap_suggestion_feedback": {
                  Row: {
                    "age_weeks": number | null,"baby_id": string,"created_at": string,"id": string,"suggested_time": string | null,"user_id": string,"vote": string,"window_end": string | null,"window_start": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "age_weeks"?: number | null,"baby_id": string,"created_at"?: string,"id"?: string,"suggested_time"?: string | null,"user_id": string,"vote": string,"window_end"?: string | null,"window_start"?: string | null
                  }
                  Update: {
                    "age_weeks"?: number | null,"baby_id"?: string,"created_at"?: string,"id"?: string,"suggested_time"?: string | null,"user_id"?: string,"vote"?: string,"window_end"?: string | null,"window_start"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "nap_suggestion_feedback_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_events": {
                  Row: {
                    "baby_id": string,"dedupe_key": string,"event_type": string,"id": string,"scheduled_for": string | null,"sent_at": string | null,"session_id": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "baby_id": string,"dedupe_key": string,"event_type": string,"id"?: string,"scheduled_for"?: string | null,"sent_at"?: string | null,"session_id": string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "baby_id"?: string,"dedupe_key"?: string,"event_type"?: string,"id"?: string,"scheduled_for"?: string | null,"sent_at"?: string | null,"session_id"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notification_events_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "notification_events_session_id_fkey"
      columns: ["session_id"]
isOneToOne: false
      referencedRelation: "sleep_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"notification_preferences": {
                  Row: {
                    "alert_before_minutes": number,"created_at": string,"enabled": boolean,"quiet_hours_end": string,"quiet_hours_start": string,"timezone": string,"updated_at": string,"user_id": string,"weekly_email_enabled": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "alert_before_minutes"?: number,"created_at"?: string,"enabled"?: boolean,"quiet_hours_end"?: string,"quiet_hours_start"?: string,"timezone"?: string,"updated_at"?: string,"user_id": string,"weekly_email_enabled"?: boolean
                  }
                  Update: {
                    "alert_before_minutes"?: number,"created_at"?: string,"enabled"?: boolean,"quiet_hours_end"?: string,"quiet_hours_start"?: string,"timezone"?: string,"updated_at"?: string,"user_id"?: string,"weekly_email_enabled"?: boolean
                  }
                  Relationships: [
                    
                  ]
                },"push_subscriptions": {
                  Row: {
                    "auth": string,"created_at": string,"endpoint": string,"id": string,"is_active": boolean,"last_seen_at": string,"p256dh": string,"user_agent": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth": string,"created_at"?: string,"endpoint": string,"id"?: string,"is_active"?: boolean,"last_seen_at"?: string,"p256dh": string,"user_agent"?: string | null,"user_id": string
                  }
                  Update: {
                    "auth"?: string,"created_at"?: string,"endpoint"?: string,"id"?: string,"is_active"?: boolean,"last_seen_at"?: string,"p256dh"?: string,"user_agent"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"sleep_activity_log": {
                  Row: {
                    "action": string,"actor_name": string | null,"actor_relation": string | null,"actor_user_id": string,"baby_id": string,"created_at": string,"family_id": string | null,"id": string,"sleep_session_id": string | null,"sleep_type": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_name"?: string | null,"actor_relation"?: string | null,"actor_user_id": string,"baby_id": string,"created_at"?: string,"family_id"?: string | null,"id"?: string,"sleep_session_id"?: string | null,"sleep_type"?: string | null
                  }
                  Update: {
                    "action"?: string,"actor_name"?: string | null,"actor_relation"?: string | null,"actor_user_id"?: string,"baby_id"?: string,"created_at"?: string,"family_id"?: string | null,"id"?: string,"sleep_session_id"?: string | null,"sleep_type"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sleep_activity_log_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sleep_activity_log_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "sleep_activity_log_sleep_session_id_fkey"
      columns: ["sleep_session_id"]
isOneToOne: false
      referencedRelation: "sleep_sessions"
      referencedColumns: ["id"]
    }
                  ]
                },"sleep_sessions": {
                  Row: {
                    "baby_id": string,"clothing_description": string | null,"created_at": string | null,"duration_min": number | null,"end_time": string | null,"how_fell_asleep": string | null,"id": string,"location": string | null,"notes": string | null,"quality": number | null,"room_temp_celsius": number | null,"sleep_sack_tog": number | null,"sleep_sack_type": string | null,"start_time": string,"type": string,"updated_at": string | null,"wake_reason": string | null,"weather_condition": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "baby_id": string,"clothing_description"?: string | null,"created_at"?: string | null,"duration_min"?: number | null,"end_time"?: string | null,"how_fell_asleep"?: string | null,"id"?: string,"location"?: string | null,"notes"?: string | null,"quality"?: number | null,"room_temp_celsius"?: number | null,"sleep_sack_tog"?: number | null,"sleep_sack_type"?: string | null,"start_time": string,"type": string,"updated_at"?: string | null,"wake_reason"?: string | null,"weather_condition"?: string | null
                  }
                  Update: {
                    "baby_id"?: string,"clothing_description"?: string | null,"created_at"?: string | null,"duration_min"?: number | null,"end_time"?: string | null,"how_fell_asleep"?: string | null,"id"?: string,"location"?: string | null,"notes"?: string | null,"quality"?: number | null,"room_temp_celsius"?: number | null,"sleep_sack_tog"?: number | null,"sleep_sack_type"?: string | null,"start_time"?: string,"type"?: string,"updated_at"?: string | null,"wake_reason"?: string | null,"weather_condition"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "sleep_sessions_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    }
                  ]
                },"solid_feedings": {
                  Row: {
                    "baby_id": string,"created_at": string,"food_tags": (string)[],"id": string,"notes": string | null,"reaction": string | null,"start_time": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "baby_id": string,"created_at"?: string,"food_tags"?: (string)[],"id"?: string,"notes"?: string | null,"reaction"?: string | null,"start_time": string,"updated_at"?: string
                  }
                  Update: {
                    "baby_id"?: string,"created_at"?: string,"food_tags"?: (string)[],"id"?: string,"notes"?: string | null,"reaction"?: string | null,"start_time"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "solid_feedings_baby_id_fkey"
      columns: ["baby_id"]
isOneToOne: false
      referencedRelation: "babies"
      referencedColumns: ["id"]
    }
                  ]
                },"user_profiles": {
                  Row: {
                    "created_at": string,"display_name": string | null,"family_relation": string | null,"ui_mode": string,"updated_at": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string | null,"family_relation"?: string | null,"ui_mode"?: string,"updated_at"?: string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string | null,"family_relation"?: string | null,"ui_mode"?: string,"updated_at"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_family_invite":
{ Args: { "p_display_name"?: string,"p_token": string }; Returns: string
                           },
"create_baby_with_family":
{ Args: { "p_avatar_emoji"?: string,"p_avatar_url"?: string,"p_birth_date": string,"p_name": string }; Returns: {
              "avatar_emoji": string | null,
"avatar_url": string | null,
"birth_date": string,
"created_at": string | null,
"family_id": string | null,
"id": string,
"name": string,
"user_id": string
            }
                          SetofOptions: {
        from: "*"
        to: "babies"
        isOneToOne: true
        isSetofReturn: false
      } },
"get_invite_preview":
{ Args: { "p_token": string }; Returns: {
              "expires_at": string,"family_name": string,"family_relation": string,"inviter_name": string,"role": string,"status": string
            }[]
                           },
"get_user_family_ids":
{ Args: { "uid": string }; Returns: string[]
                           },
"get_user_owned_family_ids":
{ Args: { "uid": string }; Returns: string[]
                           },
"user_can_write_family":
{ Args: { "fid": string,"uid": string }; Returns: boolean
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
