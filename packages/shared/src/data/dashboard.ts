// Dashboard data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DashboardMetrics, NextDeadline } from '../types'

export async function getDashboardMetrics(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardMetrics> {
  const [scholarshipsResult, tasksResult, applicationsResult] = await Promise.all([
    supabase
      .from('scraped_scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('user_tasks')
      .select('id, status, due_date')
      .eq('user_id', userId),
    supabase
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
  ])

  const scholarshipsCount = scholarshipsResult.count ?? 0
  const applicationsCount = applicationsResult.count ?? 0

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
    completedTasks,
    applicationsCount
  }
}

export async function getNextDeadline(
  supabase: SupabaseClient,
  userId: string
): Promise<NextDeadline> {
  const today = new Date().toISOString().split('T')[0]
  
  // Get next task deadline
  const { data: taskData } = await supabase
    .from('user_tasks')
    .select('title, due_date, category')
    .eq('user_id', userId)
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(1)
    .single()

  // Get next application deadline
  const { data: appData } = await supabase
    .from('applications')
    .select('college_name, deadline')
    .eq('user_id', userId)
    .not('status', 'in', '("accepted","rejected")')
    .not('deadline', 'is', null)
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(1)
    .single()

  // Compare and return the soonest
  if (!taskData && !appData) return null

  if (!taskData) {
    return {
      title: appData!.college_name,
      dueDate: appData!.deadline,
      category: 'Application',
      type: 'application'
    }
  }

  if (!appData) {
    return {
      title: taskData.title,
      dueDate: taskData.due_date,
      category: taskData.category,
      type: 'task'
    }
  }

  // Both exist, compare dates
  const taskDate = new Date(taskData.due_date)
  const appDate = new Date(appData.deadline)

  if (taskDate <= appDate) {
    return {
      title: taskData.title,
      dueDate: taskData.due_date,
      category: taskData.category,
      type: 'task'
    }
  } else {
    return {
      title: appData.college_name,
      dueDate: appData.deadline,
      category: 'Application',
      type: 'application'
    }
  }
}

export async function getUpcomingDeadlines(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 5
): Promise<Array<{ title: string; dueDate: string; type: 'task' | 'application'; category?: string }>> {
  const today = new Date().toISOString().split('T')[0]
  
  // Get upcoming tasks
  const { data: tasks } = await supabase
    .from('user_tasks')
    .select('title, due_date, category')
    .eq('user_id', userId)
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit)

  // Get upcoming applications
  const { data: apps } = await supabase
    .from('applications')
    .select('college_name, deadline')
    .eq('user_id', userId)
    .not('status', 'in', '("accepted","rejected")')
    .not('deadline', 'is', null)
    .gte('deadline', today)
    .order('deadline', { ascending: true })
    .limit(limit)

  // Combine and sort
  const combined: Array<{ title: string; dueDate: string; type: 'task' | 'application'; category?: string }> = []

  if (tasks) {
    tasks.forEach(t => {
      combined.push({
        title: t.title,
        dueDate: t.due_date,
        type: 'task',
        category: t.category
      })
    })
  }

  if (apps) {
    apps.forEach(a => {
      combined.push({
        title: a.college_name,
        dueDate: a.deadline,
        type: 'application',
        category: 'Application'
      })
    })
  }

  // Sort by date and limit
  return combined
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    .slice(0, limit)
}
