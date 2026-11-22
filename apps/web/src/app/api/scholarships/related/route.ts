import { NextResponse } from 'next/server'
import {
  CAREERS,
  createNextServerSupabaseClient,
  dedupeCatalog,
  loadVisibleScholarshipCatalog,
  matchCareerPlans,
  scholarshipAvailability,
  toCatalogEntry,
} from '@mysryear/shared'

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

/**
 * Scholarships related to one LifePath career (LifePath career detail panel).
 * Uses the same verified-open catalog and career→sponsor-criteria mapping as
 * the Scholarships page, so the two never disagree.
 */
export async function GET(req: Request) {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return error('Not authenticated', 401)

  const url = new URL(req.url)
  const careerCategory = url.searchParams.get('careerCategory')?.trim()
  const careerIdParam = url.searchParams.get('careerId')?.trim()
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit') || 3), 1), 10)
  const careerIds = careerIdParam
    ? [careerIdParam]
    : CAREERS.filter((career) => career.category === careerCategory).map((career) => career.id)

  const { rows, error: listError } = await loadVisibleScholarshipCatalog(supabase)
  if (listError) return error(listError, 503)

  const now = new Date()
  const entries = dedupeCatalog(rows.map(toCatalogEntry)).map((entry) => ({ entry, availability: scholarshipAvailability(entry, now) }))
  const matches = matchCareerPlans(entries, { careerIds }, null).slice(0, limit)

  return NextResponse.json({
    ok: true,
    scholarships: matches.map((match) => ({
      id: match.entry.id,
      title: match.entry.title,
      organization: match.entry.organization,
      amount: match.entry.amount,
      deadline: match.entry.deadline,
      deadline_at: match.entry.deadlineAt,
      deadline_type: match.entry.deadlineType,
      deadline_label: match.availability.label,
      last_verified_at: match.entry.lastVerifiedAt,
      state: match.entry.state,
      career_tags: match.entry.careerTags,
      major_tags: match.entry.majorTags,
      skill_tags: match.entry.fieldTags,
      application_url: match.entry.applicationUrl,
      source_url: match.entry.sourceUrl,
      reasons: match.reasons,
    })),
  })
}
