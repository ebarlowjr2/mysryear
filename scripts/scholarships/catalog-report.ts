/**
 * Read-only scholarship catalog health report.
 *
 *   npx tsx scripts/scholarships/catalog-report.ts [--label=local]
 *
 * Prints counts only (no secrets, no student data): canonical rows, what the
 * student-visible view returns (total and per source), verification/lifecycle
 * breakdowns, past-deadline rows still active, tracked statuses (counts only),
 * and the latest ingestion runs. Requires SUPABASE_URL +
 * SUPABASE_SERVICE_ROLE_KEY in the environment (or .env.local).
 */
import { createServiceRoleClient, hasServiceRoleConfig, loadEnvFile } from './supabase-service-role'

async function all(table: string, select: string) {
  const supabase = createServiceRoleClient()
  const out: Array<Record<string, unknown>> = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase.from(table).select(select).range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data || []) as unknown as Array<Record<string, unknown>>))
    if (!data || data.length < 1000) break
  }
  return out
}

function tally(rows: Array<Record<string, unknown>>, key: (r: Record<string, unknown>) => string) {
  const t: Record<string, number> = {}
  for (const r of rows) t[key(r)] = (t[key(r)] ?? 0) + 1
  return t
}

async function main() {
  loadEnvFile()
  if (!hasServiceRoleConfig()) throw new Error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
  const label = process.argv.find((a) => a.startsWith('--label='))?.slice(8) ?? 'unlabeled'
  const now = new Date()
  const canonical = await all('scholarships', '*')
  const visible = await all('student_visible_scholarships', '*')
  const tracked = await all('student_scholarship_matches', 'status')
  const supabase = createServiceRoleClient()
  const { data: runs } = await supabase
    .from('scholarship_ingestion_runs')
    .select('source,trigger,status,started_at,fetched_count,created_count,updated_count,unchanged_count,archived_count,rejected_count,failed_count,visible_count')
    .order('started_at', { ascending: false })
    .limit(6)
  const pastDeadlineActive = canonical.filter((r) => r.active && r.deadline_type !== 'rolling' && (r.deadline_at ? Date.parse(String(r.deadline_at)) <= now.getTime() : false)).length
  const report = {
    environment: label,
    at: now.toISOString(),
    canonical: canonical.length,
    visible: visible.length,
    visibleOpenNow: visible.filter((r) => !r.opens_at || Date.parse(String(r.opens_at)) <= now.getTime()).length,
    visibleBySource: tally(visible, (r) => String(r.source ?? 'unsourced')),
    canonicalBySource: tally(canonical, (r) => String(r.source ?? 'unsourced')),
    byVerification: tally(canonical, (r) => String(r.verification_status)),
    byLifecycle: tally(canonical, (r) => `${r.active ? 'active' : 'inactive'}/${r.lifecycle_status}`),
    yearBefore2005: canonical.filter((r) => typeof r.deadline === 'string' && Number(String(r.deadline).slice(0, 4)) < 2005).length,
    pastDeadlineStillActive: pastDeadlineActive,
    trackedStatuses: tally(tracked, (r) => String(r.status)),
    latestRuns: runs ?? [],
  }
  console.log(JSON.stringify(report, null, 2))
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exitCode = 1
})
