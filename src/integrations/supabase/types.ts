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
      messages: {
        Row: {
          content: string
          created_at: string
          id: string
          recipient_group: string | null
          recipient_ids: string[] | null
          recipient_type: string
          sender_id: string
          sender_name: string | null
          subject: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          recipient_group?: string | null
          recipient_ids?: string[] | null
          recipient_type?: string
          sender_id: string
          sender_name?: string | null
          subject?: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
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
      profiles: {
        Row: {
          birth_date: string | null
          child_name: string | null
          created_at: string
          email: string
          first_name: string
          gender: string | null
          id: string
          is_approved: boolean | null
          remarks: string | null
          school_level: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          birth_date?: string | null
          child_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          remarks?: string | null
          school_level?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          birth_date?: string | null
          child_name?: string | null
          created_at?: string
          email?: string
          first_name?: string
          gender?: string | null
          id?: string
          is_approved?: boolean | null
          remarks?: string | null
          school_level?: string
          status?: string
          updated_at?: string
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
      subject_content: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_visible: boolean | null
          subject_id: string
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
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          file_name: string
          file_type?: string | null
          file_url: string
          id?: string
          subject_id: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          file_name?: string
          file_type?: string | null
          file_url?: string
          id?: string
          subject_id?: string
          uploaded_by?: string | null
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
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
