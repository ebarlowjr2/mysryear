/**
 * Native data layer for Scholarship Discovery.
 *
 * Uses the SAME shared loader (`loadScholarshipDiscoveryInput`) and contract
 * (`buildScholarshipDiscovery`) as the web API, so identical clocks and
 * profiles produce identical scholarship IDs, ordering, deadline labels, match
 * explanations and saved state on both platforms. All reads run under the
 * signed-in user's RLS for the active student only.
 */

import {
  buildScholarshipApplicationTaskSeeds,
  buildScholarshipDetail,
  buildScholarshipDiscovery,
  formatAwardAmount,
  formatCatalogDate,
  formatUsd,
  loadScholarshipDiscoveryInput,
  toCatalogEntry,
  type DiscoveryTask,
  type ScholarshipApplicationTaskStatus,
  type ScholarshipCatalogEntry,
  type ScholarshipCatalogFilters,
  type ScholarshipDiscovery,
  type ScholarshipDiscoveryInput,
  type ScholarshipForMatching,
  type ScholarshipReadinessResult,
  type ScholarshipRequirement,
  type ScholarshipStatus,
  type ScholarshipDetail,
} from '@mysryear/shared'
import { supabase } from '../lib/supabase'

export type { ScholarshipDiscovery, ScholarshipDiscoveryInput, ScholarshipCatalogFilters }

export type MobileScholarship = ScholarshipForMatching & {
  application_url?: string | null
  opportunity_source?: string | null
}

export type MobileScholarshipTask = DiscoveryTask

/** Clock used for discovery. Override only in tests/parity runs. */
let clock: () => Date = () => new Date()
export function setScholarshipClock(next: (() => Date) | null) {
  clock = next ?? (() => new Date())
}
export function scholarshipNow(): Date {
  return clock()
}

export async function loadScholarshipDiscoveryData(studentProfileId: string | null): Promise<ScholarshipDiscoveryInput> {
  return loadScholarshipDiscoveryInput(supabase, studentProfileId, scholarshipNow())
}

export function buildDiscovery(
  input: ScholarshipDiscoveryInput,
  filters: ScholarshipCatalogFilters = {},
  page = 1,
): ScholarshipDiscovery {
  return buildScholarshipDiscovery(input, { now: scholarshipNow(), filters, page })
}

export async function loadScholarshipDiscovery(
  studentProfileId: string | null,
  filters: ScholarshipCatalogFilters = {},
  page = 1,
): Promise<{ input: ScholarshipDiscoveryInput; discovery: ScholarshipDiscovery }> {
  const input = await loadScholarshipDiscoveryData(studentProfileId)
  return { input, discovery: buildDiscovery(input, filters, page) }
}

/** Kept for the dashboard: readiness + counts from the discovery contract. */
export type MobileScholarshipWorkspace = {
  readiness: ScholarshipReadinessResult
  counts: Record<ScholarshipStatus | 'total', number>
  estimatedValue: number
}

export async function listScholarshipMatches(studentProfileId: string): Promise<MobileScholarshipWorkspace> {
  const { discovery } = await loadScholarshipDiscovery(studentProfileId)
  const c = discovery.tracker.counts
  return {
    readiness: discovery.readiness,
    counts: { total: discovery.catalog.openCount, suggested: discovery.forYou.items.length, ...c },
    estimatedValue: discovery.forYou.items.reduce((sum, m) => sum + Number(m.entry.amount || 0), 0),
  }
}

export type { ScholarshipDetail }

/** Detail for any catalog award or any award the student tracks (even closed). */
export function detailFromInput(input: ScholarshipDiscoveryInput, scholarshipId: string): ScholarshipDetail | null {
  return buildScholarshipDetail(input, scholarshipId, scholarshipNow())
}

