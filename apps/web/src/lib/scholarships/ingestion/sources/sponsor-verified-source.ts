/**
 * Source 1 — MySRYear sponsor-verified feed.
 *
 * Original factual entries written from each sponsor's or administrator's own
 * page (see data/sponsor-verified.json). Each record carries the date the page
 * was checked and short evidence quotes; that date — never "now" — is the
 * record's verification time. Re-reading this file therefore cannot make a
 * stale entry look freshly verified.
 *
 * No network access: the dataset ships with the app and is fetched once into
 * the shared catalog for all users.
 */

import type { ScholarshipImportRecord } from '../types'
import type { ScholarshipSourceAdapter } from './source-adapter'
import { cleanTags } from '../normalize'

export const SPONSOR_VERIFIED_SOURCE = 'mysryear-sponsor-verified'

export type SponsorVerifiedRecord = {
  externalId: string
  title: string
  organization: string
  sourceUrl: string
  applicationUrl: string
  description?: string
  amountMin?: number
  amountMax?: number
  amountDisplay?: string
  opensAt?: string
  deadline?: string
  deadlineTime?: string
  deadlineTimezone?: string
  deadlineType?: 'fixed' | 'rolling'
  earlyClosureNote?: string
  closedAt?: string
  closureReason?: string
  eligibilitySummary?: string
  audienceLevels?: string[]
  gradeLevels?: string[]
  graduationYears?: number[]
  fieldTags?: string[]
  majorTags?: string[]
  careerTags?: string[]
  awardScope?: 'general' | 'field' | 'local'
  stateEligibility?: string[]
  countryEligibility?: string[]
  minimumGpa?: number
  financialNeedRequired?: boolean
  essayRequired?: boolean
  recommendationRequired?: boolean
  transcriptRequired?: boolean
  volunteerRequired?: boolean
  active?: boolean
  lastVerifiedAt: string
  evidence?: string[]
  alsoListedBy?: string[]
}

export type SponsorVerifiedDataset = { source?: string; records: SponsorVerifiedRecord[] }

export class SponsorVerifiedSourceAdapter implements ScholarshipSourceAdapter {
  readonly sourceName = SPONSOR_VERIFIED_SOURCE
  constructor(private readonly load: () => Promise<SponsorVerifiedDataset> | SponsorVerifiedDataset) {}

  async fetchRecords(options?: { limit?: number }): Promise<unknown[]> {
    const dataset = await this.load()
    const records = Array.isArray(dataset?.records) ? dataset.records : []
    return typeof options?.limit === 'number' ? records.slice(0, options.limit) : records
  }

  normalizeRecord(record: unknown): ScholarshipImportRecord | null {
    if (!record || typeof record !== 'object') return null
    const r = record as SponsorVerifiedRecord
    if (!r.externalId || !r.title || !r.applicationUrl || !r.sourceUrl) return null
    return {
      source: this.sourceName,
      externalId: r.externalId,
      sourceUrl: r.sourceUrl,
      title: r.title,
      organization: r.organization,
      description: r.description,
      amountMin: r.amountMin,
      amountMax: r.amountMax,
      amountDisplay: r.amountDisplay,
      deadline: r.deadline,
      deadlineType: r.deadlineType ?? (r.deadline ? 'fixed' : 'unknown'),
      deadlineTime: r.deadlineTime,
      deadlineTimezone: r.deadlineTimezone,
      opensAt: r.opensAt,
      earlyClosureNote: r.earlyClosureNote,
      closedAt: r.closedAt,
      closureReason: r.closureReason,
      eligibilitySummary: r.eligibilitySummary,
      audienceLevels: cleanTags(r.audienceLevels),
      applicationUrl: r.applicationUrl,
      minimumGpa: r.minimumGpa,
      gradeLevels: r.gradeLevels,
      graduationYears: r.graduationYears,
      fieldTags: cleanTags(r.fieldTags),
      majorTags: cleanTags(r.majorTags),
      careerTags: cleanTags(r.careerTags),
      awardScope: r.awardScope,
      stateEligibility: cleanTags(r.stateEligibility),
      countryEligibility: cleanTags(r.countryEligibility),
      financialNeedRequired: r.financialNeedRequired,
      essayRequired: r.essayRequired,
      recommendationRequired: r.recommendationRequired,
      transcriptRequired: r.transcriptRequired,
      volunteerRequired: r.volunteerRequired,
      active: r.active !== false,
      verificationStatus: r.lastVerifiedAt ? 'verified' : 'unverified',
      lastVerifiedAt: r.lastVerifiedAt ?? null,
      attribution: 'MySRYear summary of the sponsor’s official page',
      availabilityEvidence: { checkedUrl: r.sourceUrl, checkedAt: r.lastVerifiedAt, quotes: r.evidence ?? [] },
      rawSourceMetadata: { alsoListedBy: r.alsoListedBy ?? [] },
    }
  }
}
