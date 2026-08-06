import {
  CAREERS,
  calculateParentSimulation,
  normalizeParentSimulationAssumptions,
  scoreCareerHealth,
  starterTasksForCareer,
  type CareerHealthResult,
  type CareerPath,
} from '@mysryear/shared'
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
  uploaded_files?: {
    id: string
    file_name: string
    file_path?: string | null
    upload_context?: string | null
  } | null
  created_at?: string | null
}

export type SelectedCareer = CareerPath & {
  rank: number | null
  health: CareerHealthResult
}

const careerMap = new Map(CAREERS.map((career) => [career.id, career]))

export type LifePathMode = 'student' | 'linked-student' | 'parent-simulation'

export type ParentSimulation = {
  id: string
  created_by_user_id: string
  simulation_type: 'parent'
  title: string | null
  status: 'draft' | 'completed' | 'active' | 'archived'
  created_at?: string | null
  updated_at?: string | null
}

function selectedCareersFromIds(careerIds: string[]): SelectedCareer[] {
  const selected: SelectedCareer[] = []
  careerIds.forEach((careerId, index) => {
    const career = getCareerById(careerId)
    if (!career) return
    selected.push({ ...career, rank: index + 1, health: scoreCareerHealth(career, 'baseline') })
  })
  return selected
}

async function getOrCreateParentSimulation(
  userId: string,
): Promise<{ simulation: ParentSimulation | null; error: string | null }> {
  const existing = await supabase
    .from('lifepath_simulations')
    .select('*')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.data) return { simulation: existing.data as ParentSimulation, error: null }
  if (existing.error) return { simulation: null, error: existing.error.message }

  const created = await supabase
    .from('lifepath_simulations')
    .insert({
      created_by_user_id: userId,
      simulation_type: 'parent',
      title: 'Parent Simulation',
      status: 'active',
    } as never)
    .select('*')
    .single()

  if (created.error || !created.data) {
    return {
      simulation: null,
      error: created.error?.message || 'Could not create parent simulation',
    }
  }
  return { simulation: created.data as ParentSimulation, error: null }
}

export async function listParentSimulationCareerIds(userId: string): Promise<string[]> {
  const { simulation, error } = await getOrCreateParentSimulation(userId)
  if (!simulation?.id) {
    if (error) console.warn('Failed to load parent simulation:', error)
    return []
  }

  const { data, error: interestsError } = await supabase
    .from('lifepath_simulation_interests')
    .select('career_id,rank')
    .eq('simulation_id', simulation.id)
    .order('rank', { ascending: true, nullsFirst: false })

  if (interestsError) {
    console.warn('Failed to load parent simulation careers:', interestsError.message)
    return []
  }
  return (data || []).map((row) => row.career_id as string).filter(Boolean)
}

export async function listSelectedParentSimulationCareers(
  userId: string,
): Promise<SelectedCareer[]> {
  return selectedCareersFromIds(await listParentSimulationCareerIds(userId))
}

export async function saveParentSimulationCareerIds(userId: string, careerIds: string[]) {
  const selected = Array.from(new Set(careerIds)).slice(0, 5)
  const { simulation, error: simulationError } = await getOrCreateParentSimulation(userId)
  if (!simulation?.id)
    return { success: false, error: simulationError || 'Could not open parent simulation' }

  const { error: deleteError } = await supabase
    .from('lifepath_simulation_interests')
    .delete()
    .eq('simulation_id', simulation.id)
  if (deleteError) return { success: false, error: deleteError.message }
  if (!selected.length) return { success: true, error: null }

  const { error } = await supabase.from('lifepath_simulation_interests').insert(
    selected.map((careerId, index) => ({
      simulation_id: simulation.id,
      career_id: careerId,
      rank: index + 1,
    })) as never,
  )
  return { success: !error, error: error?.message || null }
}

export async function clearParentSimulation(userId: string) {
  const { simulation, error: simulationError } = await getOrCreateParentSimulation(userId)
  if (!simulation?.id)
    return { success: false, error: simulationError || 'Could not open parent simulation' }
  const { error } = await supabase
    .from('lifepath_simulations')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('id', simulation.id)
  return { success: !error, error: error?.message || null }
}

export function getCareerById(careerId: string) {
  return careerMap.get(careerId) || null
}

export function getCareerCatalog() {
  return CAREERS
}

export function formatCurrencyRange(min: number, max: number) {
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  })
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

