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
  const careerCategory = url.searchParams.get('careerCategory')?.trim()
  const careerId = url.searchParams.get('careerId')?.trim()
  const limit = Math.min(Number(url.searchParams.get('limit') || 3), 10)

  let query = supabase
    .from('scholarships')
    .select('id,title,organization,amount,deadline,state,career_tags,major_tags,skill_tags,application_url')
    .eq('active', true)
    .order('deadline', { ascending: true, nullsFirst: false })
    .limit(limit)

  if (careerId) {
    query = query.or(`career_tags.cs.{${careerId}},major_tags.cs.{${careerId}},skill_tags.cs.{${careerId}}`)
  } else if (careerCategory) {
    query = query.or(`career_tags.cs.{${careerCategory}},major_tags.cs.{${careerCategory}},skill_tags.cs.{${careerCategory}}`)
  }

  const { data, error: listError } = await query
  if (listError) return error(listError.message)
  return NextResponse.json({ ok: true, scholarships: data || [] })
}
