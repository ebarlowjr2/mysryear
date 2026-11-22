/**
 * Source 2 — Open Scholarships directory (CC BY 4.0).
 *
 * "Open Scholarships by Grudged LLC — https://github.com/Grudged/open-scholarships"
 * Data licensed CC BY 4.0. MySRYear maps fields into its own schema (a change)
 * and adds sponsor-level checks; attribution is stored on every row.
 *
 * The directory is Nevada-first and lists most awards as "annual" with no
 * current-cycle date, so a listing alone does NOT establish availability. Each
 * record is imported as an unconfirmed lead (hidden from students) unless a
 * MySRYear sponsor-level check for the CURRENT cycle exists
 * (data/open-scholarships-sponsor-checks.json). The check's date — not the
 * import time — is the verification time.
 *
 * The feed is fetched once per refresh into the shared catalog. Requests carry
 * no student data.
 */

import { inferFieldTags } from '@mysryear/shared'
import type { ScholarshipImportRecord } from '../types'
import type { ScholarshipSourceAdapter } from './source-adapter'
import { cleanTags } from '../normalize'

export const OPEN_SCHOLARSHIPS_SOURCE = 'open-scholarships'
export const OPEN_SCHOLARSHIPS_ATTRIBUTION =
  'Open Scholarships by Grudged LLC — https://github.com/Grudged/open-scholarships (CC BY 4.0). Fields mapped by MySRYear.'
export const OPEN_SCHOLARSHIPS_FEED_URL = 'https://scholarships.grudged.io/scholarships.json'

export type OpenScholarshipsRecord = {
  id: string
  name: string
  sponsor: string
  type?: string
  award?: { amount_min?: number | null; amount_max?: number | null; notes?: string | null }
  deadline?: { type?: string; date?: string | null; opens?: string | null; notes?: string | null }
  eligibility?: {
    residency?: string[]
    education_level?: string[]
    fields_of_study?: string[]
    gpa_min?: number | null
    other?: string[]
    tags?: string[]
  }
  geo?: { state?: string | null; scope?: string | null }
  links?: { info_url?: string | null; apply_url?: string | null }
  provenance?: { source_url?: string | null; last_verified?: string | null; verification_method?: string | null }
  status?: string
}

export type SponsorCheck = {
  status: 'open' | 'upcoming' | 'closed_early' | 'conflicting' | 'unreachable' | 'duplicate'
  checkedAt: string
  checkedUrl: string
  applyUrl?: string
  opensAt?: string
  closesOn?: string
  closesTime?: string
  timeZone?: string
  amountMin?: number
  amountMax?: number
  minimumGpa?: number
  eligibilitySummary?: string
  audienceLevels?: string[]
  fieldTags?: string[]
  closureNote?: string
  duplicateOf?: string
  note?: string
  evidence?: string[]
}

export type SponsorChecks = Record<string, SponsorCheck>

const LEVEL_TO_GRADES: Record<string, string[]> = {
  'high-school-senior': ['12'],
  'high-school': ['9', '10', '11', '12'],
}

function mapGrades(levels: string[]): string[] {
  return Array.from(new Set(levels.flatMap((l) => LEVEL_TO_GRADES[l] ?? [])))
}

export class OpenScholarshipsSourceAdapter implements ScholarshipSourceAdapter {
  readonly sourceName = OPEN_SCHOLARSHIPS_SOURCE
  constructor(
    private readonly loadFeed: () => Promise<unknown>,
    private readonly checks: SponsorChecks,
  ) {}

  async fetchRecords(options?: { limit?: number }): Promise<unknown[]> {
    const payload = await this.loadFeed()
    const records = Array.isArray(payload)
      ? payload
      : payload && typeof payload === 'object' && Array.isArray((payload as { records?: unknown[] }).records)
        ? (payload as { records: unknown[] }).records
        : payload && typeof payload === 'object' && Array.isArray((payload as { scholarships?: unknown[] }).scholarships)
          ? (payload as { scholarships: unknown[] }).scholarships
          : null
    if (!records) throw new Error('Open Scholarships feed returned an unexpected shape')
    return typeof options?.limit === 'number' ? records.slice(0, options.limit) : records
  }

