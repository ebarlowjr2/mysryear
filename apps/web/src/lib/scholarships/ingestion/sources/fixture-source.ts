/**
 * Fixture / manually-supplied dataset adapter.
 *
 * This demonstrates the pipeline end to end using an approved, curated dataset
 * (a manually supplied list of real, publicly-listed scholarships with their
 * own application URLs). It ships with the repo so ingestion can be exercised
 * without calling any external site — which also makes it the source used by
 * the test suite. Each record already carries a stable `externalId`.
 */

import type { ScholarshipImportRecord } from '../types'
import type { ScholarshipSourceAdapter } from './source-adapter'
import { cleanTags } from '../normalize'

/** Shape of a record in the fixture dataset (see scripts/scholarships/fixtures). */
export type FixtureScholarship = {
  externalId: string
  title: string
  organization: string
  description?: string
  sourceUrl: string
  applicationUrl: string
  amountMin?: number
  amountMax?: number
  amountDisplay?: string
  deadline?: string
  minimumGpa?: number
  gradeLevels?: string[]
  graduationYears?: number[]
  careerTags?: string[]
  majorTags?: string[]
  certificationTags?: string[]
  skillTags?: string[]
  stateEligibility?: string[]
  countryEligibility?: string[]
  financialNeedRequired?: boolean
  essayRequired?: boolean
  recommendationRequired?: boolean
  transcriptRequired?: boolean
  volunteerRequired?: boolean
  active?: boolean
  lastVerifiedAt?: string
}

export class FixtureSourceAdapter implements ScholarshipSourceAdapter {
  readonly sourceName: string
  private readonly dataset: FixtureScholarship[]

  constructor(dataset: FixtureScholarship[], sourceName = 'fixture-dataset') {
    this.dataset = dataset
    this.sourceName = sourceName
  }

  async fetchRecords(options?: { limit?: number; updatedSince?: string }): Promise<unknown[]> {
    let records = this.dataset
    if (options?.updatedSince) {
      const since = new Date(options.updatedSince).getTime()
      if (!Number.isNaN(since)) {
        records = records.filter((r) => {
          const verified = r.lastVerifiedAt ? new Date(r.lastVerifiedAt).getTime() : 0
          return verified >= since
        })
      }
    }
    if (typeof options?.limit === 'number') records = records.slice(0, options.limit)
    return records
  }

  normalizeRecord(record: unknown): ScholarshipImportRecord | null {
    if (!record || typeof record !== 'object') return null
    const r = record as FixtureScholarship
    if (!r.externalId || !r.title || !r.applicationUrl || !r.sourceUrl) return null

    return {
      source: this.sourceName,
      externalId: String(r.externalId),
      sourceUrl: r.sourceUrl,
      title: r.title,
      organization: r.organization,
      description: r.description,
      amountMin: r.amountMin,
      amountMax: r.amountMax,
      amountDisplay: r.amountDisplay,
      deadline: r.deadline,
      applicationUrl: r.applicationUrl,
      minimumGpa: r.minimumGpa,
      gradeLevels: r.gradeLevels,
      graduationYears: r.graduationYears,
      careerTags: cleanTags(r.careerTags),
      majorTags: cleanTags(r.majorTags),
      certificationTags: cleanTags(r.certificationTags),
      skillTags: cleanTags(r.skillTags),
      stateEligibility: cleanTags(r.stateEligibility),
      countryEligibility: cleanTags(r.countryEligibility),
      financialNeedRequired: r.financialNeedRequired,
      essayRequired: r.essayRequired,
      recommendationRequired: r.recommendationRequired,
      transcriptRequired: r.transcriptRequired,
      volunteerRequired: r.volunteerRequired,
      active: r.active !== false,
      lastVerifiedAt: r.lastVerifiedAt ?? new Date().toISOString(),
      rawSourceMetadata: { fixtureExternalId: r.externalId },
    }
  }
}