export async function listSelectedLifePathCareers(
  studentProfileId: string,
): Promise<SelectedCareer[]> {
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
      return {
        ...career,
        rank: (row.rank as number | null) || null,
        health: scoreCareerHealth(career, 'baseline'),
      }
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

  const existingKeys = new Set(
    (existing || []).map((task) => `${task.career_id || ''}:${task.title}`),
  )
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

export async function saveLifePathCareerIds(
  studentProfileId: string,
  userId: string,
  careerIds: string[],
) {
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

export async function listLifePathTasks(
  studentProfileId: string,
  careerId?: string,
): Promise<LifePathTask[]> {
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
  const { error } = await supabase
    .from('lifepath_tasks')
    .update({ status } as never)
    .eq('id', taskId)
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

export type LifePathFeedback = {
  id: string
  student_profile_id: string
  career_id: string | null
  author_user_id: string
  author_role: 'student' | 'parent' | 'guardian'
  note: string
  created_at: string | null
  updated_at: string | null
}

export async function listLifePathFeedback(
  studentProfileId: string,
  careerId?: string | null,
): Promise<{ notes: LifePathFeedback[]; error: string | null }> {
  let query = supabase
    .from('lifepath_feedback')
    .select('*')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })

  query = careerId ? query.eq('career_id', careerId) : query.is('career_id', null)

  const { data, error } = await query
  if (error) return { notes: [], error: error.message }
  return { notes: (data || []) as LifePathFeedback[], error: null }
}

export async function createLifePathFeedback(input: {
  studentProfileId: string
  careerId?: string | null
  authorUserId: string
  authorRole: 'parent' | 'guardian'
  note: string
}): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('lifepath_feedback').insert({
    student_profile_id: input.studentProfileId,
    career_id: input.careerId || null,
    author_user_id: input.authorUserId,
    author_role: input.authorRole,
    note: input.note.trim(),
  } as never)
  return { success: !error, error: error?.message || null }
}

export async function updateLifePathFeedback(
  noteId: string,
  note: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('lifepath_feedback')
    .update({ note: note.trim(), updated_at: new Date().toISOString() } as never)
    .eq('id', noteId)
  return { success: !error, error: error?.message || null }
}

export async function deleteLifePathFeedback(
  noteId: string,
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.from('lifepath_feedback').delete().eq('id', noteId)
  return { success: !error, error: error?.message || null }
}

export type ParentSimulationAssumptions = import('@mysryear/shared').ParentSimulationAssumptions
export type ParentSimulationSummary = import('@mysryear/shared').ParentSimulationSummary

export type ParentSimulationScenario = ParentSimulation & {
  status: 'draft' | 'completed' | 'active' | 'archived'
  assumptions?: Partial<ParentSimulationAssumptions> | null
  results?: ParentSimulationSummary | null
  completed_at?: string | null
}

export async function listParentSimulationScenarios(
  userId: string,
): Promise<ParentSimulationScenario[]> {
  const { data, error } = await supabase
    .from('lifepath_simulations')
    .select('*')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false, nullsFirst: false })
  if (error) {
    console.warn('Failed to load parent simulations:', error.message)
    return []
  }
  return (data || []) as ParentSimulationScenario[]
}

