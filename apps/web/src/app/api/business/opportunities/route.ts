import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

const TYPES = new Set(['internship','volunteer','job_shadowing','apprenticeship','mentorship','workshop','summer_program','part_time_job','career_event'])
const STATUSES = new Set(['draft','pending','active','closed','archived'])

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function cleanDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null
}

function cleanTextArray(value: unknown) {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim())
  if (typeof value === 'string' && value.trim()) return value.split(',').map((item) => item.trim()).filter(Boolean)
  return null
}

async function getOwnedBusinessProfile(supabase: Awaited<ReturnType<typeof createNextServerSupabaseClient>>, userId: string) {
  return supabase.from('business_profiles').select('id').eq('owner_user_id', userId).maybeSingle()
}

function payloadFor(body: Record<string, unknown>, businessProfileId: string, userId: string) {
  const opportunityType = cleanText(body.opportunity_type) || 'internship'
  const status = cleanText(body.status) || 'active'
  return {
    business_profile_id: businessProfileId,
    created_by_user_id: userId,
    title: cleanText(body.title),
    opportunity_type: TYPES.has(opportunityType) ? opportunityType : 'internship',
    description: cleanText(body.description),
    location_type: cleanText(body.location_type),
    city: cleanText(body.city),
    state: cleanText(body.state),
    remote_available: Boolean(body.remote_available),
    age_min: typeof body.age_min === 'number' ? body.age_min : null,
    grade_min: cleanText(body.grade_min),
    grade_max: cleanText(body.grade_max),
    career_category: cleanText(body.career_category),
    related_career_ids: cleanTextArray(body.related_career_ids),
    skills: cleanTextArray(body.skills),
    application_url: cleanText(body.application_url),
    contact_email: cleanText(body.contact_email),
    deadline: cleanDate(body.deadline),
    start_date: cleanDate(body.start_date),
    end_date: cleanDate(body.end_date),
    paid: Boolean(body.paid),
    compensation: cleanText(body.compensation),
    hours_required: cleanText(body.hours_required),
    status: STATUSES.has(status) ? status : 'active',
  }
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const { data: businessProfile, error: profileError } = await getOwnedBusinessProfile(supabase, session.user.id)
  if (profileError) return error(profileError.message)
  if (!businessProfile?.id) return NextResponse.json({ ok: true, opportunities: [] })

  const { data, error: listError } = await supabase
    .from('business_opportunities')
    .select('*')
    .eq('business_profile_id', businessProfile.id)
    .order('created_at', { ascending: false })

  if (listError) return error(listError.message)
  return NextResponse.json({ ok: true, opportunities: data || [] })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const { data: businessProfile, error: profileError } = await getOwnedBusinessProfile(supabase, session.user.id)
  if (profileError) return error(profileError.message)
  if (!businessProfile?.id) return error('Create a business profile first', 404)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return error('Invalid JSON')
  const payload = payloadFor(body, businessProfile.id as string, session.user.id)
  if (!payload.title) return error('Title is required')
  if (!payload.description) return error('Description is required')

  const { data, error: insertError } = await supabase.from('business_opportunities').insert(payload).select('*').single()
  if (insertError) return error(insertError.message)
  return NextResponse.json({ ok: true, opportunity: data })
}

export async function PATCH(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const { data: businessProfile, error: profileError } = await getOwnedBusinessProfile(supabase, session.user.id)
  if (profileError) return error(profileError.message)
  if (!businessProfile?.id) return error('Create a business profile first', 404)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return error('Invalid JSON')
  const id = cleanText(body.id)
  if (!id) return error('Missing opportunity id')
  const payload = payloadFor(body, businessProfile.id as string, session.user.id)
  if (!payload.title) return error('Title is required')
  if (!payload.description) return error('Description is required')

  const { data, error: updateError } = await supabase
    .from('business_opportunities')
    .update(payload)
    .eq('id', id)
    .eq('business_profile_id', businessProfile.id)
    .select('*')
    .single()

  if (updateError) return error(updateError.message)
  return NextResponse.json({ ok: true, opportunity: data })
}

export async function DELETE(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const { data: businessProfile, error: profileError } = await getOwnedBusinessProfile(supabase, session.user.id)
  if (profileError) return error(profileError.message)
  if (!businessProfile?.id) return error('Create a business profile first', 404)

  const body = (await req.json().catch(() => null)) as { id?: unknown } | null
  const id = cleanText(body?.id)
  if (!id) return error('Missing opportunity id')

  const { error: deleteError } = await supabase
    .from('business_opportunities')
    .delete()
    .eq('id', id)
    .eq('business_profile_id', businessProfile.id)

  if (deleteError) return error(deleteError.message)
  return NextResponse.json({ ok: true })
}
