import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, hasServiceRoleConfig } from '@/lib/scholarships/service-role'
import { DEFAULT_SOURCES, runScholarshipRefresh } from '@/lib/scholarships/run-refresh'

// Each provider plus a bounded sponsor-page recheck; keep well under the limit.
export const maxDuration = 60
export const dynamic = 'force-dynamic'

/**
 * Scheduled scholarship catalog refresh (Vercel Cron: see apps/web/vercel.json).
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` automatically when the
 * CRON_SECRET environment variable is set on the project. Runs every catalog
 * provider in isolation, archives past-deadline awards, rechecks a bounded
 * batch of sponsor pages, and writes one run-log row per provider with
 * fetched / created / updated / revalidated / archived / visible counts.
 *
 * Query params (manual use): dryRun=1, sources=a,b, deactivateMissing=1,
 * reverify=<n> (default 20; 0 disables), reverifyAll=1 (recheck even if not yet due,
 * e.g. the first production refresh).
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (!hasServiceRoleConfig()) {
    return NextResponse.json({ ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL' }, { status: 500 })
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const sources = (url.searchParams.get('sources') || url.searchParams.get('source') || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s && s !== 'all')
  const reverifyParam = Number(url.searchParams.get('reverify') ?? process.env.SCHOLARSHIP_REVERIFY_LIMIT ?? 20)

  try {
    const result = await runScholarshipRefresh(createServiceRoleClient(), {
      trigger: dryRun ? 'dry_run' : 'scheduled',
      sources: sources.length ? sources : [...DEFAULT_SOURCES],
      dryRun,
      deactivateMissing: url.searchParams.get('deactivateMissing') === '1',
      reverifyLimit: Number.isFinite(reverifyParam) ? Math.max(0, Math.min(50, reverifyParam)) : 20,
      reverifyAll: url.searchParams.get('reverifyAll') === '1',
    })
    return NextResponse.json({ ok: result.status !== 'failed', result }, { status: result.status === 'failed' ? 502 : 200 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
