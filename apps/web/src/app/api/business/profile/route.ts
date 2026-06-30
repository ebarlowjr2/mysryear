import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const { data, error: profileError } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('owner_user_id', session.user.id)
    .maybeSingle()

  if (profileError) return error(profileError.message)
  return NextResponse.json({ ok: true, profile: data || null })
}

export async function POST(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null
  if (!body) return error('Invalid JSON')

  const organizationName = cleanText(body.organization_name)
  if (!organizationName) return error('Organization name is required')

  const payload = {
    owner_user_id: session.user.id,
    organization_name: organizationName,
    contact_name: cleanText(body.contact_name),
    contact_email: cleanText(body.contact_email) || session.user.email || null,
    phone: cleanText(body.phone),
    website: cleanText(body.website),
    industry: cleanText(body.industry),
    description: cleanText(body.description),
    address_city: cleanText(body.address_city),
    address_state: cleanText(body.address_state),
    status: 'active',
  }

  const { data, error: upsertError } = await supabase
    .from('business_profiles')
    .upsert(payload, { onConflict: 'owner_user_id' })
    .select('*')
    .single()

  if (upsertError) return error(upsertError.message)

  await supabase.from('profiles').update({ role: 'business', onboarding_complete: true }).eq('id', session.user.id)

  return NextResponse.json({ ok: true, profile: data })
}
