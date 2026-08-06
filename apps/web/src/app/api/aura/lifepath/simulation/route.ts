import { NextResponse } from 'next/server'
import {
  CAREERS,
  calculateParentSimulation,
  duplicateSimulationTitle,
  normalizeParentSimulationAssumptions,
  type ParentSimulationAssumptions,
} from '@mysryear/shared'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanCareerIds(value: unknown) {
  if (!Array.isArray(value)) return null
  const valid = new Set(CAREERS.map((career) => career.id))
  return Array.from(
    new Set(value.filter((item): item is string => typeof item === 'string' && valid.has(item))),
  ).slice(0, 5)
}

function cleanTitle(value: unknown) {
  return typeof value === 'string' && value.trim()
    ? value.trim().slice(0, 120)
    : 'Parent Simulation'
}

async function requireParentSimulationUser() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { supabase, userId: null, error: jsonError('Not authenticated', 401) }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()
  if (profile?.role !== 'parent' && profile?.role !== 'guardian') {
    return {
      supabase,
      userId: session.user.id,
      error: jsonError('Parent simulation is only available for parent/guardian accounts', 403),
    }
  }
  return { supabase, userId: session.user.id, error: null }
}

async function getSimulationCareerIds(
  supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>,
  simulationId: string,
) {
  const interests = await supabase
    .from('lifepath_simulation_interests')
    .select('career_id,rank')
    .eq('simulation_id', simulationId)
    .order('rank', { ascending: true, nullsFirst: false })

  if (interests.error) return { careerIds: [], error: interests.error }
  return {
    careerIds: (interests.data || []).map((row) => row.career_id as string).filter(Boolean),
    error: null,
  }
}

async function getOrCreateSimulation(
  supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>,
  userId: string,
  simulationId?: string | null,
) {
  if (simulationId) {
    const existing = await supabase
      .from('lifepath_simulations')
      .select('*')
      .eq('id', simulationId)
      .eq('created_by_user_id', userId)
      .neq('status', 'archived')
      .maybeSingle()
    return { simulation: existing.data, error: existing.error }
  }

  const existing = await supabase
    .from('lifepath_simulations')
    .select('*')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .in('status', ['draft', 'active'])
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle()

  if (existing.error) return { simulation: null, error: existing.error }
  if (existing.data?.id) return { simulation: existing.data, error: null }

  const created = await supabase
    .from('lifepath_simulations')
    .insert({
      created_by_user_id: userId,
      simulation_type: 'parent',
      title: 'Parent Simulation',
      status: 'draft',
      assumptions: normalizeParentSimulationAssumptions(null),
    })
    .select('*')
    .single()

  return { simulation: created.data, error: created.error }
}

async function saveCareerIds(
  supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>,
  simulationId: string,
  careerIds: string[],
) {
  const deleted = await supabase
    .from('lifepath_simulation_interests')
    .delete()
    .eq('simulation_id', simulationId)
  if (deleted.error) return deleted.error

  if (careerIds.length) {
    const inserted = await supabase
      .from('lifepath_simulation_interests')
      .insert(
        careerIds.map((careerId, index) => ({
          simulation_id: simulationId,
          career_id: careerId,
          rank: index + 1,
        })),
      )
    if (inserted.error) return inserted.error
  }
  return null
}

export async function GET(req: Request) {
  const { supabase, userId, error } = await requireParentSimulationUser()
  if (error || !userId) return error

  const url = new URL(req.url)
  const requestedId = url.searchParams.get('simulationId')
  const listOnly = url.searchParams.get('list') === '1'

  const list = await supabase
    .from('lifepath_simulations')
    .select('id,title,status,assumptions,results,completed_at,created_at,updated_at')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .neq('status', 'archived')
    .order('updated_at', { ascending: false, nullsFirst: false })

  if (list.error) return jsonError(list.error.message)
  if (listOnly) return NextResponse.json({ ok: true, simulations: list.data || [] })

  const { simulation, error: simulationError } = await getOrCreateSimulation(
    supabase,
    userId,
    requestedId,
  )
  if (simulationError || !simulation?.id)
    return jsonError(simulationError?.message || 'Could not load simulation')

  const { careerIds, error: interestsError } = await getSimulationCareerIds(supabase, simulation.id)
  if (interestsError) return jsonError(interestsError.message)
  return NextResponse.json({
    ok: true,
    simulation,
    simulations: list.data || [],
    careerIds,
    summary: calculateParentSimulation(
      careerIds,
      simulation.assumptions as Partial<ParentSimulationAssumptions> | null,
    ),
  })
}

