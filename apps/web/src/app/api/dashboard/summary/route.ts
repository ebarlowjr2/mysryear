import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, computePortfolioSummary, computeScholarshipApplicationProgress, computeScholarshipReadiness } from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'
import { computeAcademicHealth, templatesForGrade, type GradeLevel } from '@/lib/student-success'

function ok(body: Record<string, unknown>) {
  return NextResponse.json({ ok: true, ...body })
}

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) return error('Not authenticated', 401)

  const { data: viewerProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const studentProfileId = await getActiveStudentProfileId()
  const viewerRole = (viewerProfile?.role as string | null) || null
  if (!studentProfileId) return ok({ studentProfileId: null, viewerRole })

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id,first_name,last_name,graduation_year,grade_level,schools(name)')
    .eq('id', studentProfileId)
    .maybeSingle()

  const gradeLevel: GradeLevel =
    studentProfile?.grade_level === 9 || studentProfile?.grade_level === 10 || studentProfile?.grade_level === 11
      ? (String(studentProfile.grade_level) as GradeLevel)
      : '9'

  const { data: records } = await supabase
    .from('academic_records')
    .select('id,document_type,school_year,grading_period,grade_level,gpa,created_at')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: false })
    .limit(25)

  const latestGpa = (records || []).find((r) => typeof r.gpa === 'number')?.gpa ?? null
  const hasRecentRecord = (records || []).length > 0
  const latestAcademicRecordAt = (records || [])[0]?.created_at ?? null

  // Ensure tasks exist (idempotent).
  const templates = templatesForGrade(gradeLevel)
  const { data: existingTasks } = await supabase
    .from('student_success_tasks')
    .select('id,title,status,category,upload_required')
    .eq('student_profile_id', studentProfileId)
    .limit(200)

  const existingByTitle = new Set((existingTasks || []).map((t) => t.title))
  const toInsert = templates
    .filter((t) => !existingByTitle.has(t.title))
    .map((t) => ({
      student_profile_id: studentProfileId,
      title: t.title,
      description: t.description,
      grade_level: t.grade_level,
      category: t.category,
      upload_required: Boolean(t.upload_required),
      status: 'not_started' as const,
    }))

  if (toInsert.length > 0) {
    // Best-effort; if RLS blocks or table isn't migrated yet, ignore.
    await supabase.from('student_success_tasks').insert(toInsert)
  }

  const { data: tasks } = await supabase
    .from('student_success_tasks')
    .select('id,title,description,category,status,upload_required')
    .eq('student_profile_id', studentProfileId)
    .order('created_at', { ascending: true })
    .limit(200)

  const done = (tasks || []).filter((t) => t.status === 'done').length
  const total = (tasks || []).length

  const health = computeAcademicHealth({
    gpa: latestGpa,
    hasRecentRecord,
    checklistDone: done,
    checklistTotal: total,
  })

  // LifePath summary
  const { data: interests } = await supabase
    .from('student_career_interests')
    .select('career_id')
    .eq('student_profile_id', studentProfileId)
    .limit(10)

  const selectedCareersCount = (interests || []).length

  const [activities, serviceHours, achievements, certifications] = await Promise.all([
    supabase.from('student_activities').select('id,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_service_hours').select('id,hours,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_achievements').select('id,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_certifications').select('id,status,uploaded_file_id').eq('student_profile_id', studentProfileId),
  ])

  const portfolio = computePortfolioSummary({
    activitiesCount: activities.data?.length || 0,
    serviceHoursTotal: (serviceHours.data || []).reduce((sum, row) => sum + Number(row.hours || 0), 0),
    achievementsCount: achievements.data?.length || 0,
    certificationsCompleted: (certifications.data || []).filter((row) => row.status === 'completed').length,
    proofDocumentsCount: [activities.data, serviceHours.data, achievements.data, certifications.data]
      .flatMap((rows) => rows || [])
      .filter((row) => Boolean(row.uploaded_file_id)).length,
  })

  const [{ data: scholarshipMatches }, { data: scholarshipApplicationTasks }] = await Promise.all([
    supabase
    .from('student_scholarship_matches')
    .select('status,match_score,missing_requirements,scholarships(amount,deadline,title)')
    .eq('student_profile_id', studentProfileId)
    .order('match_score', { ascending: false })
    .limit(50),
    supabase
      .from('scholarship_application_tasks')
      .select('id,title,status,due_date,upload_required')
      .eq('student_profile_id', studentProfileId)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(100),
  ])

  const scholarshipReadiness = computeScholarshipReadiness({
    student: {
      academicHealthScore: health.score,
      portfolioReadinessScore: portfolio.scholarshipReadinessScore,
      gpa: latestGpa,
      gradeLevel: Number(gradeLevel),
      graduationYear: typeof studentProfile?.graduation_year === 'number' ? studentProfile.graduation_year : null,
      state: null,
      volunteerHours: portfolio.serviceHoursTotal,
      activitiesCount: portfolio.activitiesCount,
      achievementsCount: portfolio.achievementsCount,
      certifications: [],
      careerInterests: (interests || []).map((row) => String(row.career_id)),
      careerCategories: [],
      uploadedDocumentContexts: [],
      hasResume: portfolio.proofDocumentsCount > 0,
      hasTranscript: hasRecentRecord,
      hasRecommendation: false,
      hasFafsa: false,
    },
  })

  const scholarshipRows = (scholarshipMatches || []) as Array<{
    status: string | null
    match_score: number | null
    missing_requirements: string[] | null
    scholarships?: { amount?: number | null; deadline?: string | null; title?: string | null } | { amount?: number | null; deadline?: string | null; title?: string | null }[] | null
  }>
  const scholarshipAvailableValue = scholarshipRows.reduce((sum, row) => {
    const scholarship = Array.isArray(row.scholarships) ? row.scholarships[0] : row.scholarships
    return sum + Number(scholarship?.amount || 0)
  }, 0)
  const scholarshipTopMissing = scholarshipRows.flatMap((row) => row.missing_requirements || [])[0] || scholarshipReadiness.topMissingRequirement
  const scholarshipApplicationProgress = computeScholarshipApplicationProgress((scholarshipApplicationTasks || []).map((task) => ({
    status: task.status,
    title: task.title,
    due_date: task.due_date,
    upload_required: task.upload_required,
  })))

  const { data: opportunities } = await supabase
    .from('business_opportunities')
    .select('id,title,opportunity_type,career_category,city,state,remote_available,deadline,business_profiles(organization_name)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(3)

  return ok({
    studentProfileId,
    viewerRole,
    activeStudentProfile: studentProfile || null,
    gradeLevel,
    academicRecords: records || [],
    latestAcademicRecordAt,
    tasks: tasks || [],
    checklist: { done, total },
    academicHealth: health,
    lifepath: {
      selectedCareersCount,
    },
    portfolio,
    opportunities: opportunities || [],
    scholarships: {
      readiness: scholarshipReadiness,
      currentMatches: scholarshipRows.length,
      availableValue: scholarshipAvailableValue,
      applicationsInProgress: scholarshipRows.filter((row) => row.status === 'applying' || row.status === 'submitted').length,
      applicationTasks: scholarshipApplicationProgress,
      topMissingRequirement: scholarshipApplicationProgress.nextTask || scholarshipTopMissing,
    },
  })
}
