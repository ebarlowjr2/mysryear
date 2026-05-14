import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
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

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return ok({ studentProfileId: null })

  const { data: studentProfile } = await supabase
    .from('student_profiles')
    .select('id,graduation_year,grade_level')
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

  return ok({
    studentProfileId,
    gradeLevel,
    academicRecords: records || [],
    tasks: tasks || [],
    academicHealth: health,
    lifepath: {
      selectedCareersCount,
    },
  })
}
