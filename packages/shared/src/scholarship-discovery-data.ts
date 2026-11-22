/**
 * Data loading for Scholarship Discovery, shared by the web API route (server
 * Supabase client, cookie session) and the Expo app (mobile Supabase client).
 * Both platforms run exactly these queries under the signed-in user's RLS, so
 * private data is always scoped to the authorized active student.
 *
 * The catalog is read in full (paged in chunks of 1,000 — no 100-row cap) and
 * ranked/filtered in `buildScholarshipDiscovery`, so browsing never depends on
 * readiness, GPA, careers or saved matches.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { CAREERS } from './career-catalog'
import { scoreCareerHealth } from './lifepath'
import { computePortfolioSummary } from './portfolio'
import { computeAcademicHealth, templatesForGrade, type GradeLevel } from './student-success'
import type { StudentScholarshipProfile } from './scholarships'
import { scholarshipGradeLevel, type ScholarshipDiscoveryInput } from './scholarship-discovery'

const CATALOG_CHUNK = 1000
/** Hard stop so a runaway catalog can never hang a client. */
const CATALOG_MAX_ROWS = 20_000

export async function loadVisibleScholarshipCatalog(
  supabase: SupabaseClient,
): Promise<{ rows: Array<Record<string, unknown>>; error: string | null }> {
  const rows: Array<Record<string, unknown>> = []
  for (let from = 0; from < CATALOG_MAX_ROWS; from += CATALOG_CHUNK) {
    const { data, error } = await supabase
      .from('student_visible_scholarships')
      .select('*')
      .order('id', { ascending: true })
      .range(from, from + CATALOG_CHUNK - 1)
    if (error) return { rows, error: error.message || 'Catalog unavailable' }
    const chunk = (data || []) as Array<Record<string, unknown>>
    rows.push(...chunk)
    if (chunk.length < CATALOG_CHUNK) break
  }
  return { rows, error: null }
}

function docContexts(rows: Array<{ upload_context: string | null; file_name: string | null }>) {
  return rows
    .flatMap((row) => [row.upload_context || '', row.file_name || ''])
    .map((item) => item.toLowerCase())
    .filter(Boolean)
}

function hasAny(contexts: string[], needles: string[]) {
  return contexts.some((context) => needles.some((needle) => context.includes(needle)))
}

function checklistGrade(grade: number | null): GradeLevel {
  return grade === 10 ? '10' : grade != null && grade >= 11 ? '11' : '9'
}

