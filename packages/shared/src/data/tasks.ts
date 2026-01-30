// Tasks/Planner data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Task, CreateTaskInput, UpdateTaskInput, TaskCategory, TaskStatus } from '../types'

export const TASK_CATEGORIES: TaskCategory[] = [
  'Applications',
  'Essays',
  'Testing',
  'Scholarships',
  'Financial Aid',
  'Campus Visits',
  'Housing',
  'Enrollment',
  'Documents',
  'Admin/Other'
]

export const TASK_MONTHS = ['Aug-Sep', 'Oct', 'Nov-Dec', 'Jan-Mar', 'Apr-May', 'Summer']

function getCurrentMonth(): string {
  const month = new Date().getMonth()
  if (month >= 7 && month <= 8) return 'Aug-Sep'
  if (month === 9) return 'Oct'
  if (month >= 10 && month <= 11) return 'Nov-Dec'
  if (month >= 0 && month <= 2) return 'Jan-Mar'
  if (month >= 3 && month <= 4) return 'Apr-May'
  return 'Summer'
}

export async function getTasks(supabase: SupabaseClient, userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as Task[]
}

export async function getTask(supabase: SupabaseClient, taskId: string): Promise<Task | null> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('id', taskId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') return null
    throw error
  }

  return data as Task
}

export async function createTask(
  supabase: SupabaseClient,
  userId: string,
  input: CreateTaskInput
): Promise<Task> {
  const { data, error } = await supabase
    .from('user_tasks')
    .insert({
      user_id: userId,
      title: input.title,
      category: input.category ?? 'Admin/Other',
      status: 'todo',
      month: input.month ?? getCurrentMonth(),
      due_date: input.due_date ?? null,
      notes: input.notes ?? null,
      pinned: false
    })
    .select()
    .single()

  if (error) throw error

  return data as Task
}

export async function updateTask(
  supabase: SupabaseClient,
  taskId: string,
  input: UpdateTaskInput
): Promise<Task> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  
  if (input.title !== undefined) updateData.title = input.title
  if (input.category !== undefined) updateData.category = input.category
  if (input.status !== undefined) updateData.status = input.status
  if (input.month !== undefined) updateData.month = input.month
  if (input.due_date !== undefined) updateData.due_date = input.due_date || null
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.pinned !== undefined) updateData.pinned = input.pinned

  const { data, error } = await supabase
    .from('user_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error

  return data as Task
}

export async function toggleTaskComplete(
  supabase: SupabaseClient,
  taskId: string,
  currentStatus: TaskStatus
): Promise<Task> {
  const newStatus: TaskStatus = currentStatus === 'done' ? 'todo' : 'done'
  return updateTask(supabase, taskId, { status: newStatus })
}

export async function deleteTask(supabase: SupabaseClient, taskId: string): Promise<void> {
  const { error } = await supabase
    .from('user_tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

export async function getTaskCounts(
  supabase: SupabaseClient,
  userId: string
): Promise<{ pending: number; completed: number }> {
  const tasks = await getTasks(supabase, userId)
  
  return {
    pending: tasks.filter(t => t.status !== 'done').length,
    completed: tasks.filter(t => t.status === 'done').length
  }
}

export async function getUpcomingTasks(
  supabase: SupabaseClient,
  userId: string,
  limit: number = 5
): Promise<Task[]> {
  const today = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', userId)
    .neq('status', 'done')
    .not('due_date', 'is', null)
    .gte('due_date', today)
    .order('due_date', { ascending: true })
    .limit(limit)

  if (error) throw error

  return (data ?? []) as Task[]
}
