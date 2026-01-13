import { createClient, Database } from './supabase'

type LinkInsert = Database['public']['Tables']['parent_student_links']['Insert']

export interface LinkedStudent {
  id: string
  linkId: string
  email: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export interface ParentRequest {
  id: string
  linkId: string
  parentEmail: string
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
}

export async function listLinkedStudents(parentUserId: string): Promise<LinkedStudent[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('parent_student_links')
    .select(`
      id,
      student_user_id,
      status,
      created_at,
      users!parent_student_links_student_user_id_fkey (
        email
      )
    `)
    .eq('parent_user_id', parentUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching linked students:', error)
    return []
  }

  return (data || []).map((link) => ({
    id: link.student_user_id,
    linkId: link.id,
    email: (link.users as { email: string } | null)?.email || 'Unknown',
    status: link.status as 'pending' | 'accepted' | 'declined',
    createdAt: link.created_at,
  }))
}

export async function listParentRequests(studentUserId: string): Promise<ParentRequest[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('parent_student_links')
    .select(`
      id,
      parent_user_id,
      status,
      created_at,
      users!parent_student_links_parent_user_id_fkey (
        email
      )
    `)
    .eq('student_user_id', studentUserId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching parent requests:', error)
    return []
  }

  return (data || []).map((link) => ({
    id: link.parent_user_id,
    linkId: link.id,
    parentEmail: (link.users as { email: string } | null)?.email || 'Unknown',
    status: link.status as 'pending' | 'accepted' | 'declined',
    createdAt: link.created_at,
  }))
}

export async function createLinkRequest(
  parentUserId: string,
  studentEmail: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const { data: studentData, error: studentError } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', studentEmail)
    .single()

  if (studentError || !studentData) {
    return { success: false, error: 'Student not found with this email' }
  }

  if (studentData.role !== 'student') {
    return { success: false, error: 'This email does not belong to a student account' }
  }

  const { data: existingLink } = await supabase
    .from('parent_student_links')
    .select('id, status')
    .eq('parent_user_id', parentUserId)
    .eq('student_user_id', studentData.id)
    .single()

  if (existingLink) {
    if (existingLink.status === 'accepted') {
      return { success: false, error: 'You are already linked to this student' }
    }
    if (existingLink.status === 'pending') {
      return { success: false, error: 'A link request is already pending for this student' }
    }
  }

  const linkData: LinkInsert = {
    parent_user_id: parentUserId,
    student_user_id: studentData.id,
    status: 'pending',
    requested_by: 'parent',
  }

  const { error: insertError } = await supabase
    .from('parent_student_links')
    .insert(linkData)

  if (insertError) {
    console.error('Error creating link request:', insertError)
    return { success: false, error: 'Failed to create link request' }
  }

  return { success: true }
}

export async function respondToLinkRequest(
  linkId: string,
  response: 'accepted' | 'declined'
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('parent_student_links')
    .update({ status: response, updated_at: new Date().toISOString() })
    .eq('id', linkId)

  if (error) {
    console.error('Error responding to link request:', error)
    return { success: false, error: 'Failed to update link request' }
  }

  return { success: true }
}

export async function removeLink(linkId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('parent_student_links')
    .delete()
    .eq('id', linkId)

  if (error) {
    console.error('Error removing link:', error)
    return { success: false, error: 'Failed to remove link' }
  }

  return { success: true }
}
