import {
  CAREERS,
  buildScholarshipApplicationTaskSeeds,
  computeAcademicHealth,
  computePortfolioSummary,
  computeScholarshipApplicationProgress,
  computeScholarshipMatch,
  computeScholarshipReadiness,
  scoreCareerHealth,
  type ScholarshipApplicationProgress,
  type ScholarshipApplicationTaskStatus,
  type ScholarshipForMatching,
  type ScholarshipReadinessResult,
  type ScholarshipRequirement,
  type ScholarshipStatus,
  type StudentScholarshipProfile,
} from '@mysryear/shared'
import { supabase } from '../lib/supabase'
import { templatesForGrade } from '@mysryear/shared'

export type MobileScholarship = ScholarshipForMatching & {
  application_url?: string | null
  opportunity_source?: string | null
}

export type MobileScholarshipTask = {
  id: string
  scholarship_id: string
  title: string
  description: string | null
  category: string
  status: ScholarshipApplicationTaskStatus
  due_date: string | null
  upload_required: boolean
  uploaded_file_id: string | null
  completed_at: string | null
}

export type MobileScholarshipMatch = {
  scholarshipId: string
  matchScore: number
  readinessPercentage: number
  matchReason: string[]
  missingRequirements: string[]
  status: ScholarshipStatus
  scholarship: MobileScholarship
  applicationTasks: MobileScholarshipTask[]
  applicationProgress: ScholarshipApplicationProgress
}

export type MobileScholarshipWorkspace = {
  readiness: ScholarshipReadinessResult
  matches: MobileScholarshipMatch[]
  estimatedValue: number
  counts: Record<ScholarshipStatus | 'total', number>
}

const STATUSES = new Set<ScholarshipStatus>(['suggested', 'saved', 'applying', 'submitted', 'awarded', 'rejected'])

function gradeLevelFrom(value: unknown): '9' | '10' | '11' {
  return value === 10 || value === '10' ? '10' : value === 11 || value === '11' ? '11' : '9'
}

function docContexts(rows: Array<{ upload_context: string | null; file_name: string | null }>) {
  return rows.flatMap((row) => [row.upload_context || '', row.file_name || '']).map((item) => item.toLowerCase()).filter(Boolean)
}

function hasAny(contexts: string[], needles: string[]) {
  return contexts.some((context) => needles.some((needle) => context.includes(needle)))
}

function normalizeScholarship(row: Record<string, unknown>): MobileScholarship {
  return {
    id: String(row.id),
    title: String(row.title || row.name || 'Untitled Scholarship'),
    organization: typeof row.organization === 'string' ? row.organization : typeof row.source === 'string' ? row.source : null,
    description: typeof row.description === 'string' ? row.description : null,
    amount: typeof row.amount === 'number' ? row.amount : row.amount ? Number(String(row.amount).replace(/[^0-9.]/g, '')) || null : null,
    deadline: typeof row.deadline === 'string' ? row.deadline : null,
    application_url: typeof row.application_url === 'string' ? row.application_url : typeof row.link === 'string' ? row.link : null,
    state: typeof row.state === 'string' ? row.state : null,
    country: typeof row.country === 'string' ? row.country : null,
    minimum_gpa: typeof row.minimum_gpa === 'number' ? row.minimum_gpa : row.minimum_gpa ? Number(row.minimum_gpa) : null,
    minimum_grade_level: typeof row.minimum_grade_level === 'number' ? row.minimum_grade_level : null,
    maximum_grade_level: typeof row.maximum_grade_level === 'number' ? row.maximum_grade_level : null,
    financial_need_required: Boolean(row.financial_need_required),
    essay_required: Boolean(row.essay_required),
    recommendation_required: Boolean(row.recommendation_required),
    volunteer_required: Boolean(row.volunteer_required),
    certification_tags: Array.isArray(row.certification_tags) ? row.certification_tags as string[] : [],
    career_tags: Array.isArray(row.career_tags) ? row.career_tags as string[] : [],
    major_tags: Array.isArray(row.major_tags) ? row.major_tags as string[] : [],
    skill_tags: Array.isArray(row.skill_tags) ? row.skill_tags as string[] : [],
    opportunity_source: typeof row.opportunity_source === 'string' ? row.opportunity_source : null,
  }
}

