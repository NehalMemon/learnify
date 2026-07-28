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

export type UserRole = 'STUDENT' | 'ADMIN';
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
          access_expires_at: string | null;
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
          access_expires_at?: string | null;
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
          access_expires_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      credit_requests: {
        Row: {
          id: string;
          user_id: string;
          amount: number;
          status: CreditRequestStatus;
          reason: string | null;
          proof_image_url: string | null;
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          amount: number;
          status?: CreditRequestStatus;
          reason?: string | null;
          proof_image_url?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          amount?: number;
          status?: CreditRequestStatus;
          reason?: string | null;
          proof_image_url?: string | null;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
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
    };
  };
}
