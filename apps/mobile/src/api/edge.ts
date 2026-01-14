import { supabase } from '@/src/lib/supabase'

export async function callEdge<T>(name: string, body: unknown): Promise<T> {
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
