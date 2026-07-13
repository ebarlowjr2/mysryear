import { NextResponse } from 'next/server'
import {
  CAREERS,
  buildScholarshipApplicationTaskSeeds,
  computeAcademicHealth,
  computePortfolioSummary,
  computeScholarshipApplicationProgress,
  computeScholarshipMatch,
  computeScholarshipReadiness,
  createNextServerSupabaseClient,
  scoreCareerHealth,
  type ScholarshipApplicationTaskStatus,
  type ScholarshipForMatching,
  type ScholarshipRequirement,
  type ScholarshipStatus,
  type StudentScholarshipProfile,
} from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'
import { templatesForGrade, type GradeLevel } from '@/lib/student-success'

const STATUSES = new Set<ScholarshipStatus>(['suggested', 'saved', 'applying', 'submitted', 'awarded', 'rejected'])

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function gradeLevelFrom(value: unknown): GradeLevel {
  return value === 10 || value === '10' ? '10' : value === 11 || value === '11' ? '11' : '9'
}

function docContexts(rows: Array<{ upload_context: string | null; file_name: string | null }>) {
  return rows.flatMap((row) => [row.upload_context || '', row.file_name || '']).map((item) => item.toLowerCase()).filter(Boolean)
}

function hasAny(contexts: string[], needles: string[]) {
  return contexts.some((context) => needles.some((needle) => context.includes(needle)))
}

function normalizeScholarship(row: Record<string, unknown>): ScholarshipForMatching {
  return {
    id: String(row.id),
    title: String(row.title || 'Untitled Scholarship'),
    organization: typeof row.organization === 'string' ? row.organization : null,
    description: typeof row.description === 'string' ? row.description : null,
    amount: typeof row.amount === 'number' ? row.amount : row.amount ? Number(row.amount) : null,
    deadline: typeof row.deadline === 'string' ? row.deadline : null,
    application_url: typeof row.application_url === 'string' ? row.application_url : null,
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
  }
}

async function buildStudentScholarshipProfile(studentProfileId: string): Promise<{
  student: StudentScholarshipProfile
  portfolio: ReturnType<typeof computePortfolioSummary>
  academicHealth: ReturnType<typeof computeAcademicHealth>
}> {
  const supabase = await createNextServerSupabaseClient()

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
    academicHealth,
    portfolio,
    student: {
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
    },
  }
}


