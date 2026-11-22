import { NextResponse } from 'next/server'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { createServiceRoleClient, hasServiceRoleConfig } from '@/lib/scholarships/service-role'
import { DEFAULT_SOURCES, runScholarshipRefresh } from '@/lib/scholarships/run-refresh'

export const maxDuration = 60

/**
 * Administrative manual refresh + ingestion-run log.
 *
 *  - POST: platform admins trigger a full freshness refresh on demand.
 *  - GET:  platform admins read the recent ingestion-run log (created, updated,
 *          archived, duplicated, failed counts per run).
 *
 * Admin identity is verified from profiles.role; the actual writes use a
 * service-role client (server-side only).
 */

function error(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status })
}

async function requireAdmin() {
  const supabase = await createNextServerSupabaseClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return { error: error('Not authenticated', 401) as NextResponse }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  if (!profile || profile.role !== 'admin') {
    return { error: error('Admin access required', 403) as NextResponse }
  }
  return { supabase, userId: session.user.id }
}

export async function POST(req: Request) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate.error
  if (!hasServiceRoleConfig()) return error('Server missing SUPABASE_SERVICE_ROLE_KEY', 500)

  const body = (await req.json().catch(() => ({}))) as {
    dryRun?: unknown
    source?: unknown
    sources?: unknown
    limit?: unknown
    deactivateMissing?: unknown
    reverify?: unknown
  }
  const dryRun = body?.dryRun === true
  const sources = Array.isArray(body?.sources)
    ? body.sources.filter((s): s is string => typeof s === 'string')
    : typeof body?.source === 'string' && body.source !== 'all'
      ? [body.source]
      : [...DEFAULT_SOURCES]
  const reverifyLimit = typeof body?.reverify === 'number' ? Math.max(0, Math.min(50, body.reverify)) : 20
  const limit = typeof body?.limit === 'number' && body.limit > 0 ? body.limit : undefined
  const deactivateMissing = body?.deactivateMissing === true

  try {
    const admin = createServiceRoleClient()
    const result = await runScholarshipRefresh(admin, {
      trigger: dryRun ? 'dry_run' : 'manual',
      sources,
      dryRun,
      limit,
      reverifyLimit,
      deactivateMissing,
      createdBy: gate.userId,
    })
    return NextResponse.json({ ok: true, result })
  } catch (err) {
    return error(err instanceof Error ? err.message : 'Refresh failed', 500)
  }
}

export async function GET() {
  const gate = await requireAdmin()
  if ('error' in gate) return gate.error

  // Read the run log through the user's client so the admin RLS policy applies.
  const { data, error: listError } = await gate.supabase
    .from('scholarship_ingestion_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(50)

  if (listError) return error(listError.message, 500)
  return NextResponse.json({ ok: true, runs: data || [] })
}
