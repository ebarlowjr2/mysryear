import { createBrowserClient } from '@supabase/ssr'
import { createServerClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-key'

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey)
}

export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
          }
        },
      },
    }
  )
}

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          role: 'student' | 'parent' | 'counselor' | 'business' | 'teacher'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          role: 'student' | 'parent' | 'counselor' | 'business' | 'teacher'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          role?: 'student' | 'parent' | 'counselor' | 'business' | 'teacher'
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
      user_profiles: {
        Row: {
          id: string
          user_id: string
          state: string | null
          path: 'College' | 'Trade/Apprenticeship' | 'Military' | 'Gap Year' | 'Workforce' | 'Entrepreneurship' | null
          testing: 'SAT' | 'ACT' | 'Both' | 'None' | null
          early_action: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          state?: string | null
          path?: 'College' | 'Trade/Apprenticeship' | 'Military' | 'Gap Year' | 'Workforce' | 'Entrepreneurship' | null
          testing?: 'SAT' | 'ACT' | 'Both' | 'None' | null
          early_action?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          state?: string | null
          path?: 'College' | 'Trade/Apprenticeship' | 'Military' | 'Gap Year' | 'Workforce' | 'Entrepreneurship' | null
          testing?: 'SAT' | 'ACT' | 'Both' | 'None' | null
          early_action?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_tasks: {
        Row: {
          id: string
          user_id: string
          title: string
          category: 'Applications' | 'Essays' | 'Testing' | 'Scholarships' | 'Financial Aid' | 'Campus Visits' | 'Housing' | 'Enrollment' | 'Documents' | 'Admin/Other'
          status: 'todo' | 'doing' | 'done'
          month: string
          due_date: string | null
          notes: string | null
          pinned: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          category: 'Applications' | 'Essays' | 'Testing' | 'Scholarships' | 'Financial Aid' | 'Campus Visits' | 'Housing' | 'Enrollment' | 'Documents' | 'Admin/Other'
          status?: 'todo' | 'doing' | 'done'
          month: string
          due_date?: string | null
          notes?: string | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          category?: 'Applications' | 'Essays' | 'Testing' | 'Scholarships' | 'Financial Aid' | 'Campus Visits' | 'Housing' | 'Enrollment' | 'Documents' | 'Admin/Other'
          status?: 'todo' | 'doing' | 'done'
          month?: string
          due_date?: string | null
          notes?: string | null
          pinned?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_documents: {
        Row: {
          id: string
          user_id: string
          document_type: string
          completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          document_type: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          document_type?: string
          completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      user_recommenders: {
        Row: {
          id: string
          user_id: string
          name: string
          email: string | null
          role: string | null
          requested_date: string | null
          submitted_date: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          email?: string | null
          role?: string | null
          requested_date?: string | null
          submitted_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          email?: string | null
          role?: string | null
          requested_date?: string | null
          submitted_date?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      user_visits: {
        Row: {
          id: string
          user_id: string
          name: string
          visit_date: string | null
          rating: number | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          visit_date?: string | null
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          visit_date?: string | null
          rating?: number | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      parent_student_links: {
        Row: {
          id: string
          parent_user_id: string
          student_user_id: string
          status: 'pending' | 'accepted' | 'declined'
          requested_by: 'parent' | 'student'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          parent_user_id: string
          student_user_id: string
          status?: 'pending' | 'accepted' | 'declined'
          requested_by?: 'parent' | 'student'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          parent_user_id?: string
          student_user_id?: string
          status?: 'pending' | 'accepted' | 'declined'
          requested_by?: 'parent' | 'student'
          created_at?: string
          updated_at?: string
        }
      }
      business_profiles: {
        Row: {
          user_id: string
          org_name: string | null
          org_website: string | null
          org_email: string | null
          phone: string | null
          industry: string | null
          hq_state: string | null
          hq_county: string | null
          verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          org_name?: string | null
          org_website?: string | null
          org_email?: string | null
          phone?: string | null
          industry?: string | null
          hq_state?: string | null
          hq_county?: string | null
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          org_name?: string | null
          org_website?: string | null
          org_email?: string | null
          phone?: string | null
          industry?: string | null
          hq_state?: string | null
          hq_county?: string | null
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
      schools: {
        Row: {
          id: string
          name: string
          district: string | null
          city: string | null
          state: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          district?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          district?: string | null
          city?: string | null
          state?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      teacher_profiles: {
        Row: {
          user_id: string
          title: string | null
          school_id: string | null
          verification_status: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          title?: string | null
          school_id?: string | null
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          title?: string | null
          school_id?: string | null
          verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected'
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}

export type UserRole = 'student' | 'parent' | 'counselor' | 'business' | 'teacher'
export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'
export type LinkStatus = 'pending' | 'accepted' | 'declined'
