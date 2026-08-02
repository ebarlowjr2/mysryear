/**
 * Scholarship ingestion CLI.
 *
 * Usage:
 *   npm run scholarships:ingest -- --dry-run
 *   npm run scholarships:ingest
 *   npm run scholarships:ingest -- --source=fixture --limit=50 --dry-run
 *   npm run scholarships:ingest -- --source=legacy --deactivate-missing
 *
 * Flags:
 *   --dry-run             Fetch, normalize, validate and report proposed
 *                         changes WITHOUT writing to the database.
 *   --source=<name>       fixture (default) | legacy
 *   --limit=<n>           Cap the number of records fetched.
 *   --deactivate-missing  Retire active rows absent from a FULL import.
 *
 * Dry-run works without any Supabase configuration (it uses an in-memory store)
 * so the pipeline can be demonstrated offline. A real (non dry-run) import
 * requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (server-side only).
 */

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  FixtureSourceAdapter,
  InMemoryScholarshipRepository,
  LegacyScrapedSourceAdapter,
  SupabaseScholarshipRepository,
  ingestSource,
  type FixtureScholarship,
  type LegacyScrapedRow,
  type ScholarshipRepository,
  type ScholarshipSourceAdapter,
} from '../../apps/web/src/lib/scholarships/ingestion'
import {
  createServiceRoleClient,
  hasServiceRoleConfig,
  loadEnvFile,
} from './supabase-service-role'

type CliOptions = {
  dryRun: boolean
  source: string
  limit?: number
  deactivateMissing: boolean
}

function parseArgs(argv: string[]): CliOptions {
  const options: CliOptions = { dryRun: false, source: 'fixture', deactivateMissing: false }
  for (const arg of argv) {
    if (arg === '--dry-run') options.dryRun = true
    else if (arg === '--deactivate-missing') options.deactivateMissing = true
    else if (arg.startsWith('--source=')) options.source = arg.slice('--source='.length)
    else if (arg.startsWith('--limit=')) {
      const value = Number(arg.slice('--limit='.length))
      if (Number.isInteger(value) && value > 0) options.limit = value
    }
  }
  return options
}

function loadFixtureDataset(): FixtureScholarship[] {
  const path = resolve(process.cwd(), 'scripts/scholarships/fixtures/sample-scholarships.json')
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as { records: FixtureScholarship[] }
  return parsed.records || []
}

async function buildAdapter(
  source: string,
  supabase: ReturnType<typeof createServiceRoleClient> | null,
): Promise<ScholarshipSourceAdapter> {
  if (source === 'fixture') {
    return new FixtureSourceAdapter(loadFixtureDataset())
  }
  if (source === 'legacy') {
    if (!supabase) {
      throw new Error('The "legacy" source requires SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY')
    }
    const loader = async (opts?: { limit?: number }): Promise<LegacyScrapedRow[]> => {
      let query = supabase
        .from('scraped_scholarships')
        .select('id,name,amount,deadline,link,state,tags,source')
        .eq('is_active', true)
      if (opts?.limit) query = query.limit(opts.limit)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return (data || []) as LegacyScrapedRow[]
    }
    return new LegacyScrapedSourceAdapter(loader)
  }
  throw new Error(`Unknown source "${source}". Use --source=fixture or --source=legacy.`)
}

async function main() {
  loadEnvFile()
  const options = parseArgs(process.argv.slice(2))
  const hasConfig = hasServiceRoleConfig()

  if (!options.dryRun && !hasConfig) {
    console.error(
      'Refusing to run a live import without Supabase service-role config.\n' +
        'Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY, or run with --dry-run.',
    )
    process.exitCode = 1
    return
  }

  const supabase = hasConfig ? createServiceRoleClient() : null
  const adapter = await buildAdapter(options.source, supabase)

  let repository: ScholarshipRepository
  if (supabase && !options.dryRun) {
    repository = new SupabaseScholarshipRepository(supabase)
  } else if (supabase && options.dryRun) {
    // Dry-run against the real store: reads are safe, writes are skipped.
    repository = new SupabaseScholarshipRepository(supabase)
  } else {
    // No config: dry-run only, in-memory store (offline demonstration).
    repository = new InMemoryScholarshipRepository()
  }

  console.log(
    `\nScholarship ingestion — source="${adapter.sourceName}" mode=${options.dryRun ? 'DRY-RUN' : 'LIVE'}` +
      `${supabase ? '' : ' (in-memory store)'}\n`,
  )

  const result = await ingestSource(adapter, repository, {
    dryRun: options.dryRun,
    limit: options.limit,
    deactivateMissing: options.deactivateMissing,
  })

  console.log('Structured result:')
  console.log(JSON.stringify(result, null, 2))

  console.log('\nSummary:')
  console.log(`  fetched:    ${result.fetched}`)
  console.log(`  normalized: ${result.normalized}`)
  console.log(`  inserted:   ${result.inserted}${options.dryRun ? ' (proposed)' : ''}`)
  console.log(`  updated:    ${result.updated}${options.dryRun ? ' (proposed)' : ''}`)
  console.log(`  unchanged:  ${result.unchanged}`)
  console.log(`  rejected:   ${result.rejected}`)
  console.log(`  expired:    ${result.expired}`)
  console.log(`  errors:     ${result.errors.length}`)
  if (result.errors.length > 0) {
    console.log('\nErrors / rejections:')
    for (const err of result.errors) {
      console.log(`  - ${err.externalId ? `[${err.externalId}] ` : ''}${err.message}`)
    }
  }
  console.log('')
}

main().catch((err) => {
  console.error('Ingestion failed:', err instanceof Error ? err.message : err)
  process.exitCode = 1
})
