import { supabase } from '../lib/supabase'
import { linkStudent, cancelLinkRequest } from '../api/edge'

export type ParentStudentLink = {
  id: string
  parent_user_id: string
  student_user_id: string
  relationship: string | null
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

export type LinkedStudent = {
  id: string
  link_id: string
  user_id: string
  full_name: string | null
  school: string | null
  graduation_year: number | null
  status: 'pending' | 'accepted' | 'declined'
}

export async function getLinkedStudents(parentUserId: string): Promise<LinkedStudent[]> {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select(`
      id,
      student_user_id,
      relationship,
      status,
      profiles!parent_student_links_student_user_id_fkey (
        user_id,
        full_name,
        school,
        graduation_year
      )
    `)
    .eq('parent_user_id', parentUserId)

  if (error || !data) {
    console.warn('Failed to get linked students:', error?.message)
    return []
  }

  return data.map((link: Record<string, unknown>) => {
    const profile = link.profiles as Record<string, unknown> | null
    return {
      id: link.id as string,
      link_id: link.id as string,
      user_id: link.student_user_id as string,
      full_name: profile?.full_name as string | null ?? null,
      school: profile?.school as string | null ?? null,
      graduation_year: profile?.graduation_year as number | null ?? null,
      status: link.status as 'pending' | 'accepted' | 'declined',
    }
  })
}

export async function getPendingLinkRequests(studentUserId: string): Promise<ParentStudentLink[]> {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('*')
    .eq('student_user_id', studentUserId)
    .eq('status', 'pending')

  if (error || !data) {
    console.warn('Failed to get pending link requests:', error?.message)
    return []
  }

  return data as ParentStudentLink[]
}

export async function sendLinkRequest(
  _parentUserId: string,
  studentEmail: string,
  _relationship?: string
): Promise<{ success: boolean; error: string | null }> {
  // Use Edge Function for secure server-side email lookup and role verification
  // The Edge Function handles:
  // - Verifying caller is a parent
  // - Looking up student by email (server-side, not exposed to client)
  // - Verifying target is a student role
  // - Preventing duplicate requests
  // - Creating the pending link request
  try {
    await linkStudent(studentEmail)
    return { success: true, error: null }
  } catch (err) {
    const error = err as { message?: string }
    // Map Edge Function error messages to user-friendly messages
    const message = error.message || 'Failed to send link request'
    if (message.includes('Student account not found')) {
      return { success: false, error: 'No student found with that email address' }
    }
    if (message.includes('Only parent accounts')) {
      return { success: false, error: 'Only parent accounts can link students' }
    }
    if (message.includes('Link already exists')) {
      return { success: false, error: 'You have already sent a link request to this student' }
    }
    return { success: false, error: message }
  }
}

export async function respondToLinkRequest(
  linkId: string,
  accept: boolean
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('parent_student_links')
    .update({ status: accept ? 'accepted' : 'declined' })
    .eq('id', linkId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function removeLinkRequest(
  linkId: string,
  status?: 'pending' | 'accepted' | 'declined'
): Promise<{ success: boolean; error: string | null }> {
  // For pending requests, use Edge Function (more secure, validates parent ownership)
  // For accepted/declined links, use RLS-protected delete
  if (status === 'pending') {
    try {
      await cancelLinkRequest(linkId)
      return { success: true, error: null }
    } catch (err) {
      const error = err as { message?: string }
      return { success: false, error: error.message || 'Failed to cancel request' }
    }
  }

  // For accepted/declined links, use direct delete (RLS protects this)
  const { error } = await supabase
    .from('parent_student_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function getStudentTasks(studentUserId: string) {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', studentUserId)
    .order('due_date', { ascending: true })

  if (error) {
    console.warn('Failed to get student tasks:', error.message)
    return []
  }

  return data
}

export async function getStudentSavedScholarships(studentUserId: string) {
  const { data, error } = await supabase
    .from('saved_scholarships')
    .select(`
      *,
      scholarships (*)
    `)
    .eq('user_id', studentUserId)

  if (error) {
    console.warn('Failed to get student saved scholarships:', error.message)
    return []
  }

  return data
}

export async function assignTaskToStudent(
  parentUserId: string,
  studentUserId: string,
  task: {
    title: string
    description?: string
    due_date?: string
    category?: string
  }
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('tasks')
    .insert({
      user_id: studentUserId,
      title: task.title,
      description: task.description || null,
      due_date: task.due_date || null,
      category: task.category || 'general',
      completed: false,
      created_by: parentUserId,
      assigned_by_role: 'parent',
    })

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
