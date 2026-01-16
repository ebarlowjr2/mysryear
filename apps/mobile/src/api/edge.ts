import { supabase } from '@/src/lib/supabase'

export async function callEdge<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke<T>(name, { body })
  if (error) throw error
  return data as T
}

// Type definitions for Edge Function responses
export interface LinkStudentResponse {
  success: boolean
  message: string
}

export interface CancelLinkRequestResponse {
  success: boolean
}

export interface EdgeErrorResponse {
  error: string
}

// Helper functions for specific Edge Functions
export async function linkStudent(studentEmail: string): Promise<LinkStudentResponse> {
  return callEdge<LinkStudentResponse>('link-student', { studentEmail })
}

export async function cancelLinkRequest(linkId: string): Promise<CancelLinkRequestResponse> {
  return callEdge<CancelLinkRequestResponse>('cancel-link-request', { linkId })
}

// Sprint 9C: Parent Experience Edge Functions

// Response type for parent-student-summary
export interface ParentStudentSummaryResponse {
  student: {
    id: string
    first_name: string | null
    last_name: string | null
    full_name: string | null
    graduation_year: number | null
    school_name: string | null
  }
  metrics: {
    tasks_total: number
    tasks_completed: number
    tasks_pending: number
    applications_total: number
    saved_scholarships_total: number
    next_task_due: { id: string; title: string; due_date: string } | null
    next_application_deadline: { id: string; college_name: string; deadline: string } | null
  }
  previews: {
    tasks_due_soon: Array<{ id: string; title: string; due_date: string; category: string }>
    applications_upcoming: Array<{ id: string; college_name: string; deadline: string; status: string }>
  }
}

// Response type for parent-create-student-task
export interface ParentCreateTaskResponse {
  success: boolean
  taskId: string
}

// Get summary dashboard for a linked student
export async function getParentStudentSummary(studentUserId: string): Promise<ParentStudentSummaryResponse> {
  return callEdge<ParentStudentSummaryResponse>('parent-student-summary', { studentUserId })
}

// Create a task for a linked student
export async function parentCreateStudentTask(
  studentUserId: string,
  title: string,
  due_date?: string | null,
  notes?: string | null,
  category?: string
): Promise<ParentCreateTaskResponse> {
  return callEdge<ParentCreateTaskResponse>('parent-create-student-task', {
    studentUserId,
    title,
    due_date,
    notes,
    category,
  })
}
