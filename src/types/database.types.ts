export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'student' | 'admin';

export type MaterialType =
  | 'lecture_note'
  | 'pdf'
  | 'slide'
  | 'assignment'
  | 'lab'
  | 'previous_question'
  | 'suggestion'
  | 'other';

export type DeadlineType =
  | 'assignment'
  | 'lab_report'
  | 'quiz'
  | 'project'
  | 'presentation'
  | 'other';

export type ExamType =
  | 'quiz'
  | 'midterm'
  | 'final'
  | 'lab_exam'
  | 'viva'
  | 'presentation';

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          student_id: string | null;
          roll: string | null;
          section: string | null;
          batch: string | null;
          avatar_url: string | null;
          role: UserRole;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          email: string;
          student_id?: string | null;
          roll?: string | null;
          section?: string | null;
          batch?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          email?: string;
          student_id?: string | null;
          roll?: string | null;
          section?: string | null;
          batch?: string | null;
          avatar_url?: string | null;
          role?: UserRole;
          created_at?: string;
          updated_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          user_id?: string | null;
          course_code: string;
          course_name: string;
          teacher_name: string;
          description: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          course_code: string;
          course_name: string;
          teacher_name: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          course_code?: string;
          course_name?: string;
          teacher_name?: string;
          description?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notices: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          description: string;
          course_id: string | null;
          attachment_url: string | null;
          attachment_name: string | null;
          is_important: boolean;
          is_pinned: boolean;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          // Joined relations
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description: string;
          course_id?: string | null;
          attachment_url?: string | null;
          attachment_name?: string | null;
          is_important?: boolean;
          is_pinned?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string;
          course_id?: string | null;
          attachment_url?: string | null;
          attachment_name?: string | null;
          is_important?: boolean;
          is_pinned?: boolean;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      materials: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          description: string | null;
          course_id: string;
          material_type: MaterialType;
          file_url: string | null;
          file_name: string | null;
          external_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          course_id: string;
          material_type: MaterialType;
          file_url?: string | null;
          file_name?: string | null;
          external_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          course_id?: string;
          material_type?: MaterialType;
          file_url?: string | null;
          file_name?: string | null;
          external_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      deadlines: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          description: string | null;
          course_id: string;
          deadline_type: DeadlineType;
          due_date: string;
          due_time: string | null;
          attachment_url: string | null;
          external_url: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          course_id: string;
          deadline_type: DeadlineType;
          due_date: string;
          due_time?: string | null;
          attachment_url?: string | null;
          external_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          course_id?: string;
          deadline_type?: DeadlineType;
          due_date?: string;
          due_time?: string | null;
          attachment_url?: string | null;
          external_url?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      exams: {
        Row: {
          id: string;
          user_id?: string | null;
          course_id: string;
          exam_type: ExamType;
          exam_date: string;
          start_time: string;
          end_time: string;
          room: string;
          instructions: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          course_id: string;
          exam_type: ExamType;
          exam_date: string;
          start_time: string;
          end_time: string;
          room: string;
          instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          course_id?: string;
          exam_type?: ExamType;
          exam_date?: string;
          start_time?: string;
          end_time?: string;
          room?: string;
          instructions?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          description: string | null;
          course_id: string | null;
          event_type: string;
          start_datetime: string;
          end_datetime: string;
          location: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          course_id?: string | null;
          event_type?: string;
          start_datetime: string;
          end_datetime: string;
          location?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          course_id?: string | null;
          event_type?: string;
          start_datetime?: string;
          end_datetime?: string;
          location?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      important_links: {
        Row: {
          id: string;
          user_id?: string | null;
          title: string;
          description: string | null;
          url: string;
          course_id: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
          courses?: Database['public']['Tables']['courses']['Row'] | null;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          title: string;
          description?: string | null;
          url: string;
          course_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          title?: string;
          description?: string | null;
          url?: string;
          course_id?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          related_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type?: string;
          related_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          related_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
      activity_logs: {
        Row: {
          id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          created_at?: string;
        };
      };
    };
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      promote_user_to_admin: {
        Args: { target_email: string };
        Returns: string;
      };
    };
  };
}
