import { NextResponse } from 'next/server'
import { CAREERS, createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanCareerIds(value: unknown) {
  if (!Array.isArray(value)) return null
  const valid = new Set(CAREERS.map((career) => career.id))
  return Array.from(new Set(value.filter((item): item is string => typeof item === 'string' && valid.has(item)))).slice(0, 5)
}

async function getOrCreateSimulation(supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>, userId: string) {
  const existing = await supabase
    .from('lifepath_simulations')
    .select('id,title,status,created_at,updated_at')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) return { simulation: null, error: existing.error }
  if (existing.data?.id) return { simulation: existing.data, error: null }

  const created = await supabase
    .from('lifepath_simulations')
    .insert({ created_by_user_id: userId, simulation_type: 'parent', title: 'Parent Simulation', status: 'active' })
    .select('id,title,status,created_at,updated_at')
    .single()

  return { simulation: created.data, error: created.error }
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  if (profile?.role !== 'parent' && profile?.role !== 'guardian') return jsonError('Parent simulation is only available for parent/guardian accounts', 403)

  const { simulation, error } = await getOrCreateSimulation(supabase, session.user.id)
  if (error || !simulation?.id) return jsonError(error?.message || 'Could not load simulation')

  const interests = await supabase
    .from('lifepath_simulation_interests')
    .select('career_id,rank')
    .eq('simulation_id', simulation.id)
    .order('rank', { ascending: true, nullsFirst: false })

  if (interests.error) return jsonError(interests.error.message)
  const careerIds = (interests.data || []).map((row) => row.career_id as string).filter(Boolean)
  return NextResponse.json({ ok: true, simulation, careerIds })
}

export async function PUT(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
  if (profile?.role !== 'parent' && profile?.role !== 'guardian') return jsonError('Parent simulation is only available for parent/guardian accounts', 403)

  const payload = (await req.json().catch(() => null)) as { careerIds?: unknown } | null
  const careerIds = cleanCareerIds(payload?.careerIds)
  if (!careerIds) return jsonError('careerIds must be an array')

  const { simulation, error } = await getOrCreateSimulation(supabase, session.user.id)
  if (error || !simulation?.id) return jsonError(error?.message || 'Could not load simulation')

  const deleted = await supabase.from('lifepath_simulation_interests').delete().eq('simulation_id', simulation.id)
  if (deleted.error) return jsonError(deleted.error.message)

  if (careerIds.length) {
    const inserted = await supabase.from('lifepath_simulation_interests').insert(
      careerIds.map((careerId, index) => ({ simulation_id: simulation.id, career_id: careerId, rank: index + 1 })),
    )
    if (inserted.error) return jsonError(inserted.error.message)
  }

  await supabase.from('lifepath_simulations').update({ updated_at: new Date().toISOString() }).eq('id', simulation.id)
  return NextResponse.json({ ok: true, simulationId: simulation.id, careerIds })
}

export async function DELETE() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return jsonError('Not authenticated', 401)

  const { error } = await supabase
    .from('lifepath_simulations')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('created_by_user_id', session.user.id)
    .eq('simulation_type', 'parent')
    .eq('status', 'active')

  if (error) return jsonError(error.message)
  return NextResponse.json({ ok: true })
}
