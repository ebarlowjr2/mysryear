import { CAREERS, scoreCareerHealth, starterTasksForCareer, type CareerHealthResult, type CareerPath } from '@mysryear/shared'
import { supabase } from '../lib/supabase'

export type LifePathTask = {
  id: string
  student_profile_id: string
  title: string
  description: string | null
  status: 'todo' | 'doing' | 'done'
  due_date: string | null
  career_id?: string | null
  uploaded_file_id?: string | null
  uploaded_files?: { id: string; file_name: string; file_path?: string | null; upload_context?: string | null } | null
  created_at?: string | null
}

export type SelectedCareer = CareerPath & {
  rank: number | null
  health: CareerHealthResult
}

const careerMap = new Map(CAREERS.map((career) => [career.id, career]))

export function getCareerById(careerId: string) {
  return careerMap.get(careerId) || null
}

export function getCareerCatalog() {
  return CAREERS
}

export function formatCurrencyRange(min: number, max: number) {
  const fmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
  return `${fmt.format(min)} - ${fmt.format(max)}`
}

export async function listLifePathCareerIds(studentProfileId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('student_career_interests')
    .select('career_id,rank')
    .eq('student_profile_id', studentProfileId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) {
    console.warn('Failed to load LifePath interests:', error.message)
    return []
  }

  return (data || []).map((row) => row.career_id as string).filter(Boolean)
}

export async function listSelectedLifePathCareers(studentProfileId: string): Promise<SelectedCareer[]> {
  const { data, error } = await supabase
    .from('student_career_interests')
    .select('career_id,rank')
    .eq('student_profile_id', studentProfileId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (error) {
    console.warn('Failed to load LifePath careers:', error.message)
    return []
  }

  return (data || [])
    .map((row) => {
      const career = getCareerById(row.career_id as string)
      if (!career) return null
      return { ...career, rank: (row.rank as number | null) || null, health: scoreCareerHealth(career, 'baseline') }
    })
    .filter((career): career is SelectedCareer => Boolean(career))
}


async function seedLifePathTasks(studentProfileId: string, userId: string, careerIds: string[]) {
  const selectedCareers = CAREERS.filter((career) => careerIds.includes(career.id))
  if (!selectedCareers.length) return { success: true, error: null }

  const { data: existing, error: existingError } = await supabase
    .from('lifepath_tasks')
    .select('title,career_id')
    .eq('student_profile_id', studentProfileId)
    .in('career_id', careerIds)

  if (existingError) return { success: false, error: existingError.message }

  const existingKeys = new Set((existing || []).map((task) => `${task.career_id || ''}:${task.title}`))
  const rows = selectedCareers.flatMap((career) =>
    starterTasksForCareer(career)
      .filter((task) => !existingKeys.has(`${task.career_id}:${task.title}`))
      .map((task) => ({
        student_profile_id: studentProfileId,
        career_id: task.career_id,
        title: task.title,
        description: task.description,
        status: 'todo',
        created_by_user_id: userId,
      })),
  )

  if (!rows.length) return { success: true, error: null }
  const { error } = await supabase.from('lifepath_tasks').insert(rows as never)
  return { success: !error, error: error?.message || null }
}

export async function saveLifePathCareerIds(studentProfileId: string, userId: string, careerIds: string[]) {
  const selected = Array.from(new Set(careerIds)).slice(0, 5)

  const { error: deleteError } = await supabase
    .from('student_career_interests')
    .delete()
    .eq('student_profile_id', studentProfileId)

  if (deleteError) return { success: false, error: deleteError.message }
  if (!selected.length) return { success: true, error: null }

  const { error } = await supabase.from('student_career_interests').insert(
    selected.map((careerId, index) => ({
      student_profile_id: studentProfileId,
      career_id: careerId,
      rank: index + 1,
      created_by_user_id: userId,
    })) as never,
  )

  if (error) return { success: false, error: error.message }
  return seedLifePathTasks(studentProfileId, userId, selected)
}

export async function listLifePathTasks(studentProfileId: string, careerId?: string): Promise<LifePathTask[]> {
  let query = supabase
    .from('lifepath_tasks')
    .select('*, uploaded_files(id,file_name,file_path,upload_context)')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: true })

  if (careerId) {
    query = query.or(`career_id.eq.${careerId},career_id.is.null`)
  }

  const { data, error } = await query
  if (error) {
    console.warn('Failed to load LifePath tasks:', error.message)
    return []
  }
  return (data || []) as LifePathTask[]
}

export async function updateLifePathTaskStatus(taskId: string, status: LifePathTask['status']) {
  const { error } = await supabase.from('lifepath_tasks').update({ status } as never).eq('id', taskId)
  return { success: !error, error: error?.message || null }
}

export function averageCareerHealth(careers: SelectedCareer[]) {
  if (!careers.length) return 0
  return Math.round(careers.reduce((sum, career) => sum + career.health.score, 0) / careers.length)
}

export function nextLifePathAction(careers: SelectedCareer[]) {
  if (!careers.length) return 'Start LifePath by selecting your top career interests.'
  if (careers.length < 5) return 'Add more career options so you can compare pathways.'
  return 'Open a career path and complete the next milestone.'
}
