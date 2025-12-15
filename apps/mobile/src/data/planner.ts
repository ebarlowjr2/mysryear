import { supabase } from '../lib/supabase'

export type Category = 
  | 'Applications' 
  | 'Essays' 
  | 'Testing' 
  | 'Scholarships' 
  | 'Financial Aid' 
  | 'Campus Visits' 
  | 'Housing' 
  | 'Enrollment' 
  | 'Documents' 
  | 'Admin/Other'

export type Status = 'todo' | 'doing' | 'done'

export type Task = {
  id: string
  title: string
  category: Category
  status: Status
  month: string
  dueDate?: string
  notes?: string
  pinned: boolean
}

export type CreateTaskInput = {
  title: string
  category?: Category
  month?: string
  dueDate?: string
  notes?: string
}

export type UpdateTaskInput = {
  title?: string
  category?: Category
  status?: Status
  month?: string
  dueDate?: string
  notes?: string
  pinned?: boolean
}

export async function getTasks(userId: string): Promise<Task[]> {
  const { data, error } = await supabase
    .from('user_tasks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []).map(row => ({
    id: row.id,
    title: row.title,
    category: row.category as Category,
    status: row.status as Status,
    month: row.month,
    dueDate: row.due_date ?? undefined,
    notes: row.notes ?? undefined,
    pinned: row.pinned ?? false
  }))
}

export async function createTask(userId: string, input: CreateTaskInput): Promise<Task> {
  const { data, error } = await supabase
    .from('user_tasks')
    .insert({
      user_id: userId,
      title: input.title,
      category: input.category ?? 'Admin/Other',
      status: 'todo',
      month: input.month ?? getCurrentMonth(),
      due_date: input.dueDate ?? null,
      notes: input.notes ?? null,
      pinned: false
    })
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    title: data.title,
    category: data.category as Category,
    status: data.status as Status,
    month: data.month,
    dueDate: data.due_date ?? undefined,
    notes: data.notes ?? undefined,
    pinned: data.pinned ?? false
  }
}

export async function updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }
  
  if (input.title !== undefined) updateData.title = input.title
  if (input.category !== undefined) updateData.category = input.category
  if (input.status !== undefined) updateData.status = input.status
  if (input.month !== undefined) updateData.month = input.month
  if (input.dueDate !== undefined) updateData.due_date = input.dueDate || null
  if (input.notes !== undefined) updateData.notes = input.notes || null
  if (input.pinned !== undefined) updateData.pinned = input.pinned

  const { data, error } = await supabase
    .from('user_tasks')
    .update(updateData)
    .eq('id', taskId)
    .select()
    .single()

  if (error) throw error

  return {
    id: data.id,
    title: data.title,
    category: data.category as Category,
    status: data.status as Status,
    month: data.month,
    dueDate: data.due_date ?? undefined,
    notes: data.notes ?? undefined,
    pinned: data.pinned ?? false
  }
}

export async function toggleTaskComplete(taskId: string, currentStatus: Status): Promise<Task> {
  const newStatus: Status = currentStatus === 'done' ? 'todo' : 'done'
  return updateTask(taskId, { status: newStatus })
}

export async function deleteTask(taskId: string): Promise<void> {
  const { error } = await supabase
    .from('user_tasks')
    .delete()
    .eq('id', taskId)

  if (error) throw error
}

function getCurrentMonth(): string {
  const month = new Date().getMonth()
  if (month >= 7 && month <= 8) return 'Aug–Sep'
  if (month === 9) return 'Oct'
  if (month >= 10 && month <= 11) return 'Nov–Dec'
  if (month >= 0 && month <= 2) return 'Jan–Mar'
  if (month >= 3 && month <= 4) return 'Apr–May'
  return 'Summer'
}

export const CATEGORIES: Category[] = [
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

export const MONTHS = ['Aug–Sep', 'Oct', 'Nov–Dec', 'Jan–Mar', 'Apr–May', 'Summer']