  normalizeRecord(record: unknown): ScholarshipImportRecord | null {
    if (!record || typeof record !== 'object') return null
    const r = record as OpenScholarshipsRecord
    const infoUrl = r.links?.info_url || r.provenance?.source_url || null
    if (!r.id || !r.name || !r.sponsor || !infoUrl) return null

    const eligibility = r.eligibility ?? {}
    const levels = cleanTags(eligibility.education_level)
    const other = (eligibility.other ?? []).filter(Boolean)
    const check = this.checks[r.id]
    const audience = cleanTags(check?.audienceLevels ?? levels)
    const inferredFields = inferFieldTags([r.name, r.sponsor, ...(eligibility.fields_of_study ?? []), ...other].join(' '))
    const state = r.geo?.state ? String(r.geo.state).toUpperCase() : null

    const base: ScholarshipImportRecord = {
      source: this.sourceName,
      externalId: r.id,
      sourceUrl: check?.checkedUrl || infoUrl,
      title: r.name,
      organization: r.sponsor,
      description: other.length ? other.join(' ') : undefined,
      amountMin: check?.amountMin ?? r.award?.amount_min ?? undefined,
      amountMax: check?.amountMax ?? r.award?.amount_max ?? undefined,
      applicationUrl: check?.applyUrl || r.links?.apply_url || infoUrl,
      minimumGpa: check?.minimumGpa ?? eligibility.gpa_min ?? undefined,
      gradeLevels: mapGrades(audience),
      audienceLevels: audience,
      fieldTags: cleanTags(check?.fieldTags ?? inferredFields),
      awardScope: state ? 'local' : inferredFields.length ? 'field' : 'general',
      stateEligibility: state ? [state] : [],
      countryEligibility: ['US'],
      eligibilitySummary: check?.eligibilitySummary,
      attribution: OPEN_SCHOLARSHIPS_ATTRIBUTION,
      active: true,
      rawSourceMetadata: {
        openScholarshipsStatus: r.status ?? null,
        listedDeadline: r.deadline ?? null,
        listedLastVerified: r.provenance?.last_verified ?? null,
        sponsorCheck: check ? { status: check.status, checkedAt: check.checkedAt, note: check.note ?? null } : null,
      },
    }

    // No current-cycle sponsor check: keep as an unconfirmed lead (hidden).
    if (!check) {
      return { ...base, deadlineType: 'unknown', verificationStatus: 'unverified', lastVerifiedAt: null }
    }

    const evidence = { checkedUrl: check.checkedUrl, checkedAt: check.checkedAt, quotes: check.evidence ?? [], note: check.note ?? null }
    switch (check.status) {
      case 'open':
      case 'upcoming':
        if (!check.closesOn) return { ...base, deadlineType: 'unknown', verificationStatus: 'needs_review', lastVerifiedAt: null }
        return {
          ...base,
          deadline: check.closesOn,
          deadlineType: 'fixed',
          deadlineTime: check.closesTime,
          deadlineTimezone: check.timeZone,
          opensAt: check.opensAt,
          verificationStatus: 'verified',
          lastVerifiedAt: check.checkedAt,
          availabilityEvidence: evidence,
        }
      case 'closed_early':
        return {
          ...base,
          deadline: check.closesOn,
          deadlineType: check.closesOn ? 'fixed' : 'unknown',
          deadlineTime: check.closesTime,
          deadlineTimezone: check.timeZone,
          closedAt: check.checkedAt,
          closureReason: 'closed_early',
          earlyClosureNote: check.closureNote,
          verificationStatus: 'verified',
          lastVerifiedAt: check.checkedAt,
          availabilityEvidence: evidence,
        }
      case 'duplicate':
        return {
          ...base,
          deadlineType: 'unknown',
          verificationStatus: 'needs_review',
          lastVerifiedAt: null,
          availabilityEvidence: evidence,
          rawSourceMetadata: { ...base.rawSourceMetadata, duplicateOf: check.duplicateOf ?? null },
        }
      case 'conflicting':
        return { ...base, deadlineType: 'unknown', verificationStatus: 'needs_review', lastVerifiedAt: null, availabilityEvidence: evidence }
      case 'unreachable':
      default:
        return { ...base, deadlineType: 'unknown', verificationStatus: 'unverified', lastVerifiedAt: null, availabilityEvidence: evidence }
    }
  }
}
