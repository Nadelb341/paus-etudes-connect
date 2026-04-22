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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_quick_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          is_validated: boolean
          student_id: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_validated?: boolean
          student_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_validated?: boolean
          student_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      appointment_views: {
        Row: {
          appointment_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          appointment_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          appointment_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointment_views_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string
          created_by: string | null
          estimated_duration: string
          id: string
          is_visible: boolean | null
          items_to_bring: string | null
          planned_work: string | null
          seen_by_student: boolean | null
          start_time: string
          status: string
          status_note: string | null
          student_id: string
          student_name: string
          subjects: string[]
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string
          created_by?: string | null
          estimated_duration?: string
          id?: string
          is_visible?: boolean | null
          items_to_bring?: string | null
          planned_work?: string | null
          seen_by_student?: boolean | null
          start_time: string
          status?: string
          status_note?: string | null
          student_id: string
          student_name?: string
          subjects?: string[]
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string
          created_by?: string | null
          estimated_duration?: string
          id?: string
          is_visible?: boolean | null
          items_to_bring?: string | null
          planned_work?: string | null
          seen_by_student?: boolean | null
          start_time?: string
          status?: string
          status_note?: string | null
          student_id?: string
          student_name?: string
          subjects?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      chapter_documents: {
        Row: {
          chapter_id: string
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          uploaded_by: string | null
        }
        Insert: {
          chapter_id: string
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          uploaded_by?: string | null
        }
        Update: {
          chapter_id?: string
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chapter_documents_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "subject_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      email_queue: {
        Row: {
          created_at: string | null
          html_body: string
          id: string
          sent: boolean | null
          subject: string
          to_email: string
        }
        Insert: {
          created_at?: string | null
          html_body: string
          id?: string
          sent?: boolean | null
          subject: string
          to_email: string
        }
        Update: {
          created_at?: string | null
          html_body?: string
          id?: string
          sent?: boolean | null
          subject?: string
          to_email?: string
        }
        Relationships: []
      }
      family_accounts: {
        Row: {
          created_at: string
          family_email: string
          id: string
          member_email: string
          member_name: string
          member_user_id: string
        }
        Insert: {
          created_at?: string
          family_email: string
          id?: string
          member_email: string
          member_name?: string
          member_user_id: string
        }
        Update: {
          created_at?: string
          family_email?: string
          id?: string
          member_email?: string
          member_name?: string
          member_user_id?: string
        }
        Relationships: []
      }
      homework: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string
          id: string
          subject_id: string
          target_levels: string[] | null
          target_student_ids: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date: string
          id?: string
          subject_id: string
          target_levels?: string[] | null
          target_student_ids?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string
          id?: string
          subject_id?: string
          target_levels?: string[] | null
          target_student_ids?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      homework_completions: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          homework_id: string
          id: string
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          homework_id: string
          id?: string
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          homework_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homework_completions_homework_id_fkey"
            columns: ["homework_id"]
            isOneToOne: false
            referencedRelation: "homework"
            referencedColumns: ["id"]
          },
        ]
      }
      homework_reminders: {
        Row: {
          created_at: string
          homework_id: string
          id: string
          message: string
          seen_at: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          homework_id: string
          id?: string
          message?: string
          seen_at?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          homework_id?: string
          id?: string
          message?: string
          seen_at?: string | null
          student_id?: string
        }
        Relationships: []
      }
      hourly_rate_settings: {
        Row: {
          id: string
          label: string
          rate: number
        }
        Insert: {
          id: string
          label: string
          rate: number
        }
        Update: {
          id?: string
          label?: string
          rate?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          attachments: Json | null
          content: string
          created_at: string
          id: string
          reactions: Json | null
          recipient_group: string | null
          recipient_ids: string[] | null
          recipient_type: string
          sender_id: string
          sender_name: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          reactions?: Json | null
          recipient_group?: string | null
          recipient_ids?: string[] | null
          recipient_type?: string
          sender_id: string
          sender_name?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          attachments?: Json | null
          content?: string
          created_at?: string
          id?: string
          reactions?: Json | null
          recipient_group?: string | null
          recipient_ids?: string[] | null
          recipient_type?: string
          sender_id?: string
          sender_name?: string | null
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean | null
          message: string
          recipient_group: string | null
          recipient_ids: string[] | null
          recipient_type: string
          scheduled_at: string | null
          sender_id: string | null
          sent_at: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message: string
          recipient_group?: string | null
          recipient_ids?: string[] | null
          recipient_type?: string
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean | null
          message?: string
          recipient_group?: string | null
          recipient_ids?: string[] | null
          recipient_type?: string
          scheduled_at?: string | null
          sender_id?: string | null
          sent_at?: string | null
          title?: string
        }
        Relationships: []
      }
      parent_child_cards: {
        Row: {
          child_name: string
          child_profile_id: string | null
          created_at: string
          general_note: string | null
          id: string
          parent_user_id: string
          updated_at: string
        }
        Insert: {
          child_name?: string
          child_profile_id?: string | null
          created_at?: string
          general_note?: string | null
          id?: string
          parent_user_id: string
          updated_at?: string
        }
        Update: {
          child_name?: string
          child_profile_id?: string | null
          created_at?: string
          general_note?: string | null
          id?: string
          parent_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "parent_child_cards_child_profile_id_fkey"
            columns: ["child_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_tracking: {
        Row: {
          amount_paid: number | null
          created_at: string
          id: string
          is_paid: boolean | null
          parent_card_id: string | null
          payment_date: string | null
          payment_entries: Json | null
          payment_note: string | null
          tutoring_hour_id: string | null
          updated_at: string
        }
        Insert: {
          amount_paid?: number | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          parent_card_id?: string | null
          payment_date?: string | null
          payment_entries?: Json | null
          payment_note?: string | null
          tutoring_hour_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_paid?: number | null
          created_at?: string
          id?: string
          is_paid?: boolean | null
          parent_card_id?: string | null
          payment_date?: string | null
          payment_entries?: Json | null
          payment_note?: string | null
          tutoring_hour_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_tracking_parent_card_id_fkey"
            columns: ["parent_card_id"]
            isOneToOne: false
            referencedRelation: "parent_child_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_tracking_tutoring_hour_id_fkey"
            columns: ["tutoring_hour_id"]
            isOneToOne: false
            referencedRelation: "tutoring_hours"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          bilan_data: Json | null
          birth_date: string | null
          child_name: string | null
          created_at: string
          custom_hourly_rate: number | null
          email: string
          first_name: string
          gender: string | null
          id: string
          is_approved: boolean | null
          known_password: string | null
          remarks: string | null
          school_level: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bilan_data?: Json | null
          birth_date?: string | null
          child_name?: string | null
          created_at?: string
          custom_hourly_rate?: number | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          known_password?: string | null
          remarks?: string | null
          school_level?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bilan_data?: Json | null
          birth_date?: string | null
          child_name?: string | null
          created_at?: string
          custom_hourly_rate?: number | null
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          known_password?: string | null
          remarks?: string | null
          school_level?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      quiz_questions: {
        Row: {
          correct_option: number
          explanation: string | null
          id: string
          options: string[]
          order_index: number | null
          question: string
          quiz_id: string
        }
        Insert: {
          correct_option?: number
          explanation?: string | null
          id?: string
          options?: string[]
          order_index?: number | null
          question: string
          quiz_id: string
        }
        Update: {
          correct_option?: number
          explanation?: string | null
          id?: string
          options?: string[]
          order_index?: number | null
          question?: string
          quiz_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answered_at: string
          attempts: number | null
          id: string
          is_correct: boolean | null
          question_id: string
          selected_option: number
          user_id: string
        }
        Insert: {
          answered_at?: string
          attempts?: number | null
          id?: string
          is_correct?: boolean | null
          question_id: string
          selected_option: number
          user_id: string
        }
        Update: {
          answered_at?: string
          attempts?: number | null
          id?: string
          is_correct?: boolean | null
          question_id?: string
          selected_option?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "quiz_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          subject_id: string
          title: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          subject_id: string
          title: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          subject_id?: string
          title?: string
        }
        Relationships: []
      }
      scheduled_notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          module: string | null
          notification_type: string | null
          recipient_user_id: string | null
          scheduled_at: string
          sent: boolean | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          notification_type?: string | null
          recipient_user_id?: string | null
          scheduled_at: string
          sent?: boolean | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          module?: string | null
          notification_type?: string | null
          recipient_user_id?: string | null
          scheduled_at?: string
          sent?: boolean | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      subject_chapters: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          order_index: number | null
          subject_id: string
          target_student_id: string | null
          theme_id: string | null
          title: string
          updated_at: string
          youtube_links: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          subject_id: string
          target_student_id?: string | null
          theme_id?: string | null
          title?: string
          updated_at?: string
          youtube_links?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          order_index?: number | null
          subject_id?: string
          target_student_id?: string | null
          theme_id?: string | null
          title?: string
          updated_at?: string
          youtube_links?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "subject_chapters_theme_id_fkey"
            columns: ["theme_id"]
            isOneToOne: false
            referencedRelation: "subject_themes"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_comments: {
        Row: {
          chapter_id: string | null
          content: string
          created_at: string
          id: string
          subject_id: string
          user_id: string
          user_name: string
        }
        Insert: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          subject_id: string
          user_id: string
          user_name?: string
        }
        Update: {
          chapter_id?: string | null
          content?: string
          created_at?: string
          id?: string
          subject_id?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "subject_comments_chapter_id_fkey"
            columns: ["chapter_id"]
            isOneToOne: false
            referencedRelation: "subject_chapters"
            referencedColumns: ["id"]
          },
        ]
      }
      subject_content: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_visible: boolean | null
          subject_id: string
          target_student_id: string | null
          title: string | null
          updated_at: string
          youtube_links: string[] | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          subject_id: string
          target_student_id?: string | null
          title?: string | null
          updated_at?: string
          youtube_links?: string[] | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_visible?: boolean | null
          subject_id?: string
          target_student_id?: string | null
          title?: string | null
          updated_at?: string
          youtube_links?: string[] | null
        }
        Relationships: []
      }
      subject_documents: {
        Row: {
          created_at: string
          file_name: string
          file_type: string | null
          file_url: string
          id: string
          subject_id: string
          target_student_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          subject_id: string
          target_student_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          subject_id?: string
          target_student_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: []
      }
      subject_themes: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          order_index: number | null
          subject_id: string
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index?: number | null
          subject_id: string
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          order_index?: number | null
          subject_id?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      tutoring_hours: {
        Row: {
          created_at: string
          created_by: string | null
          duration_hours: number
          hourly_rate: number
          id: string
          notes: string | null
          session_date: string
          student_id: string
          subject: string | null
          track_note: boolean | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          duration_hours?: number
          hourly_rate: number
          id?: string
          notes?: string | null
          session_date: string
          student_id: string
          subject?: string | null
          track_note?: boolean | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          duration_hours?: number
          hourly_rate?: number
          id?: string
          notes?: string | null
          session_date?: string
          student_id?: string
          subject?: string | null
          track_note?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_delete_user: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      get_student_email_html: {
        Args: { p_student_id: string }
        Returns: string
      }
      pausetude_email_template: {
        Args: { p_emoji: string; p_rows: string; p_titre: string }
        Returns: string
      }
      process_email_queue: { Args: never; Returns: undefined }
      queue_pausetude_email: {
        Args: { p_html: string; p_subject: string }
        Returns: undefined
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
