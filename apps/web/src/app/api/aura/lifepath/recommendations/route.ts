import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient, type ParentSimulationSummary } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

type ShareRow = {
  id: string
  status: 'active' | 'acknowledged' | 'dismissed' | 'revoked'
  message: string | null
  created_at: string | null
  acknowledged_at: string | null
  dismissed_at: string | null
  student_profile_id: string
  shared_by_user_id: string
  lifepath_simulations: {
    id: string
    title: string | null
    status: string
    results: ParentSimulationSummary | null
    assumptions: unknown
    created_at: string | null
    updated_at: string | null
    completed_at: string | null
  } | null
}

async function getStudentProfileId(
  supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>,
  userId: string,
) {
  const profile = await supabase
    .from('profiles')
    .select('role,active_student_profile_id')
    .eq('id', userId)
    .maybeSingle()
  if (profile.error) return { role: null, studentProfileId: null, error: profile.error.message }
  const role = profile.data?.role as string | null
  let studentProfileId = (profile.data?.active_student_profile_id as string | null) || null
  if (!studentProfileId) {
    const fallback = await supabase
      .from('student_profiles')
      .select('id')
      .eq('student_user_id', userId)
      .limit(1)
      .maybeSingle()
    if (fallback.error) return { role, studentProfileId: null, error: fallback.error.message }
    studentProfileId = (fallback.data?.id as string | null) || null
  }
  return { role, studentProfileId, error: null }
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const { role, studentProfileId, error } = await getStudentProfileId(supabase, session.user.id)
  if (error) return jsonError(error)
  if (role !== 'student')
    return jsonError('Recommendation inbox is only available for student accounts', 403)
  if (!studentProfileId)
    return NextResponse.json({ ok: true, recommendations: [], state: 'no-student-profile' })

  const { data, error: sharesError } = await supabase
    .from('lifepath_simulation_shares')
    .select(
      'id,status,message,created_at,acknowledged_at,dismissed_at,student_profile_id,shared_by_user_id,lifepath_simulations(id,title,status,results,assumptions,created_at,updated_at,completed_at)',
    )
    .eq('student_profile_id', studentProfileId)
    .in('status', ['active', 'acknowledged', 'dismissed'])
    .order('created_at', { ascending: false })

  if (sharesError) return jsonError(sharesError.message)
  const rows = (data || []) as unknown as ShareRow[]
  const parentIds = Array.from(new Set(rows.map((row) => row.shared_by_user_id).filter(Boolean)))
  const parentProfiles = parentIds.length
    ? await supabase.from('profiles').select('id,full_name,email').in('id', parentIds)
    : { data: [], error: null }
  if (parentProfiles.error) return jsonError(parentProfiles.error.message)
  const parentMap = new Map(
    (parentProfiles.data || []).map((parent) => [parent.id as string, parent]),
  )

  return NextResponse.json({
    ok: true,
    state: rows.length ? 'ready' : 'empty',
    recommendations: rows.map((row) => {
      const parent = parentMap.get(row.shared_by_user_id)
      return {
        id: row.id,
        status: row.status,
        message: row.message,
        sharedAt: row.created_at,
        acknowledgedAt: row.acknowledged_at,
        dismissedAt: row.dismissed_at,
        parentName:
          (parent?.full_name as string | null) ||
          (parent?.email as string | null) ||
          'Parent/guardian',
        simulation: row.lifepath_simulations,
      }
    }),
  })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const payload = (await req.json().catch(() => null)) as {
    shareId?: string
    response?: 'acknowledged' | 'dismissed'
  } | null
  if (!payload?.shareId || !payload.response) return jsonError('shareId and response are required')
  if (!['acknowledged', 'dismissed'].includes(payload.response))
    return jsonError('Invalid response')

  const { error } = await supabase.rpc('respond_to_lifepath_simulation_share', {
    p_share_id: payload.shareId,
    p_response: payload.response,
  })
  if (error) return jsonError(error.message, 403)
  return NextResponse.json({ ok: true })
}
