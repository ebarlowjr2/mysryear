import { NextResponse } from 'next/server'
import {
  createNextServerSupabaseClient,
  formatCatalogDate,
  isListable,
  loadVisibleScholarshipCatalog,
  scholarshipAvailability,
  toCatalogEntry,
} from '@mysryear/shared'

export const dynamic = 'force-dynamic'

/**
 * Legacy list endpoint (consumer: /open-dashboard/scholarships).
 *
 * Previously this merged rows from the retired scraper table with six
 * hard-coded example.com awards, and returned ONLY those placeholders whenever
 * the read failed — so students could "save" awards that never existed.
 * It now returns the verified-open catalog in the legacy row shape, and an
 * empty list with HTTP 503 when listings are unavailable. No fallback data.
 */
export async function GET() {
  const supabase = await createNextServerSupabaseClient()
  const { rows, error } = await loadVisibleScholarshipCatalog(supabase)
  if (error) {
    return NextResponse.json([], { status: 503, headers: { 'x-catalog-status': 'unavailable' } })
  }
  const now = new Date()
  const legacyRows = rows
    .map((row) => toCatalogEntry(row))
    .map((entry) => ({ entry, availability: scholarshipAvailability(entry, now) }))
    .filter(({ availability }) => isListable(availability))
    .sort((a, b) => (a.availability.closesAtMs ?? Infinity) - (b.availability.closesAtMs ?? Infinity) || a.entry.id.localeCompare(b.entry.id))
    .map(({ entry }) => ({
      id: entry.id,
      name: entry.title,
      amount: entry.amountDisplay || (entry.amount ? `$${entry.amount.toLocaleString('en-US')}` : 'Amount varies'),
      // ISO date keeps the year; the legacy client parses YYYY-MM-DD as-is.
      deadline: entry.deadline || (entry.deadlineAt ? entry.deadlineAt.slice(0, 10) : 'Rolling'),
      deadlineLabel: entry.deadline ? formatCatalogDate(entry.deadline) : 'Rolling',
      link: entry.applicationUrl,
      state: entry.state,
      tags: entry.fieldTags,
      source: entry.source,
    }))
  return NextResponse.json(legacyRows)
}
