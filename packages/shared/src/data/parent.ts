// Parent-Student data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParentStudentLink, LinkedStudent, ParentStudentSummary, LinkStatus } from '../types'

export async function getLinkedStudents(
  supabase: SupabaseClient,
  parentUserId: string
): Promise<LinkedStudent[]> {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select(`
      id,
      student_user_id,
      status,
      profiles!parent_student_links_student_user_id_fkey (
        full_name,
        first_name,
        last_name
      )
    `)
    .eq('parent_user_id', parentUserId)
    .eq('status', 'accepted')

  if (error) {
    console.error('Error fetching linked students:', error)
    return []
  }

  return (data || []).map((link: any) => ({
    id: link.id,
    student_user_id: link.student_user_id,
    student_name: link.profiles?.full_name || 
      `${link.profiles?.first_name || ''} ${link.profiles?.last_name || ''}`.trim() || 
      'Student',
    student_email: '', // Not exposed for privacy
    status: link.status as LinkStatus
  }))
}

export async function getPendingLinkRequests(
  supabase: SupabaseClient,
  studentUserId: string
): Promise<ParentStudentLink[]> {
  const { data, error } = await supabase
    .from('parent_student_links')
    .select('*')
    .eq('student_user_id', studentUserId)
    .eq('status', 'pending')

  if (error) {
    console.error('Error fetching pending requests:', error)
    return []
  }

  return (data || []) as ParentStudentLink[]
}

export async function getParentStudentSummary(
  supabase: SupabaseClient,
  parentUserId: string,
  studentUserId: string
): Promise<ParentStudentSummary | null> {
  // Verify the parent has access to this student
  const { data: link, error: linkError } = await supabase
    .from('parent_student_links')
    .select('id')
    .eq('parent_user_id', parentUserId)
    .eq('student_user_id', studentUserId)
    .eq('status', 'accepted')
    .single()

  if (linkError || !link) {
    console.error('Parent does not have access to this student')
    return null
  }

  // Fetch student data
  const [tasksResult, applicationsResult] = await Promise.all([
    supabase
      .from('user_tasks')
      .select('id, title, status, due_date')
      .eq('user_id', studentUserId)
      .order('due_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('applications')
      .select('id, college_name, status, deadline')
      .eq('user_id', studentUserId)
      .order('deadline', { ascending: true, nullsFirst: false })
  ])

  const tasks = tasksResult.data || []
  const applications = applicationsResult.data || []

  const pendingTasks = tasks.filter(t => t.status !== 'done').length
  const completedTasks = tasks.filter(t => t.status === 'done').length

  const today = new Date().toISOString().split('T')[0]
  
  // Get upcoming deadlines
  const upcomingDeadlines: Array<{ title: string; dueDate: string; type: 'task' | 'application' }> = []
  
  tasks
    .filter(t => t.due_date && t.due_date >= today && t.status !== 'done')
    .slice(0, 3)
    .forEach(t => {
      upcomingDeadlines.push({
        title: t.title,
        dueDate: t.due_date!,
        type: 'task'
      })
    })

  applications
    .filter(a => a.deadline && a.deadline >= today && !['accepted', 'rejected'].includes(a.status))
    .slice(0, 3)
    .forEach(a => {
      upcomingDeadlines.push({
        title: a.college_name,
        dueDate: a.deadline!,
        type: 'application'
      })
    })

  // Sort by date
  upcomingDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

  return {
    metrics: {
      pendingTasks,
      completedTasks,
      applicationsCount: applications.length,
      scholarshipsCount: 0 // Not tracking scholarships for students yet
    },
    upcomingDeadlines: upcomingDeadlines.slice(0, 5),
    recentTasks: tasks.slice(0, 5).map(t => ({
      id: t.id,
      title: t.title,
      status: t.status,
      dueDate: t.due_date
    })),
    recentApplications: applications.slice(0, 5).map(a => ({
      id: a.id,
      collegeName: a.college_name,
      status: a.status,
      deadline: a.deadline
    }))
  }
}

// Note: Link request creation and response should use Edge Functions
// for security (email lookup, notifications, etc.)
// These are just read operations for the web dashboard