export async function getScholarshipDetail(studentProfileId: string | null, scholarshipId: string): Promise<ScholarshipDetail | null> {
  const input = await loadScholarshipDiscoveryData(studentProfileId)
  const detail = detailFromInput(input, scholarshipId)
  if (detail || !studentProfileId) return detail
  // Not in the open catalog and not tracked: read the award directly (RLS still applies).
  const { data } = await supabase.from('scholarships').select('*').eq('id', scholarshipId).maybeSingle()
  return data ? detailFromInput({ ...input, trackedRows: [...input.trackedRows, data as Record<string, unknown>] }, scholarshipId) : null
}

function toMatching(entry: ScholarshipCatalogEntry): MobileScholarship {
  return {
    id: entry.id,
    title: entry.title,
    organization: entry.organization,
    description: entry.description,
    amount: entry.amount,
    deadline: entry.deadline,
    application_url: entry.applicationUrl,
    state: entry.state,
    minimum_gpa: entry.minimumGpa,
    minimum_grade_level: entry.minimumGradeLevel,
    maximum_grade_level: entry.maximumGradeLevel,
    financial_need_required: entry.financialNeedRequired,
    essay_required: entry.essayRequired,
    recommendation_required: entry.recommendationRequired,
    volunteer_required: entry.volunteerRequired,
    career_tags: entry.careerTags,
    major_tags: entry.majorTags,
    skill_tags: entry.fieldTags,
  }
}

export async function updateScholarshipStatus(input: {
  studentProfileId: string
  scholarship: ScholarshipCatalogEntry | MobileScholarship
  status: ScholarshipStatus
  userId: string
}): Promise<void> {
  const { error } = await supabase
    .from('student_scholarship_matches')
    .upsert({ student_profile_id: input.studentProfileId, scholarship_id: input.scholarship.id, status: input.status }, { onConflict: 'student_profile_id,scholarship_id' })
  if (error) throw error

  if (input.status === 'saved' || input.status === 'applying' || input.status === 'submitted') {
    const matching = 'deadlineType' in input.scholarship ? toMatching(input.scholarship) : input.scholarship
    await ensureScholarshipApplicationTasks(input.studentProfileId, matching, input.userId)
  }
}

export async function ensureScholarshipApplicationTasks(studentProfileId: string, scholarship: MobileScholarship, userId: string): Promise<void> {
  const { data: requirements } = await supabase.from('scholarship_requirements').select('*').eq('scholarship_id', scholarship.id)
  const seeds = buildScholarshipApplicationTaskSeeds(scholarship, (requirements || []) as ScholarshipRequirement[])
  if (!seeds.length) return

  const { error } = await supabase.from('scholarship_application_tasks').upsert(
    seeds.map((task) => ({
      student_profile_id: studentProfileId,
      scholarship_id: scholarship.id,
      created_by_user_id: userId,
      title: task.title,
      description: task.description || null,
      category: task.category,
      due_date: task.dueDate || null,
      upload_required: Boolean(task.uploadRequired),
    })),
    { onConflict: 'student_profile_id,scholarship_id,title', ignoreDuplicates: true },
  )
  if (error) throw error
}

export async function updateScholarshipApplicationTask(input: {
  studentProfileId: string
  taskId: string
  status: ScholarshipApplicationTaskStatus
}): Promise<void> {
  const { error } = await supabase
    .from('scholarship_application_tasks')
    .update({
      status: input.status,
      completed_at: input.status === 'done' ? new Date().toISOString() : null,
    })
    .eq('id', input.taskId)
    .eq('student_profile_id', input.studentProfileId)
  if (error) throw error
}

export function formatScholarshipAmount(entry: Pick<ScholarshipCatalogEntry, 'amountDisplay' | 'amount' | 'amountMin' | 'amountMax'> | number | null | undefined): string {
  if (entry == null) return 'Amount not published'
  if (typeof entry === 'number') return entry > 0 ? formatUsd(entry) : 'Amount not published'
  return formatAwardAmount(entry)
}

export function formatDeadline(deadline: string | null | undefined): string {
  return deadline ? formatCatalogDate(deadline) || deadline : 'Not published'
}
