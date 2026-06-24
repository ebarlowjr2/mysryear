import { computePortfolioSummary, type PortfolioSummary } from '@mysryear/shared'
import { supabase } from '../lib/supabase'

export type PortfolioKind = 'activities' | 'serviceHours' | 'achievements' | 'certifications'

export type PortfolioItem = {
  id: string
  student_profile_id: string
  created_by_user_id: string | null
  title?: string | null
  name?: string | null
  category?: string | null
  description?: string | null
  organization?: string | null
  provider?: string | null
  role?: string | null
  status?: 'planned' | 'in_progress' | 'completed' | null
  hours?: number | null
  supervisor_contact?: string | null
  start_date?: string | null
  end_date?: string | null
  service_date?: string | null
  earned_date?: string | null
  expiration_date?: string | null
  credential_id?: string | null
  uploaded_file_id?: string | null
  created_at?: string | null
}

export type PortfolioData = {
  activities: PortfolioItem[]
  serviceHours: PortfolioItem[]
  achievements: PortfolioItem[]
  certifications: PortfolioItem[]
  summary: PortfolioSummary
}

const tableForKind: Record<PortfolioKind, string> = {
  activities: 'student_activities',
  serviceHours: 'student_service_hours',
  achievements: 'student_achievements',
  certifications: 'student_certifications',
}

export type PortfolioInput = {
  title: string
  category?: string | null
  description?: string | null
  organization?: string | null
  role?: string | null
  hours?: number | null
  supervisor_contact?: string | null
  status?: 'planned' | 'in_progress' | 'completed'
  start_date?: string | null
  end_date?: string | null
  service_date?: string | null
  earned_date?: string | null
  expiration_date?: string | null
  credential_id?: string | null
  uploaded_file_id?: string | null
}

function payloadFor(kind: PortfolioKind, studentProfileId: string, userId: string, input: PortfolioInput) {
  const base = {
    student_profile_id: studentProfileId,
    created_by_user_id: userId,
    category: input.category || null,
    description: input.description || null,
    uploaded_file_id: input.uploaded_file_id || null,
  }

  if (kind === 'certifications') {
    return {
      ...base,
      name: input.title,
      provider: input.organization || null,
      status: input.status || 'planned',
      earned_date: input.earned_date || null,
      expiration_date: input.expiration_date || null,
      credential_id: input.credential_id || null,
    }
  }

  if (kind === 'serviceHours') {
    return {
      ...base,
      title: input.title,
      organization: input.organization || null,
      service_date: input.service_date || null,
      hours: input.hours || 0,
      supervisor_contact: input.supervisor_contact || null,
    }
  }

  if (kind === 'achievements') {
    return {
      ...base,
      title: input.title,
      organization: input.organization || null,
      earned_date: input.earned_date || null,
    }
  }

  return {
    ...base,
    title: input.title,
    organization: input.organization || null,
    role: input.role || null,
    start_date: input.start_date || null,
    end_date: input.end_date || null,
  }
}

export async function listStudentPortfolio(studentProfileId: string): Promise<PortfolioData> {
  const [activities, serviceHours, achievements, certifications] = await Promise.all([
    supabase.from('student_activities').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from('student_service_hours').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from('student_achievements').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
    supabase.from('student_certifications').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }),
  ])

  const serviceRows = (serviceHours.data || []) as PortfolioItem[]
  const certRows = (certifications.data || []) as PortfolioItem[]

  return {
    activities: ((activities.data || []) as PortfolioItem[]),
    serviceHours: serviceRows,
    achievements: ((achievements.data || []) as PortfolioItem[]),
    certifications: certRows,
    summary: computePortfolioSummary({
      activitiesCount: activities.data?.length || 0,
      serviceHoursTotal: serviceRows.reduce((sum, row) => sum + Number(row.hours || 0), 0),
      achievementsCount: achievements.data?.length || 0,
      certificationsCompleted: certRows.filter((row) => row.status === 'completed').length,
    }),
  }
}

export async function createPortfolioItem(kind: PortfolioKind, studentProfileId: string, userId: string, input: PortfolioInput) {
  const { data, error } = await supabase
    .from(tableForKind[kind])
    .insert(payloadFor(kind, studentProfileId, userId, input) as never)
    .select('*')
    .single()
  return { item: (data as PortfolioItem) || null, error: error?.message || null }
}

export async function updatePortfolioItem(kind: PortfolioKind, id: string, studentProfileId: string, userId: string, input: PortfolioInput) {
  const { data, error } = await supabase
    .from(tableForKind[kind])
    .update(payloadFor(kind, studentProfileId, userId, input) as never)
    .eq('id', id)
    .eq('student_profile_id', studentProfileId)
    .select('*')
    .single()
  return { item: (data as PortfolioItem) || null, error: error?.message || null }
}

export async function deletePortfolioItem(kind: PortfolioKind, id: string, studentProfileId: string) {
  const { error } = await supabase
    .from(tableForKind[kind])
    .delete()
    .eq('id', id)
    .eq('student_profile_id', studentProfileId)
  return { success: !error, error: error?.message || null }
}

export const listStudentActivities = (studentProfileId: string) =>
  supabase.from('student_activities').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false })
export const createStudentActivity = (studentProfileId: string, userId: string, input: PortfolioInput) => createPortfolioItem('activities', studentProfileId, userId, input)
export const updateStudentActivity = (id: string, studentProfileId: string, userId: string, input: PortfolioInput) => updatePortfolioItem('activities', id, studentProfileId, userId, input)
export const deleteStudentActivity = (id: string, studentProfileId: string) => deletePortfolioItem('activities', id, studentProfileId)
export const listStudentServiceHours = (studentProfileId: string) =>
  supabase.from('student_service_hours').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false })
export const createStudentServiceHour = (studentProfileId: string, userId: string, input: PortfolioInput) => createPortfolioItem('serviceHours', studentProfileId, userId, input)
export const updateStudentServiceHour = (id: string, studentProfileId: string, userId: string, input: PortfolioInput) => updatePortfolioItem('serviceHours', id, studentProfileId, userId, input)
export const deleteStudentServiceHour = (id: string, studentProfileId: string) => deletePortfolioItem('serviceHours', id, studentProfileId)

export const listStudentAchievements = (studentProfileId: string) =>
  supabase.from('student_achievements').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false })
export const createStudentAchievement = (studentProfileId: string, userId: string, input: PortfolioInput) => createPortfolioItem('achievements', studentProfileId, userId, input)
export const updateStudentAchievement = (id: string, studentProfileId: string, userId: string, input: PortfolioInput) => updatePortfolioItem('achievements', id, studentProfileId, userId, input)
export const deleteStudentAchievement = (id: string, studentProfileId: string) => deletePortfolioItem('achievements', id, studentProfileId)

export const listStudentCertifications = (studentProfileId: string) =>
  supabase.from('student_certifications').select('*').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false })
export const createStudentCertification = (studentProfileId: string, userId: string, input: PortfolioInput) => createPortfolioItem('certifications', studentProfileId, userId, input)
export const updateStudentCertification = (id: string, studentProfileId: string, userId: string, input: PortfolioInput) => updatePortfolioItem('certifications', id, studentProfileId, userId, input)
export const deleteStudentCertification = (id: string, studentProfileId: string) => deletePortfolioItem('certifications', id, studentProfileId)