export async function saveParentSimulationScenario(input: {
  userId: string
  simulationId?: string | null
  title: string
  careerIds: string[]
  assumptions: ParentSimulationAssumptions
  status: 'draft' | 'completed'
}): Promise<{
  success: boolean
  error: string | null
  simulationId?: string
  summary?: ParentSimulationSummary
}> {
  const selected = Array.from(new Set(input.careerIds)).slice(0, 5)
  let simulationId = input.simulationId || null
  const summary = calculateParentSimulation(selected, input.assumptions)

  if (!simulationId) {
    const created = await supabase
      .from('lifepath_simulations')
      .insert({
        created_by_user_id: input.userId,
        simulation_type: 'parent',
        title: input.title.trim() || 'Parent Simulation',
        status: input.status,
        assumptions: input.assumptions,
        results: summary,
        completed_at: input.status === 'completed' ? new Date().toISOString() : null,
      } as never)
      .select('id')
      .single()
    if (created.error || !created.data)
      return { success: false, error: created.error?.message || 'Could not create simulation' }
    simulationId = (created.data as { id: string }).id
  } else {
    const updated = await supabase
      .from('lifepath_simulations')
      .update({
        title: input.title.trim() || 'Parent Simulation',
        status: input.status,
        assumptions: input.assumptions,
        results: summary,
        completed_at: input.status === 'completed' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('id', simulationId)
    if (updated.error) return { success: false, error: updated.error.message }
  }

  const deleted = await supabase
    .from('lifepath_simulation_interests')
    .delete()
    .eq('simulation_id', simulationId)
  if (deleted.error) return { success: false, error: deleted.error.message }
  if (selected.length) {
    const inserted = await supabase.from('lifepath_simulation_interests').insert(
      selected.map((careerId, index) => ({
        simulation_id: simulationId,
        career_id: careerId,
        rank: index + 1,
      })) as never,
    )
    if (inserted.error) return { success: false, error: inserted.error.message }
  }
  return { success: true, error: null, simulationId, summary }
}

export async function listParentSimulationCareerIdsBySimulation(
  simulationId: string,
): Promise<string[]> {
  const { data, error } = await supabase
    .from('lifepath_simulation_interests')
    .select('career_id,rank')
    .eq('simulation_id', simulationId)
    .order('rank', { ascending: true, nullsFirst: false })
  if (error) {
    console.warn('Failed to load parent simulation careers:', error.message)
    return []
  }
  return (data || []).map((row) => row.career_id as string).filter(Boolean)
}

export async function duplicateParentSimulationScenario(simulationId: string, userId: string) {
  const { data: source, error } = await supabase
    .from('lifepath_simulations')
    .select('*')
    .eq('id', simulationId)
    .eq('created_by_user_id', userId)
    .maybeSingle()
  if (error || !source) return { success: false, error: error?.message || 'Simulation not found' }
  const careerIds = await listParentSimulationCareerIdsBySimulation(simulationId)
  return saveParentSimulationScenario({
    userId,
    title: `${(source as ParentSimulationScenario).title || 'Parent Simulation'} Copy`,
    careerIds,
    assumptions: normalizeParentSimulationAssumptions(
      (source as ParentSimulationScenario).assumptions,
    ),
    status: 'draft',
  })
}

export async function archiveParentSimulationScenario(simulationId: string) {
  const { error } = await supabase
    .from('lifepath_simulations')
    .update({ status: 'archived', updated_at: new Date().toISOString() } as never)
    .eq('id', simulationId)
  return { success: !error, error: error?.message || null }
}

export async function shareParentSimulationWithStudent(input: {
  simulationId: string
  studentProfileId: string
  userId: string
  message?: string
}) {
  const { error } = await supabase.from('lifepath_simulation_shares').upsert(
    {
      simulation_id: input.simulationId,
      student_profile_id: input.studentProfileId,
      shared_by_user_id: input.userId,
      message: input.message?.trim() || null,
      status: 'active',
      revoked_at: null,
      updated_at: new Date().toISOString(),
    } as never,
    { onConflict: 'simulation_id,student_profile_id' },
  )
  return { success: !error, error: error?.message || null }
}

export type StudentLifePathRecommendation = {
  id: string
  status: 'active' | 'acknowledged' | 'dismissed' | 'revoked'
  message: string | null
  shared_at: string | null
  acknowledged_at: string | null
  dismissed_at: string | null
  shared_by_user_id: string
  parent_name: string
  simulation: {
    id: string
    title: string | null
    status: string
    results: ParentSimulationSummary | null
    completed_at: string | null
  } | null
}

export async function listStudentLifePathRecommendations(
  studentProfileId: string,
): Promise<{ recommendations: StudentLifePathRecommendation[]; error: string | null }> {
  const { data, error } = await supabase
    .from('lifepath_simulation_shares')
    .select(
      'id,status,message,created_at,acknowledged_at,dismissed_at,shared_by_user_id,lifepath_simulations(id,title,status,results,completed_at)',
    )
    .eq('student_profile_id', studentProfileId)
    .in('status', ['active', 'acknowledged', 'dismissed'])
    .order('created_at', { ascending: false })

  if (error) return { recommendations: [], error: error.message }
  const rows = (data || []) as unknown as Array<{
    id: string
    status: StudentLifePathRecommendation['status']
    message: string | null
    created_at: string | null
    acknowledged_at: string | null
    dismissed_at: string | null
    shared_by_user_id: string
    lifepath_simulations: StudentLifePathRecommendation['simulation']
  }>
  const parentIds = Array.from(new Set(rows.map((row) => row.shared_by_user_id).filter(Boolean)))
  const parentProfiles = parentIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', parentIds)
    : { data: [], error: null }
  if (parentProfiles.error) return { recommendations: [], error: parentProfiles.error.message }
  const parentMap = new Map(
    (parentProfiles.data || []).map((parent) => [parent.id as string, parent]),
  )

  return {
    recommendations: rows.map((row) => {
      const parent = parentMap.get(row.shared_by_user_id)
      return {
        id: row.id,
        status: row.status,
        message: row.message,
        shared_at: row.created_at,
        acknowledged_at: row.acknowledged_at,
        dismissed_at: row.dismissed_at,
        shared_by_user_id: row.shared_by_user_id,
        parent_name:
          (parent?.full_name as string | null) ||
          (parent?.email as string | null) ||
          'Parent/guardian',
        simulation: row.lifepath_simulations,
      }
    }),
    error: null,
  }
}

export async function respondToLifePathRecommendation(
  shareId: string,
  response: 'acknowledged' | 'dismissed',
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase.rpc('respond_to_lifepath_simulation_share', {
    p_share_id: shareId,
    p_response: response,
  })
  return { success: !error, error: error?.message || null }
}
