export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      connection_invites: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          expires_at: string
          id: string
          invite_code: string | null
          invitee_email: string | null
          inviter_id: string
          status: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at: string
          id?: string
          invite_code?: string | null
          invitee_email?: string | null
          inviter_id: string
          status?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          expires_at?: string
          id?: string
          invite_code?: string | null
          invitee_email?: string | null
          inviter_id?: string
          status?: string
        }
        Relationships: []
      }
      connections: {
        Row: {
          accepted_at: string | null
          created_at: string | null
          id: string
          status: string
          type: string
          user_a: string
          user_b: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          type?: string
          user_a: string
          user_b: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string | null
          id?: string
          status?: string
          type?: string
          user_a?: string
          user_b?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          read_at: string | null
          recipient_id: string
          reminder_id: string | null
          sender_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id: string
          reminder_id?: string | null
          sender_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          read_at?: string | null
          recipient_id?: string
          reminder_id?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          email_notifications: boolean | null
          muted_connection_ids: string[] | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          email_notifications?: boolean | null
          muted_connection_ids?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          email_notifications?: boolean | null
          muted_connection_ids?: string[] | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_subscriptions: {
        Row: {
          created_at: string | null
          endpoint: string
          id: string
          keys: Json | null
          last_seen_at: string | null
          platform: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          id?: string
          keys?: Json | null
          last_seen_at?: string | null
          platform: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          id?: string
          keys?: Json | null
          last_seen_at?: string | null
          platform?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string | null
          display_name: string | null
          id: string
          timezone: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          display_name?: string | null
          id: string
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          display_name?: string | null
          id?: string
          timezone?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      reminder_completions: {
        Row: {
          completed_at: string | null
          completed_by: string
          completed_for_date: string
          id: string
          reminder_id: string
        }
        Insert: {
          completed_at?: string | null
          completed_by: string
          completed_for_date: string
          id?: string
          reminder_id: string
        }
        Update: {
          completed_at?: string | null
          completed_by?: string
          completed_for_date?: string
          id?: string
          reminder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_completions_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_skips: {
        Row: {
          created_at: string | null
          id: string
          reason: string | null
          reminder_id: string
          skipped_by: string
          skipped_for_date: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reminder_id: string
          skipped_by: string
          skipped_for_date: string
        }
        Update: {
          created_at?: string | null
          id?: string
          reason?: string | null
          reminder_id?: string
          skipped_by?: string
          skipped_for_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_skips_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          archived_at: string | null
          created_at: string | null
          created_by: string
          custom_days: number[] | null
          due_time: string | null
          id: string
          notes: string | null
          owner_id: string
          recurrence: string
          sort_order: number | null
          target_user_id: string | null
          title: string
          updated_at: string | null
          visibility: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          created_by: string
          custom_days?: number[] | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id: string
          recurrence?: string
          sort_order?: number | null
          target_user_id?: string | null
          title: string
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          created_by?: string
          custom_days?: number[] | null
          due_time?: string | null
          id?: string
          notes?: string | null
          owner_id?: string
          recurrence?: string
          sort_order?: number | null
          target_user_id?: string | null
          title?: string
          updated_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
      sprints: {
        Row: {
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          name: string
          start_date: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          name: string
          start_date: string
          user_id?: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          name?: string
          start_date?: string
          user_id?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          due_date: string | null
          id: string
          labels: string[]
          priority: string
          status: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[]
          priority?: string
          status?: string
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          due_date?: string | null
          id?: string
          labels?: string[]
          priority?: string
          status?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_invite: { Args: { code: string }; Returns: string }
      archive_reminder: {
        Args: { p_reminder_id: string }
        Returns: {
          archived_at: string | null
          created_at: string | null
          created_by: string
          custom_days: number[] | null
          due_time: string | null
          id: string
          notes: string | null
          owner_id: string
          recurrence: string
          sort_order: number | null
          target_user_id: string | null
          title: string
          updated_at: string | null
          visibility: string
        }
        SetofOptions: {
          from: "*"
          to: "reminders"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      are_connected: { Args: { a: string; b: string }; Returns: boolean }
      mark_reminder_complete: {
        Args: { p_reminder_id: string }
        Returns: {
          completed_at: string | null
          completed_by: string
          completed_for_date: string
          id: string
          reminder_id: string
        }
        SetofOptions: {
          from: "*"
          to: "reminder_completions"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      skip_reminder_today: {
        Args: { p_reminder_id: string }
        Returns: {
          created_at: string | null
          id: string
          reason: string | null
          reminder_id: string
          skipped_by: string
          skipped_for_date: string
        }
        SetofOptions: {
          from: "*"
          to: "reminder_skips"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      unmark_reminder_complete: {
        Args: { p_reminder_id: string }
        Returns: undefined
      }
      unskip_reminder_today: {
        Args: { p_reminder_id: string }
        Returns: undefined
      }
      user_now_time: { Args: { uid: string }; Returns: string }
      user_today: { Args: { uid: string }; Returns: string }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
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
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
