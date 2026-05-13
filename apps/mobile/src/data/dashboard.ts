import { supabase } from '../lib/supabase'

export type DashboardMetrics = {
  scholarshipsCount: number
  upcomingDeadlines: number
  pendingTasks: number
  completedTasks: number
}

export type NextDeadline = {
  title: string
  dueDate: string
  category: string
} | null

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [scholarshipsResult, tasksResult] = await Promise.all([
    supabase
      .from('scraped_scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('user_tasks')
      .select('id, status, due_date')
      .eq('user_id', userId)
  ])

  const scholarshipsCount = scholarshipsResult.count ?? 0

  const tasks = tasksResult.data ?? []
  const now = new Date()
  
  const pendingTasks = tasks.filter(t => t.status !== 'done').length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const upcomingDeadlines = tasks.filter(t => {
    if (!t.due_date) return false
    const dueDate = new Date(t.due_date)
    return dueDate >= now && t.status !== 'done'
  }).length

  return {
    scholarshipsCount,
    upcomingDeadlines,
    pendingTasks,
    completedTasks
  }
}

export async function getNextDeadline(userId: string): Promise<NextDeadline> {
  const now = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('user_tasks')
    .select('title, due_date, category')
    .eq('user_id', userId)
    .neq('status', 'done')
    .gte('due_date', now)
    .order('due_date', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    title: data.title,
    dueDate: data.due_date,
    category: data.category
  }
}
