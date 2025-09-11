import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'student' | 'parent' | 'counselor'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'student' | 'parent' | 'counselor'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'student' | 'parent' | 'counselor'
          created_at?: string
          updated_at?: string
        }
      }
      journeys: {
        Row: {
          id: string
          student_id: string
          created_by: string
          status: 'active' | 'pending'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_id: string
          created_by: string
          status?: 'active' | 'pending'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_id?: string
          created_by?: string
          status?: 'active' | 'pending'
          created_at?: string
          updated_at?: string
        }
      }
      academic_records: {
        Row: {
          id: string
          journey_id: string
          subject: string
          credits: number
          grade: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          subject: string
          credits: number
          grade: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          subject?: string
          credits?: number
          grade?: string
          created_at?: string
          updated_at?: string
        }
      }
      scholarships: {
        Row: {
          id: string
          title: string
          deadline: string
          eligibility: {
            gpa_min?: number
            grade_level?: string
            financial_need?: boolean
            leadership?: boolean
            community_service?: number
          }
          link: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          deadline: string
          eligibility?: {
            gpa_min?: number
            grade_level?: string
            financial_need?: boolean
            leadership?: boolean
            community_service?: number
          }
          link: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          deadline?: string
          eligibility?: {
            gpa_min?: number
            grade_level?: string
            financial_need?: boolean
            leadership?: boolean
            community_service?: number
          }
          link?: string
          created_at?: string
          updated_at?: string
        }
      }
      service_hours: {
        Row: {
          id: string
          journey_id: string
          organization: string
          hours: number
          verified: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          journey_id: string
          organization: string
          hours: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          journey_id?: string
          organization?: string
          hours?: number
          verified?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          message: string
          type: string
          read: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          message: string
          type: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          message?: string
          type?: string
          read?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
