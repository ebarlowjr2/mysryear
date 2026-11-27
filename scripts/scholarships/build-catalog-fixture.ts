/**
 * Regenerates packages/shared/src/__fixtures__/scholarship-catalog.json: the
 * rows the two catalog providers produce today (sponsor-verified + Open
 * Scholarships snapshot with sponsor checks), shaped like
 * public.scholarships rows. Used by shared + parity tests. Offline.
 *
 *   npx tsx scripts/scholarships/build-catalog-fixture.ts
 */
import { createHash } from 'node:crypto'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  InMemoryScholarshipRepository,
  OpenScholarshipsSourceAdapter,
  SponsorVerifiedSourceAdapter,
  ingestSource,
  type SponsorChecks,
  type SponsorVerifiedDataset,
} from '../../apps/web/src/lib/scholarships/ingestion'
import sponsorVerified from '../../apps/web/src/lib/scholarships/ingestion/data/sponsor-verified.json'
import checks from '../../apps/web/src/lib/scholarships/ingestion/data/open-scholarships-sponsor-checks.json'
import snapshot from '../../apps/web/src/lib/scholarships/ingestion/data/open-scholarships-snapshot.json'

function uuid(seed: string) {
  const h = createHash('sha1').update(seed).digest('hex')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`
}

async function main() {
  const now = new Date('2026-11-22T18:30:00.000Z')
  const repo = new InMemoryScholarshipRepository()
  const adapters = [
    new SponsorVerifiedSourceAdapter(() => sponsorVerified as unknown as SponsorVerifiedDataset),
    new OpenScholarshipsSourceAdapter(async () => snapshot, (checks as { checks: SponsorChecks }).checks),
  ]
  const rows: Record<string, unknown>[] = []
  for (const adapter of adapters) {
    const result = await ingestSource(adapter, repo, { now })
    console.log(adapter.sourceName, { fetched: result.fetched, inserted: result.inserted, rejected: result.rejected, errors: result.errors.length })
    for (const [externalId] of await repo.loadExistingBySource(adapter.sourceName)) {
      const row = repo.peek(adapter.sourceName, externalId)!
      rows.push({ id: uuid(`${row.source}:${row.external_id}`), ...row })
    }
  }
  rows.sort((a, b) => String(a.id).localeCompare(String(b.id)))
  const out = resolve(process.cwd(), 'packages/shared/src/__fixtures__/scholarship-catalog.json')
  writeFileSync(out, JSON.stringify({ generatedFor: now.toISOString(), rows }, null, 1) + '\n')
  console.log(`wrote ${rows.length} rows -> ${out}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