async function buildStudentScholarshipProfile(studentProfileId: string): Promise<StudentScholarshipProfile> {
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id,graduation_year,grade_level,schools(state)')
    .eq('id', studentProfileId)
    .maybeSingle()

  const gradeLevel = gradeLevelFrom(studentProfile?.grade_level)

  const [records, tasks, interests, activities, serviceHours, achievements, certifications, uploads] = await Promise.all([
    supabase.from('academic_records').select('id,gpa,created_at').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }).limit(25),
    supabase.from('student_success_tasks').select('id,status').eq('student_profile_id', studentProfileId).limit(200),
    supabase.from('student_career_interests').select('career_id').eq('student_profile_id', studentProfileId).limit(10),
    supabase.from('student_activities').select('id,title,category,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_service_hours').select('id,hours,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_achievements').select('id,title,category,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_certifications').select('id,name,status,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('uploaded_files').select('id,file_name,upload_context').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }).limit(100),
  ])

  const latestGpa = (records.data || []).find((record) => typeof record.gpa === 'number')?.gpa ?? null
  const checklistDone = (tasks.data || []).filter((task) => task.status === 'done').length
  const checklistTotal = Math.max((tasks.data || []).length, templatesForGrade(gradeLevel).length)
  const academicHealth = computeAcademicHealth({
    gpa: latestGpa,
    hasRecentRecord: (records.data || []).length > 0,
    checklistDone,
    checklistTotal,
  })

  const completedCertifications = (certifications.data || []).filter((row) => row.status === 'completed')
  const proofDocumentsCount = [activities.data, serviceHours.data, achievements.data, certifications.data]
    .reduce((sum, rows) => sum + (rows || []).filter((row: { uploaded_file_id?: string | null }) => Boolean(row.uploaded_file_id)).length, 0)
  const portfolio = computePortfolioSummary({
    activitiesCount: activities.data?.length || 0,
    serviceHoursTotal: (serviceHours.data || []).reduce((sum, row) => sum + Number(row.hours || 0), 0),
    achievementsCount: achievements.data?.length || 0,
    certificationsCompleted: completedCertifications.length,
    proofDocumentsCount,
  })

  const careerIds = (interests.data || []).map((row) => String(row.career_id)).filter(Boolean)
  const selectedCareers = CAREERS.filter((career) => careerIds.includes(career.id))
  const careerCategories = selectedCareers.map((career) => career.category)
  const careerHealthAverage = selectedCareers.length
    ? Math.round(selectedCareers.reduce((sum, career) => sum + scoreCareerHealth(career, 'baseline').score, 0) / selectedCareers.length)
    : null

  const contexts = docContexts((uploads.data || []) as Array<{ upload_context: string | null; file_name: string | null }>)
  const schoolState = Array.isArray(studentProfile?.schools)
    ? studentProfile?.schools[0]?.state
    : (studentProfile?.schools as { state?: string | null } | null | undefined)?.state

  return {
    academicHealthScore: academicHealth.score,
    portfolioReadinessScore: portfolio.scholarshipReadinessScore,
    careerHealthAverage,
    gpa: latestGpa,
    gradeLevel: Number(gradeLevel),
    graduationYear: typeof studentProfile?.graduation_year === 'number' ? studentProfile.graduation_year : null,
    state: typeof schoolState === 'string' ? schoolState : null,
    volunteerHours: portfolio.serviceHoursTotal,
    activitiesCount: portfolio.activitiesCount,
    achievementsCount: portfolio.achievementsCount,
    certifications: completedCertifications.map((row) => String(row.name || '')).filter(Boolean),
    careerInterests: careerIds,
    careerCategories,
    uploadedDocumentContexts: contexts,
    hasResume: hasAny(contexts, ['resume', 'student_resume', 'portfolio']),
    hasTranscript: hasAny(contexts, ['transcript', 'report_card', 'progress_report']),
    hasRecommendation: hasAny(contexts, ['recommendation', 'letter']),
    hasFafsa: hasAny(contexts, ['fafsa']),
  }
}

