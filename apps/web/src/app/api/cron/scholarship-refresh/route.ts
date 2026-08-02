import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient, hasServiceRoleConfig } from '@/lib/scholarships/service-role'
import { runScholarshipRefresh } from '@/lib/scholarships/run-refresh'

/**
 * Scheduled scholarship freshness refresh.
 *
 * Protect with the server-side CRON_SECRET (never expose publicly). Performs the
 * full refresh: import new, update existing, recheck deadlines, archive expired,
 * and record the run in scholarship_ingestion_runs. Uses a service-role client
 * (server-side only).
 *
 * Configure a scheduler (e.g. Vercel Cron) to GET this route with:
 *   Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  if (!hasServiceRoleConfig()) {
    return NextResponse.json(
      { ok: false, error: 'Missing SUPABASE_SERVICE_ROLE_KEY / SUPABASE_URL' },
      { status: 500 },
    )
  }

  const url = new URL(request.url)
  const dryRun = url.searchParams.get('dryRun') === '1'
  const source = url.searchParams.get('source') || 'legacy'
  const deactivateMissing = url.searchParams.get('deactivateMissing') === '1'

  try {
    const supabase = createServiceRoleClient()
    const result = await runScholarshipRefresh(supabase, {
      trigger: dryRun ? 'dry_run' : 'scheduled',
      source,
      dryRun,
      deactivateMissing,
    })
    return NextResponse.json({ ok: true, result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}