async function seedApplicationTasks(input: {
  studentProfileId: string
  scholarship: ScholarshipForMatching
  requirements: ScholarshipRequirement[]
  userId: string
}) {
  const supabase = await createNextServerSupabaseClient()
  const seeds = buildScholarshipApplicationTaskSeeds(input.scholarship, input.requirements)
  if (seeds.length === 0) return

  await supabase.from('scholarship_application_tasks').upsert(
    seeds.map((task) => ({
      student_profile_id: input.studentProfileId,
      scholarship_id: input.scholarship.id,
      created_by_user_id: input.userId,
      title: task.title,
      description: task.description || null,
      category: task.category,
      due_date: task.dueDate || null,
      upload_required: Boolean(task.uploadRequired),
    })),
    { onConflict: 'student_profile_id,scholarship_id,title', ignoreDuplicates: true },
  )
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const { student, portfolio, academicHealth } = await buildStudentScholarshipProfile(studentProfileId)

  const [scholarshipsResult, requirementsResult, existingMatchesResult, applicationTasksResult] = await Promise.all([
    supabase.from('scholarships').select('*').eq('active', true).order('deadline', { ascending: true, nullsFirst: false }).limit(100),
    supabase.from('scholarship_requirements').select('*'),
    supabase.from('student_scholarship_matches').select('scholarship_id,status').eq('student_profile_id', studentProfileId),
    supabase.from('scholarship_application_tasks').select('*').eq('student_profile_id', studentProfileId).order('due_date', { ascending: true, nullsFirst: false }),
  ])

  if (scholarshipsResult.error) return error(scholarshipsResult.error.message)

  const requirementsByScholarship = new Map<string, ScholarshipRequirement[]>()
  for (const requirement of requirementsResult.data || []) {
    const scholarshipId = String(requirement.scholarship_id)
    const list = requirementsByScholarship.get(scholarshipId) || []
    list.push(requirement as ScholarshipRequirement)
    requirementsByScholarship.set(scholarshipId, list)
  }

  const tasksByScholarship = new Map<string, Array<{ id: string; scholarship_id: string; title: string; description: string | null; category: string; status: ScholarshipApplicationTaskStatus; due_date: string | null; upload_required: boolean; uploaded_file_id: string | null; completed_at: string | null }>>()
  for (const task of applicationTasksResult.data || []) {
    const scholarshipId = String(task.scholarship_id)
    const list = tasksByScholarship.get(scholarshipId) || []
    list.push({
      id: String(task.id),
      scholarship_id: scholarshipId,
      title: String(task.title),
      description: typeof task.description === 'string' ? task.description : null,
      category: String(task.category || 'general'),
      status: (task.status === 'in_progress' || task.status === 'done') ? task.status : 'not_started',
      due_date: typeof task.due_date === 'string' ? task.due_date : null,
      upload_required: Boolean(task.upload_required),
      uploaded_file_id: typeof task.uploaded_file_id === 'string' ? task.uploaded_file_id : null,
      completed_at: typeof task.completed_at === 'string' ? task.completed_at : null,
    })
    tasksByScholarship.set(scholarshipId, list)
  }

  const existingStatus = new Map<string, ScholarshipStatus>()
  for (const match of existingMatchesResult.data || []) {
    if (STATUSES.has(match.status as ScholarshipStatus)) existingStatus.set(String(match.scholarship_id), match.status as ScholarshipStatus)
  }

  const matches = (scholarshipsResult.data || []).map((raw) => {
    const scholarship = normalizeScholarship(raw as Record<string, unknown>)
    const computed = computeScholarshipMatch(student, scholarship, requirementsByScholarship.get(scholarship.id) || [])
    return {
      ...computed,
      status: existingStatus.get(scholarship.id) || 'suggested',
      scholarship,
      applicationTasks: tasksByScholarship.get(scholarship.id) || [],
      applicationProgress: computeScholarshipApplicationProgress(tasksByScholarship.get(scholarship.id) || []),
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
  const estimatedValue = matches.reduce((sum, match) => sum + Number(match.scholarship.amount || 0), 0)
  const upcomingDeadlines = matches
    .filter((match) => match.scholarship.deadline)
    .slice(0, 5)
    .map((match) => ({ id: match.scholarship.id, title: match.scholarship.title, deadline: match.scholarship.deadline }))

  return NextResponse.json({
    ok: true,
    studentProfileId,
    readiness,
    academicHealth,
    portfolio,
    matches,
    counts: {
      total: matches.length,
      suggested: matches.filter((match) => match.status === 'suggested').length,
      saved: matches.filter((match) => match.status === 'saved').length,
      applying: matches.filter((match) => match.status === 'applying').length,
      submitted: matches.filter((match) => match.status === 'submitted').length,
      awarded: matches.filter((match) => match.status === 'awarded').length,
    },
    estimatedValue,
    upcomingDeadlines,
  })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const body = (await req.json().catch(() => null)) as { scholarshipId?: unknown; status?: unknown } | null
  const scholarshipId = typeof body?.scholarshipId === 'string' ? body.scholarshipId : null
  const status = typeof body?.status === 'string' && STATUSES.has(body.status as ScholarshipStatus) ? body.status as ScholarshipStatus : null
  if (!scholarshipId || !status) return error('Missing scholarshipId or valid status')

  const { error: updateError } = await supabase
    .from('student_scholarship_matches')
    .upsert({ student_profile_id: studentProfileId, scholarship_id: scholarshipId, status }, { onConflict: 'student_profile_id,scholarship_id' })

  if (updateError) return error(updateError.message)

  if (status === 'saved' || status === 'applying' || status === 'submitted') {
    const [{ data: scholarship }, { data: requirements }] = await Promise.all([
      supabase.from('scholarships').select('*').eq('id', scholarshipId).maybeSingle(),
      supabase.from('scholarship_requirements').select('*').eq('scholarship_id', scholarshipId),
    ])
    if (scholarship) {
      await seedApplicationTasks({
        studentProfileId,
        scholarship: normalizeScholarship(scholarship as Record<string, unknown>),
        requirements: (requirements || []) as ScholarshipRequirement[],
        userId: session.user.id,
      })
    }
  }

  return NextResponse.json({ ok: true })
}