export async function loadStudentScholarshipProfile(
  supabase: SupabaseClient,
  studentProfileId: string,
  now: Date,
): Promise<{ student: StudentScholarshipProfile; careerIds: string[] }> {
  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id,graduation_year,grade_level,schools(state)')
    .eq('id', studentProfileId)
    .maybeSingle()

  const gradeLevel = scholarshipGradeLevel(studentProfile?.grade_level, studentProfile?.graduation_year, now)

  const [records, tasks, interests, activities, serviceHours, achievements, certifications, uploads] = await Promise.all([
    supabase.from('academic_records').select('id,gpa,created_at').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }).limit(25),
    supabase.from('student_success_tasks').select('id,status').eq('student_profile_id', studentProfileId).limit(200),
    supabase
      .from('student_career_interests')
      .select('career_id,rank,created_at')
      .eq('student_profile_id', studentProfileId)
      .order('rank', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: true })
      .limit(10),
    supabase.from('student_activities').select('id,title,category,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_service_hours').select('id,hours,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_achievements').select('id,title,category,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('student_certifications').select('id,name,status,uploaded_file_id').eq('student_profile_id', studentProfileId),
    supabase.from('uploaded_files').select('id,file_name,upload_context').eq('student_profile_id', studentProfileId).order('created_at', { ascending: false }).limit(100),
  ])

  const latestGpaRaw = (records.data || []).find((record) => record.gpa != null && Number.isFinite(Number(record.gpa)))?.gpa
  const latestGpa = latestGpaRaw == null ? null : Number(latestGpaRaw)
  const checklistDone = (tasks.data || []).filter((task) => task.status === 'done').length
  const checklistTotal = Math.max((tasks.data || []).length, templatesForGrade(checklistGrade(gradeLevel)).length)
  const academicHealth = computeAcademicHealth({
    gpa: latestGpa,
    hasRecentRecord: (records.data || []).length > 0,
    checklistDone,
    checklistTotal,
  })

  const completedCertifications = (certifications.data || []).filter((row) => row.status === 'completed')
  const proofDocumentsCount = [activities.data, serviceHours.data, achievements.data, certifications.data].reduce(
    (sum, rows) => sum + (rows || []).filter((row: { uploaded_file_id?: string | null }) => Boolean(row.uploaded_file_id)).length,
    0,
  )
  const portfolio = computePortfolioSummary({
    activitiesCount: activities.data?.length || 0,
    serviceHoursTotal: (serviceHours.data || []).reduce((sum, row) => sum + Number(row.hours || 0), 0),
    achievementsCount: achievements.data?.length || 0,
    certificationsCompleted: completedCertifications.length,
    proofDocumentsCount,
  })

  const careerIds = Array.from(new Set((interests.data || []).map((row) => String(row.career_id)).filter(Boolean)))
  const selectedCareers = careerIds.map((id) => CAREERS.find((career) => career.id === id)).filter((c): c is (typeof CAREERS)[number] => Boolean(c))
  const careerHealthAverage = selectedCareers.length
    ? Math.round(selectedCareers.reduce((sum, career) => sum + scoreCareerHealth(career, 'baseline').score, 0) / selectedCareers.length)
    : null

  const contexts = docContexts((uploads.data || []) as Array<{ upload_context: string | null; file_name: string | null }>)
  const schools = studentProfile?.schools as { state?: string | null } | Array<{ state?: string | null }> | null | undefined
  const schoolState = Array.isArray(schools) ? schools[0]?.state : schools?.state

  return {
    careerIds,
    student: {
      academicHealthScore: academicHealth.score,
      portfolioReadinessScore: portfolio.scholarshipReadinessScore,
      careerHealthAverage,
      gpa: latestGpa,
      gradeLevel,
      graduationYear: typeof studentProfile?.graduation_year === 'number' ? studentProfile.graduation_year : null,
      state: typeof schoolState === 'string' ? schoolState : null,
      volunteerHours: portfolio.serviceHoursTotal,
      activitiesCount: portfolio.activitiesCount,
      achievementsCount: portfolio.achievementsCount,
      certifications: completedCertifications.map((row) => String(row.name || '')).filter(Boolean),
      careerInterests: careerIds,
      careerCategories: selectedCareers.map((career) => career.category),
      uploadedDocumentContexts: contexts,
      hasResume: hasAny(contexts, ['resume', 'student_resume', 'portfolio']),
      hasTranscript: hasAny(contexts, ['transcript', 'report_card', 'progress_report']),
      hasRecommendation: hasAny(contexts, ['recommendation', 'letter']),
      hasFafsa: hasAny(contexts, ['fafsa']),
    },
  }
}

/**
 * Everything `buildScholarshipDiscovery` needs. `studentProfileId` null means
 * no authorized active student: the public catalog still loads.
 */
export async function loadScholarshipDiscoveryInput(
  supabase: SupabaseClient,
  studentProfileId: string | null,
  now: Date,
): Promise<ScholarshipDiscoveryInput> {
  const catalogPromise = loadVisibleScholarshipCatalog(supabase)
  if (!studentProfileId) {
    const catalog = await catalogPromise
    return { catalogRows: catalog.rows, catalogError: catalog.error, tracked: [], trackedRows: [], tasks: [], student: null, plan: { careerIds: [] } }
  }

  const [catalog, profile, trackedResult, tasksResult] = await Promise.all([
    catalogPromise,
    loadStudentScholarshipProfile(supabase, studentProfileId, now),
    supabase.from('student_scholarship_matches').select('scholarship_id,status').eq('student_profile_id', studentProfileId).neq('status', 'suggested'),
    supabase.from('scholarship_application_tasks').select('*').eq('student_profile_id', studentProfileId).order('due_date', { ascending: true, nullsFirst: false }),
  ])

  const tracked = ((trackedResult.data || []) as Array<{ scholarship_id: string; status: string }>).map((row) => ({
    scholarship_id: String(row.scholarship_id),
    status: String(row.status),
  }))
  const visibleIds = new Set(catalog.rows.map((row) => String(row.id)))
  const missingIds = tracked.map((t) => t.scholarship_id).filter((id) => !visibleIds.has(id))
  let trackedRows: Array<Record<string, unknown>> = []
  if (missingIds.length > 0) {
    // Closed/expired awards the student tracks stay readable via
    // scholarships_select_tracked_by_member, so the tracker keeps them.
    const { data } = await supabase.from('scholarships').select('*').in('id', missingIds)
    trackedRows = (data || []) as Array<Record<string, unknown>>
  }

  return {
    catalogRows: catalog.rows,
    catalogError: catalog.error,
    tracked,
    trackedRows,
    tasks: (tasksResult.data || []) as Array<Record<string, unknown>>,
    student: profile.student,
    plan: { careerIds: profile.careerIds },
  }
}
