/**
 * Shared helper that builds a source adapter and runs a full freshness refresh
 * with a service-role repository. Used by the scheduled cron route and the
 * admin manual-refresh route so both behave identically.
 *
 * Server-side only (uses a service-role Supabase client).
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  LegacyScrapedSourceAdapter,
  SupabaseScholarshipRepository,
  refreshScholarships,
  type LegacyScrapedRow,
  type ScholarshipRefreshResult,
  type ScholarshipSourceAdapter,
} from './ingestion'

export type RunRefreshOptions = {
  trigger: 'scheduled' | 'manual' | 'dry_run'
  source?: string
  dryRun?: boolean
  limit?: number
  deactivateMissing?: boolean
  createdBy?: string | null
}

function buildAdapter(supabase: SupabaseClient, source: string): ScholarshipSourceAdapter {
  if (source === 'legacy') {
    // Bridge data already stored in the app (scraped_scholarships) into the
    // canonical table. No external network calls.
    return new LegacyScrapedSourceAdapter(async (opts) => {
      let query = supabase
        .from('scraped_scholarships')
        .select('id,name,amount,deadline,link,state,tags,source')
        .eq('is_active', true)
      if (opts?.limit) query = query.limit(opts.limit)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as LegacyScrapedRow[]
    })
  }
  throw new Error(`Unsupported refresh source "${source}". Supported: legacy.`)
}

export async function runScholarshipRefresh(
  supabase: SupabaseClient,
  options: RunRefreshOptions,
): Promise<ScholarshipRefreshResult> {
  const adapter = buildAdapter(supabase, options.source ?? 'legacy')
  const repository = new SupabaseScholarshipRepository(supabase)
  return refreshScholarships(adapter, repository, {
    trigger: options.trigger,
    dryRun: options.dryRun,
    limit: options.limit,
    deactivateMissing: options.deactivateMissing,
    createdBy: options.createdBy ?? null,
  })
}