export async function POST(req: Request) {
  const { supabase, userId, error } = await requireParentSimulationUser()
  if (error || !userId) return error
  const payload = (await req.json().catch(() => null)) as {
    action?: string
    title?: unknown
    simulationId?: string
    studentProfileId?: string
    message?: string
  } | null

  if (payload?.action === 'duplicate') {
    if (!payload.simulationId) return jsonError('simulationId is required')
    const source = await supabase
      .from('lifepath_simulations')
      .select('*')
      .eq('id', payload.simulationId)
      .eq('created_by_user_id', userId)
      .maybeSingle()
    if (source.error || !source.data)
      return jsonError(source.error?.message || 'Simulation not found', 404)
    const created = await supabase
      .from('lifepath_simulations')
      .insert({
        created_by_user_id: userId,
        simulation_type: 'parent',
        title: duplicateSimulationTitle(source.data.title as string | null),
        status: 'draft',
        assumptions: source.data.assumptions || normalizeParentSimulationAssumptions(null),
        results: source.data.results || null,
      })
      .select('*')
      .single()
    if (created.error || !created.data)
      return jsonError(created.error?.message || 'Could not duplicate simulation')
    const { careerIds } = await getSimulationCareerIds(supabase, payload.simulationId)
    const saveError = await saveCareerIds(supabase, created.data.id, careerIds)
    if (saveError) return jsonError(saveError.message)
    return NextResponse.json({ ok: true, simulation: created.data, careerIds })
  }

  if (payload?.action === 'share') {
    if (!payload.simulationId || !payload.studentProfileId)
      return jsonError('simulationId and studentProfileId are required')
    const { error: upsertError } = await supabase.from('lifepath_simulation_shares').upsert(
      {
        simulation_id: payload.simulationId,
        student_profile_id: payload.studentProfileId,
        shared_by_user_id: userId,
        message: typeof payload.message === 'string' ? payload.message.trim() : null,
        status: 'active',
        revoked_at: null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'simulation_id,student_profile_id' },
    )
    if (upsertError) return jsonError(upsertError.message)
    return NextResponse.json({ ok: true })
  }

  const created = await supabase
    .from('lifepath_simulations')
    .insert({
      created_by_user_id: userId,
      simulation_type: 'parent',
      title: cleanTitle(payload?.title),
      status: 'draft',
      assumptions: normalizeParentSimulationAssumptions(null),
    })
    .select('*')
    .single()
  if (created.error || !created.data)
    return jsonError(created.error?.message || 'Could not create simulation')
  return NextResponse.json({ ok: true, simulation: created.data, careerIds: [] })
}

export async function PUT(req: Request) {
  const { supabase, userId, error } = await requireParentSimulationUser()
  if (error || !userId) return error

  const payload = (await req.json().catch(() => null)) as {
    careerIds?: unknown
    assumptions?: Partial<ParentSimulationAssumptions>
    title?: unknown
    status?: string
    simulationId?: string | null
  } | null
  const careerIds = cleanCareerIds(payload?.careerIds ?? [])
  if (!careerIds) return jsonError('careerIds must be an array')

  const { simulation, error: simulationError } = await getOrCreateSimulation(
    supabase,
    userId,
    payload?.simulationId,
  )
  if (simulationError || !simulation?.id)
    return jsonError(simulationError?.message || 'Could not load simulation')

  const assumptions = normalizeParentSimulationAssumptions(
    payload?.assumptions || (simulation.assumptions as Partial<ParentSimulationAssumptions> | null),
  )
  const summary = calculateParentSimulation(careerIds, assumptions)
  const requestedStatus =
    payload?.status === 'completed'
      ? 'completed'
      : payload?.status === 'draft'
        ? 'draft'
        : simulation.status || 'draft'
  const completedAt =
    requestedStatus === 'completed' ? new Date().toISOString() : simulation.completed_at || null

  const saveError = await saveCareerIds(supabase, simulation.id, careerIds)
  if (saveError) return jsonError(saveError.message)

  const updated = await supabase
    .from('lifepath_simulations')
    .update({
      title: payload?.title === undefined ? simulation.title : cleanTitle(payload.title),
      assumptions,
      results: summary,
      status: requestedStatus,
      completed_at: completedAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', simulation.id)
    .select('*')
    .single()
  if (updated.error || !updated.data)
    return jsonError(updated.error?.message || 'Could not save simulation')
  return NextResponse.json({
    ok: true,
    simulation: updated.data,
    simulationId: simulation.id,
    careerIds,
    summary,
  })
}

export async function PATCH(req: Request) {
  const { supabase, userId, error } = await requireParentSimulationUser()
  if (error || !userId) return error
  const payload = (await req.json().catch(() => null)) as {
    action?: string
    simulationId?: string
    title?: unknown
    studentProfileId?: string
  } | null

  if (!payload?.simulationId) return jsonError('simulationId is required')
  if (payload.action === 'rename') {
    const { error: updateError } = await supabase
      .from('lifepath_simulations')
      .update({ title: cleanTitle(payload.title), updated_at: new Date().toISOString() })
      .eq('id', payload.simulationId)
      .eq('created_by_user_id', userId)
    if (updateError) return jsonError(updateError.message)
    return NextResponse.json({ ok: true })
  }
  if (payload.action === 'revoke-share') {
    const { error: updateError } = await supabase
      .from('lifepath_simulation_shares')
      .update({
        status: 'revoked',
        revoked_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('simulation_id', payload.simulationId)
      .eq('shared_by_user_id', userId)
      .eq('student_profile_id', payload.studentProfileId)
    if (updateError) return jsonError(updateError.message)
    return NextResponse.json({ ok: true })
  }
  return jsonError('Unsupported action')
}

export async function DELETE(req: Request) {
  const { supabase, userId, error } = await requireParentSimulationUser()
  if (error || !userId) return error
  const url = new URL(req.url)
  const simulationId = url.searchParams.get('simulationId')
  let query = supabase
    .from('lifepath_simulations')
    .update({ status: 'archived', updated_at: new Date().toISOString() })
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .neq('status', 'archived')
  if (simulationId) query = query.eq('id', simulationId)
  else query = query.in('status', ['draft', 'active'])
  const { error: deleteError } = await query
  if (deleteError) return jsonError(deleteError.message)
  return NextResponse.json({ ok: true })
}
