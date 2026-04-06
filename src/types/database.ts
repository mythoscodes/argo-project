// Supabase CLI로 자동 생성될 타입 파일
// 실행: pnpm supabase gen types typescript --local > src/types/database.ts
// 마이그레이션 적용 후 이 파일을 재생성하면 아래 수동 타입이 대체됩니다

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      academies: {
        Row: {
          id: string;
          name: string;
          branch_code: string | null;
          plan: string;
          max_students: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          branch_code?: string | null;
          plan?: string;
          max_students?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          branch_code?: string | null;
          plan?: string;
          max_students?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          academy_id: string;
          role: string;
          display_name: string;
          email: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          academy_id: string;
          role: string;
          display_name: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          academy_id?: string;
          role?: string;
          display_name?: string;
          email?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          teacher_id: string;
          academy_id: string;
          title: string;
          subject: string;
          course_category: string | null;
          topics: Json;
          status: string;
          join_code: string | null;
          anonymous_mode: boolean;
          created_at: string;
          started_at: string | null;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          teacher_id: string;
          academy_id: string;
          title: string;
          subject: string;
          course_category?: string | null;
          topics?: Json;
          status?: string;
          join_code?: string | null;
          anonymous_mode?: boolean;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          teacher_id?: string;
          academy_id?: string;
          title?: string;
          subject?: string;
          course_category?: string | null;
          topics?: Json;
          status?: string;
          join_code?: string | null;
          anonymous_mode?: boolean;
          created_at?: string;
          started_at?: string | null;
          ended_at?: string | null;
        };
        Relationships: [];
      };
      session_participants: {
        Row: {
          id: string;
          session_id: string;
          student_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          student_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          student_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      quizzes: {
        Row: {
          id: string;
          session_id: string;
          question_text: string;
          question_type: string;
          code_snippet: string | null;
          code_language: string | null;
          options: Json;
          correct_answer: string;
          topic_tag: string;
          misconception_tags: Json | null;
          round_number: number;
          order_index: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          question_text: string;
          question_type: string;
          code_snippet?: string | null;
          code_language?: string | null;
          options: Json;
          correct_answer: string;
          topic_tag: string;
          misconception_tags?: Json | null;
          round_number?: number;
          order_index: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          question_text?: string;
          question_type?: string;
          code_snippet?: string | null;
          code_language?: string | null;
          options?: Json;
          correct_answer?: string;
          topic_tag?: string;
          misconception_tags?: Json | null;
          round_number?: number;
          order_index?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      responses: {
        Row: {
          id: string;
          quiz_id: string;
          session_id: string;
          student_id: string;
          selected_answer: string;
          is_correct: boolean;
          response_time_ms: number | null;
          round_number: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          session_id: string;
          student_id: string;
          selected_answer: string;
          is_correct: boolean;
          response_time_ms?: number | null;
          round_number?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          quiz_id?: string;
          session_id?: string;
          student_id?: string;
          selected_answer?: string;
          is_correct?: boolean;
          response_time_ms?: number | null;
          round_number?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      analysis_results: {
        Row: {
          id: string;
          session_id: string;
          analysis_type: string;
          understanding_scores: Json | null;
          weak_topics: Json | null;
          misconception_clusters: Json | null;
          coaching_suggestion: string | null;
          full_report: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          analysis_type: string;
          understanding_scores?: Json | null;
          weak_topics?: Json | null;
          misconception_clusters?: Json | null;
          coaching_suggestion?: string | null;
          full_report?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          analysis_type?: string;
          understanding_scores?: Json | null;
          weak_topics?: Json | null;
          misconception_clusters?: Json | null;
          coaching_suggestion?: string | null;
          full_report?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      student_reports: {
        Row: {
          id: string;
          student_id: string;
          academy_id: string;
          session_id: string | null;
          report_type: string;
          understanding_summary: Json | null;
          weak_topics: Json | null;
          recommendations: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          student_id: string;
          academy_id: string;
          session_id?: string | null;
          report_type: string;
          understanding_summary?: Json | null;
          weak_topics?: Json | null;
          recommendations?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          student_id?: string;
          academy_id?: string;
          session_id?: string | null;
          report_type?: string;
          understanding_summary?: Json | null;
          weak_topics?: Json | null;
          recommendations?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      plan_features: {
        Row: {
          id: string;
          plan: string;
          feature_key: string;
          feature_value: Json;
        };
        Insert: {
          id?: string;
          plan: string;
          feature_key: string;
          feature_value: Json;
        };
        Update: {
          id?: string;
          plan?: string;
          feature_key?: string;
          feature_value?: Json;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
