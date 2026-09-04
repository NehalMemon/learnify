/**
 * Supabase Database TypeScript Definitions
 * Credit-based SaaS Model with Role-Based Access Control (RBAC)
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = 'STUDENT' | 'INSTRUCTOR' | 'ADMIN';
export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING';
export type CreditRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type LogLevel = 'INFO' | 'WARN' | 'ERROR';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          phone: string | null;
          role: UserRole;
          status: UserStatus;
          credits: number;
          has_seen_quiz_disclaimer: boolean;
          university_program: string | null;
          study_year: number | null;
          education_board: string | null;
          class_grade: string | null;
          avatar_url: string | null;
          google_refresh_token: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name: string;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          credits?: number;
          has_seen_quiz_disclaimer?: boolean;
          university_program?: string | null;
          study_year?: number | null;
          education_board?: string | null;
          class_grade?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          phone?: string | null;
          role?: UserRole;
          status?: UserStatus;
          credits?: number;
          has_seen_quiz_disclaimer?: boolean;
          university_program?: string | null;
          study_year?: number | null;
          education_board?: string | null;
          class_grade?: string | null;
          avatar_url?: string | null;
          google_refresh_token?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_requests: {
        Row: {
          id: string;
          user_id: string;
          package_name: string | null;
          credits_requested: number;
          status: CreditRequestStatus;
          proof_image_url: string | null;
          resolved_by: string | null;
          resolved_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          package_name?: string | null;
          credits_requested: number;
          status?: CreditRequestStatus;
          proof_image_url?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          package_name?: string | null;
          credits_requested?: number;
          status?: CreditRequestStatus;
          proof_image_url?: string | null;
          resolved_by?: string | null;
          resolved_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_logs: {
        Row: {
          id: string;
          level: LogLevel;
          action: string;
          message: string;
          metadata: Json | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          level?: LogLevel;
          action: string;
          message: string;
          metadata?: Json | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          level?: LogLevel;
          action?: string;
          message?: string;
          metadata?: Json | null;
          user_id?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          message: string;
          type: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          message?: string;
          type?: string;
          link?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
  };
}
