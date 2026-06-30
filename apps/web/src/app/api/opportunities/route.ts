import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

export async function GET(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 6), 20)
  const careerCategory = url.searchParams.get('careerCategory')?.trim()
  const careerId = url.searchParams.get('careerId')?.trim()

  let query = supabase
    .from('business_opportunities')
    .select('id,title,opportunity_type,description,city,state,remote_available,career_category,related_career_ids,deadline,paid,compensation,business_profiles(organization_name,industry,verified)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (careerId) {
    query = query.contains('related_career_ids', [careerId])
  } else if (careerCategory) {
    query = query.ilike('career_category', `%${careerCategory}%`)
  }

  const { data, error: listError } = await query
  if (listError) return error(listError.message)
  return NextResponse.json({ ok: true, opportunities: data || [] })
}