function normalizeTask(row: Record<string, unknown>): MobileScholarshipTask {
  return {
    id: String(row.id),
    scholarship_id: String(row.scholarship_id),
    title: String(row.title),
    description: typeof row.description === 'string' ? row.description : null,
    category: String(row.category || 'general'),
    status: row.status === 'done' || row.status === 'in_progress' ? row.status : 'not_started',
    due_date: typeof row.due_date === 'string' ? row.due_date : null,
    upload_required: Boolean(row.upload_required),
    uploaded_file_id: typeof row.uploaded_file_id === 'string' ? row.uploaded_file_id : null,
    completed_at: typeof row.completed_at === 'string' ? row.completed_at : null,
  }
}

export async function listScholarshipMatches(studentProfileId: string): Promise<MobileScholarshipWorkspace> {
  const student = await buildStudentScholarshipProfile(studentProfileId)

  const [scholarshipsResult, requirementsResult, existingMatchesResult, applicationTasksResult] = await Promise.all([
    supabase.from('scholarships').select('*').eq('active', true).order('deadline', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('scholarship_requirements').select('*'),
    supabase.from('student_scholarship_matches').select('scholarship_id,status').eq('student_profile_id', studentProfileId),
    supabase.from('scholarship_application_tasks').select('*').eq('student_profile_id', studentProfileId).order('due_date', { ascending: true, nullsFirst: false }),
  ])

  if (scholarshipsResult.error) throw scholarshipsResult.error

  const requirementsByScholarship = new Map<string, ScholarshipRequirement[]>()
  for (const requirement of requirementsResult.data || []) {
    const scholarshipId = String(requirement.scholarship_id)
    const list = requirementsByScholarship.get(scholarshipId) || []
    list.push(requirement as ScholarshipRequirement)
    requirementsByScholarship.set(scholarshipId, list)
  }

  const existingStatus = new Map<string, ScholarshipStatus>()
  for (const match of existingMatchesResult.data || []) {
    if (STATUSES.has(match.status as ScholarshipStatus)) existingStatus.set(String(match.scholarship_id), match.status as ScholarshipStatus)
  }

  const tasksByScholarship = new Map<string, MobileScholarshipTask[]>()
  for (const raw of applicationTasksResult.data || []) {
    const task = normalizeTask(raw as Record<string, unknown>)
    const list = tasksByScholarship.get(task.scholarship_id) || []
    list.push(task)
    tasksByScholarship.set(task.scholarship_id, list)
  }

  const matches = (scholarshipsResult.data || []).map((raw) => {
    const scholarship = normalizeScholarship(raw as Record<string, unknown>)
    const computed = computeScholarshipMatch(student, scholarship, requirementsByScholarship.get(scholarship.id) || [])
    const applicationTasks = tasksByScholarship.get(scholarship.id) || []
    return {
      ...computed,
      status: existingStatus.get(scholarship.id) || 'suggested',
      scholarship,
      applicationTasks,
      applicationProgress: computeScholarshipApplicationProgress(applicationTasks),
    }
  }).sort((a, b) => b.matchScore - a.matchScore)

  if (matches.length > 0) {
    await supabase.from('student_scholarship_matches').upsert(
      matches.map((match) => ({
        student_profile_id: studentProfileId,
        scholarship_id: match.scholarshipId,
        match_score: match.matchScore,
        match_reason: match.matchReason,
        missing_requirements: match.missingRequirements,
        readiness_percentage: match.readinessPercentage,
        status: match.status,
      })),
      { onConflict: 'student_profile_id,scholarship_id' },
    )
  }

  const readiness = computeScholarshipReadiness({ student, matches })
  return {
    readiness,
    matches,
    estimatedValue: matches.reduce((sum, match) => sum + Number(match.scholarship.amount || 0), 0),
    counts: {
      total: matches.length,
      suggested: matches.filter((match) => match.status === 'suggested').length,
      saved: matches.filter((match) => match.status === 'saved').length,
      applying: matches.filter((match) => match.status === 'applying').length,
      submitted: matches.filter((match) => match.status === 'submitted').length,
      awarded: matches.filter((match) => match.status === 'awarded').length,
      rejected: matches.filter((match) => match.status === 'rejected').length,
    },
  }
}

export async function getScholarshipMatch(studentProfileId: string, scholarshipId: string): Promise<MobileScholarshipMatch | null> {
  const workspace = await listScholarshipMatches(studentProfileId)
  return workspace.matches.find((match) => match.scholarshipId === scholarshipId) || null
}

export async function updateScholarshipStatus(input: {
  studentProfileId: string
  scholarship: MobileScholarship
  status: ScholarshipStatus
  userId: string
}): Promise<void> {
  const { error } = await supabase
    .from('student_scholarship_matches')
    .upsert({ student_profile_id: input.studentProfileId, scholarship_id: input.scholarship.id, status: input.status }, { onConflict: 'student_profile_id,scholarship_id' })
  if (error) throw error

  if (input.status === 'saved' || input.status === 'applying' || input.status === 'submitted') {
    await ensureScholarshipApplicationTasks(input.studentProfileId, input.scholarship, input.userId)
  }
}

export async function ensureScholarshipApplicationTasks(studentProfileId: string, scholarship: MobileScholarship, userId: string): Promise<void> {
  const { data: requirements } = await supabase.from('scholarship_requirements').select('*').eq('scholarship_id', scholarship.id)
  const seeds = buildScholarshipApplicationTaskSeeds(scholarship, (requirements || []) as ScholarshipRequirement[])
  if (!seeds.length) return

  const { error } = await supabase.from('scholarship_application_tasks').upsert(
    seeds.map((task) => ({
      student_profile_id: studentProfileId,
      scholarship_id: scholarship.id,
      created_by_user_id: userId,
      title: task.title,
      description: task.description || null,
      category: task.category,
      due_date: task.dueDate || null,
      upload_required: Boolean(task.uploadRequired),
    })),
    { onConflict: 'student_profile_id,scholarship_id,title', ignoreDuplicates: true },
  )
  if (error) throw error
}

export async function updateScholarshipApplicationTask(input: {
  studentProfileId: string
  taskId: string
  status: ScholarshipApplicationTaskStatus
}): Promise<void> {
  const { error } = await supabase
    .from('scholarship_application_tasks')
    .update({
      status: input.status,
      completed_at: input.status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', input.taskId)
    .eq('student_profile_id', input.studentProfileId)
  if (error) throw error
}

export function searchScholarshipMatches(matches: MobileScholarshipMatch[], query: string): MobileScholarshipMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return matches
  return matches.filter((match) => {
    const scholarship = match.scholarship
    return [
      scholarship.title,
      scholarship.organization || '',
      ...(scholarship.career_tags || []),
      ...(scholarship.major_tags || []),
      ...(scholarship.skill_tags || []),
    ].join(' ').toLowerCase().includes(q)
  })
}

export function formatScholarshipAmount(value: number | null | undefined): string {
  if (!value) return 'Amount varies'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value)
}

export function formatDeadline(deadline: string | null | undefined): string {
  if (!deadline) return 'Rolling / TBD'
  try {
    const normalized = /\d{4}-\d{2}-\d{2}/.test(deadline) ? deadline : new Date(deadline).toISOString().slice(0, 10)
    const date = new Date(normalized + 'T00:00:00')
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {}
  return deadline
}
