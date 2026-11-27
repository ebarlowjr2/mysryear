import { NextResponse } from 'next/server'
import {
  DEFAULT_CATALOG_FILTERS,
  SCHOLARSHIP_FIELD_TAGS,
  TRACKED_STATUSES,
  buildScholarshipApplicationTaskSeeds,
  buildScholarshipDiscovery,
  createNextServerSupabaseClient,
  loadScholarshipDiscoveryInput,
  type ScholarshipCatalogFilters,
  type ScholarshipFieldTag,
  type ScholarshipForMatching,
  type ScholarshipRequirement,
  type ScholarshipStatus,
} from '@mysryear/shared'
import { getActiveStudentProfileId } from '@/lib/student-profile'

export const dynamic = 'force-dynamic'

const STATUSES = new Set<ScholarshipStatus>(['suggested', 'saved', 'applying', 'submitted', 'awarded', 'rejected'])

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function parseFilters(url: URL): ScholarshipCatalogFilters {
  const field = url.searchParams.get('field') || ''
  const within = Number(url.searchParams.get('within'))
  const level = url.searchParams.get('level')
  return {
    query: url.searchParams.get('q') || '',
    state: (url.searchParams.get('state') || '').slice(0, 12),
    field: (SCHOLARSHIP_FIELD_TAGS as string[]).includes(field) ? (field as ScholarshipFieldTag) : '',
    deadlineWithinDays: Number.isFinite(within) && within > 0 ? within : null,
    level: level === 'high-school' || level === 'college' ? level : 'any',
    includeUpcoming: url.searchParams.get('upcoming') !== '0',
  }
}

function toMatching(row: Record<string, unknown>): ScholarshipForMatching {
  const n = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null)
  const arr = (v: unknown) => (Array.isArray(v) ? (v as string[]) : [])
  return {
    id: String(row.id),
    title: String(row.title || 'Untitled Scholarship'),
    organization: typeof row.organization === 'string' ? row.organization : null,
    description: typeof row.description === 'string' ? row.description : null,
    amount: n(row.amount),
    deadline: typeof row.deadline === 'string' ? row.deadline : null,
    application_url: typeof row.application_url === 'string' ? row.application_url : null,
    state: typeof row.state === 'string' ? row.state : null,
    country: typeof row.country === 'string' ? row.country : null,
    minimum_gpa: n(row.minimum_gpa),
    minimum_grade_level: n(row.minimum_grade_level),
    maximum_grade_level: n(row.maximum_grade_level),
    financial_need_required: Boolean(row.financial_need_required),
    essay_required: Boolean(row.essay_required),
    recommendation_required: Boolean(row.recommendation_required),
    volunteer_required: Boolean(row.volunteer_required),
    certification_tags: arr(row.certification_tags),
    career_tags: arr(row.career_tags),
    major_tags: arr(row.major_tags),
    skill_tags: arr(row.skill_tags),
  }
}

/**
 * Scholarship Discovery for the authorized active student.
 *
 * Returns `input` (the exact data the shared contract consumes — the browser
 * re-runs `buildScholarshipDiscovery` on it for instant search/paging, exactly
 * as the Expo app does) plus `discovery` for the requested filters/page.
 * All private reads run under the user's session (RLS) and the active student
 * resolved server-side. The catalog itself does not depend on the student.
 */
export async function GET(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  const url = new URL(req.url)
  // SCHOLARSHIP_FIXED_NOW pins the clock for parity/e2e runs only (never set in production).
  const now = process.env.SCHOLARSHIP_FIXED_NOW ? new Date(process.env.SCHOLARSHIP_FIXED_NOW) : new Date()
  const page = Math.max(1, Number(url.searchParams.get('page') || 1) || 1)

  const input = await loadScholarshipDiscoveryInput(supabase, studentProfileId, now)
  const discovery = buildScholarshipDiscovery(input, { now, filters: parseFilters(url), page })

  // Persist personalized suggestions (scores + reasons) for the dashboard,
  // without ever overwriting a tracked status (also guarded by a DB trigger).
  if (studentProfileId && discovery.forYou.items.length > 0) {
    const tracked = new Map(input.tracked.map((t) => [t.scholarship_id, t.status]))
    await supabase
      .from('student_scholarship_matches')
      .upsert(
        discovery.forYou.items.map((item) => ({
          student_profile_id: studentProfileId,
          scholarship_id: item.scholarshipId,
          match_score: Math.min(100, 40 + item.score * 5),
          match_reason: item.reasons,
          missing_requirements: item.toCheck,
          readiness_percentage: discovery.readiness.percentage,
          status: tracked.get(item.scholarshipId) ?? 'suggested',
        })),
        { onConflict: 'student_profile_id,scholarship_id' },
      )
      .then(
        () => undefined,
        () => undefined,
      )
  }

  return NextResponse.json({
    ok: true,
    studentProfileId,
    hasActiveStudent: Boolean(studentProfileId),
    now: now.toISOString(),
    clockFixed: Boolean(process.env.SCHOLARSHIP_FIXED_NOW),
    defaults: DEFAULT_CATALOG_FILTERS,
    input,
    discovery,
    // Back-compat summary fields for older consumers.
    readiness: discovery.readiness,
    counts: { ...discovery.tracker.counts, total: discovery.catalog.openCount },
    upcomingDeadlines: discovery.upcomingDeadlines,
  })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const studentProfileId = await getActiveStudentProfileId()
  if (!studentProfileId) return error('No active student profile', 404)

  const body = (await req.json().catch(() => null)) as { scholarshipId?: unknown; status?: unknown } | null
  const scholarshipId = typeof body?.scholarshipId === 'string' ? body.scholarshipId : null
  const status = typeof body?.status === 'string' && STATUSES.has(body.status as ScholarshipStatus) ? (body.status as ScholarshipStatus) : null
  if (!scholarshipId || !status) return error('Missing scholarshipId or valid status')

  const { error: updateError } = await supabase
    .from('student_scholarship_matches')
    .upsert({ student_profile_id: studentProfileId, scholarship_id: scholarshipId, status }, { onConflict: 'student_profile_id,scholarship_id' })
  if (updateError) return error(updateError.message, 403)

  if ((TRACKED_STATUSES as string[]).includes(status) && status !== 'awarded' && status !== 'rejected') {
    const [{ data: scholarship }, { data: requirements }] = await Promise.all([
      supabase.from('scholarships').select('*').eq('id', scholarshipId).maybeSingle(),
      supabase.from('scholarship_requirements').select('*').eq('scholarship_id', scholarshipId),
    ])
    if (scholarship) {
      const seeds = buildScholarshipApplicationTaskSeeds(toMatching(scholarship as Record<string, unknown>), (requirements || []) as ScholarshipRequirement[])
      if (seeds.length) {
        await supabase.from('scholarship_application_tasks').upsert(
          seeds.map((task) => ({
            student_profile_id: studentProfileId,
            scholarship_id: scholarshipId,
            created_by_user_id: session.user.id,
            title: task.title,
            description: task.description || null,
            category: task.category,
            due_date: task.dueDate || null,
            upload_required: Boolean(task.uploadRequired),
          })),
          { onConflict: 'student_profile_id,scholarship_id,title', ignoreDuplicates: true },
        )
      }
    }
  }

  return NextResponse.json({ ok: true })
}
