import { NextRequest, NextResponse } from 'next/server'

/**
 * RETIRED legacy aggregator scraper.
 *
 * It rendered Fastweb, Scholarships.com, Unigo, Niche and others through a
 * paid premium-proxy service, stripped deadline years ("September 30" → 2001),
 * wrote with the public anon key (RLS has no UPDATE policy, so "deactivate old
 * rows" silently did nothing), swallowed every provider error as an empty
 * success, and serially waited ~60–90 s — longer than the function limit.
 * Its last successful write was 2025-09-20.
 *
 * The catalog now comes from /api/cron/scholarship-refresh (sponsor-verified
 * entries + the CC BY 4.0 Open Scholarships directory with sponsor checks).
 * This route is no longer scheduled. It only reports that it is retired.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  return NextResponse.json(
    { success: false, retired: true, replacement: '/api/cron/scholarship-refresh' },
    { status: 410 },
  )
}
