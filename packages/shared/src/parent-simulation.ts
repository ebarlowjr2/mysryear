import { CAREERS, type CareerPath, type DebtRisk, type PathwayType } from './career-catalog'
import { scoreCareerHealth, type CareerHealthBreakdown } from './lifepath'

export type SimulationPathway =
  | 'degree'
  | 'certification'
  | 'apprenticeship'
  | 'military'
  | 'direct_work'
export type SimulationInstitution =
  | 'public'
  | 'private'
  | 'community_college'
  | 'trade_school'
  | 'none'
export type SimulationHousing = 'living_at_home' | 'independent'
export type ParentSimulationStatus = 'draft' | 'completed' | 'active' | 'archived'

export type ParentSimulationAssumptions = {
  pathway: SimulationPathway
  institution: SimulationInstitution
  attendance: 'in_state' | 'out_of_state'
  scholarshipsAndGrants: number
  familyContribution: number
  studentEarnings: number
  expectedBorrowing?: number | null
  housing: SimulationHousing
  adjustedCost?: number | null
}

export type ParentSimulationCareerResult = {
  careerId: string
  careerTitle: string
  category: string
  careerHealthScore: number
  careerHealthLabel: 'Strong Path' | 'Moderate Path' | 'Needs Adjustment'
  breakdown: CareerHealthBreakdown
  estimatedCost: number
  estimatedOutOfPocketCost: number
  estimatedDebt: number
  entrySalaryMin: number
  entrySalaryMax: number
  expectedSalary: number
  debtToIncomeRatio: number
  debtRisk: DebtRisk
  timeToCareerReadinessYears: number
  certificationFriendly: boolean
  alternativeEntryPath: boolean
  demandOutlook: 'strong' | 'steady' | 'emerging'
  milestones: string[]
  lowerCostPaths: string[]
  explanation: string
}

export type ParentSimulationSummary = {
  assumptions: ParentSimulationAssumptions
  results: ParentSimulationCareerResult[]
  averageCareerHealthScore: number
  totalEstimatedCost: number
  totalEstimatedDebt: number
  generatedAt: string
}

export const DEFAULT_PARENT_SIMULATION_ASSUMPTIONS: ParentSimulationAssumptions = {
  pathway: 'degree',
  institution: 'public',
  attendance: 'in_state',
  scholarshipsAndGrants: 5_000,
  familyContribution: 3_000,
  studentEarnings: 2_500,
  expectedBorrowing: null,
  housing: 'living_at_home',
  adjustedCost: null,
}

export const SIMULATION_PATHWAY_LABELS: Record<SimulationPathway, string> = {
  degree: 'Degree path',
  certification: 'Certification first',
  apprenticeship: 'Apprenticeship',
  military: 'Military-supported path',
  direct_work: 'Direct work / earn while learning',
}

export const SIMULATION_INSTITUTION_LABELS: Record<SimulationInstitution, string> = {
  public: 'Public college/university',
  private: 'Private college/university',
  community_college: 'Community college first',
  trade_school: 'Trade school',
  none: 'No college route',
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function cleanMoney(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.max(0, Math.round(n))
}

export function normalizeParentSimulationAssumptions(
  input?: Partial<ParentSimulationAssumptions> | null,
): ParentSimulationAssumptions {
  return {
    pathway: input?.pathway || DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.pathway,
    institution: input?.institution || DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.institution,
    attendance: input?.attendance || DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.attendance,
    scholarshipsAndGrants: cleanMoney(
      input?.scholarshipsAndGrants,
      DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.scholarshipsAndGrants,
    ),
    familyContribution: cleanMoney(
      input?.familyContribution,
      DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.familyContribution,
    ),
    studentEarnings: cleanMoney(
      input?.studentEarnings,
      DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.studentEarnings,
    ),
    expectedBorrowing:
      input?.expectedBorrowing == null ? null : cleanMoney(input.expectedBorrowing),
    housing: input?.housing || DEFAULT_PARENT_SIMULATION_ASSUMPTIONS.housing,
    adjustedCost: input?.adjustedCost == null ? null : cleanMoney(input.adjustedCost),
  }
}

function pathwayTypeFromSimulation(pathway: SimulationPathway, career: CareerPath): PathwayType {
  if (pathway === 'apprenticeship') return 'apprenticeship'
  if (pathway === 'certification' || pathway === 'military' || pathway === 'direct_work')
    return 'certification'
  return career.pathwayType
}

function costMultiplier(assumptions: ParentSimulationAssumptions, career: CareerPath) {
  let multiplier = 1
  if (assumptions.institution === 'private') multiplier *= 1.45
  if (assumptions.institution === 'community_college') multiplier *= 0.68
  if (assumptions.institution === 'trade_school') multiplier *= 0.72
  if (assumptions.institution === 'none') multiplier *= 0.25
  if (assumptions.attendance === 'out_of_state' && assumptions.institution !== 'none')
    multiplier *= 1.22
  if (assumptions.pathway === 'certification')
    multiplier *= career.pathwayType === 'degree' ? 0.75 : 0.85
  if (assumptions.pathway === 'apprenticeship') multiplier *= 0.38
  if (assumptions.pathway === 'military') multiplier *= 0.3
  if (assumptions.pathway === 'direct_work') multiplier *= 0.22
  if (assumptions.housing === 'independent') multiplier *= 1.18
  return multiplier
}

function timelineAdjustment(assumptions: ParentSimulationAssumptions, career: CareerPath) {
  let timeline = career.timelineYears
  if (assumptions.pathway === 'certification') timeline = Math.max(1, timeline - 0.5)
  if (assumptions.pathway === 'apprenticeship') timeline = Math.max(1, Math.min(timeline, 3))
  if (assumptions.pathway === 'military') timeline = Math.max(2, timeline + 0.25)
  if (assumptions.pathway === 'direct_work') timeline = Math.max(0.5, timeline - 1)
  if (assumptions.institution === 'community_college' && career.pathwayType === 'degree')
    timeline += 0.25
  return Math.round(timeline * 10) / 10
}

function debtRiskFromDebtRatio(ratio: number): DebtRisk {
  if (ratio <= 0.18) return 'low'
  if (ratio <= 0.45) return 'medium'
  return 'high'
}

function demandOutlook(career: CareerPath): ParentSimulationCareerResult['demandOutlook'] {
  const tags = career.tags.join(' ').toLowerCase()
  if (
    tags.includes('cloud') ||
    tags.includes('data') ||
    tags.includes('security') ||
    tags.includes('health')
  )
    return 'strong'
  if (
    career.category === 'Technology' ||
    career.category === 'Healthcare' ||
    career.category === 'Skilled Trades'
  )
    return 'steady'
  return 'emerging'
}

function lowerCostPaths(career: CareerPath, assumptions: ParentSimulationAssumptions) {
  const paths: string[] = []
  if (assumptions.institution !== 'community_college' && career.pathwayType === 'degree')
    paths.push('Start at community college, then transfer once major fit is clearer.')
  if (career.certifications?.length)
    paths.push(
      `Earn an early credential such as ${career.certifications[0]} before committing to higher-cost training.`,
    )
  if (career.pathwayType === 'apprenticeship' || assumptions.pathway !== 'apprenticeship')
    paths.push('Compare apprenticeship or paid training options before borrowing.')
  if (assumptions.housing !== 'living_at_home')
    paths.push('Model living at home for the first year to reduce borrowing pressure.')
  return paths.slice(0, 4)
}

function scenarioIdForSharedScore(assumptions: ParentSimulationAssumptions) {
  if (assumptions.institution === 'community_college') return 'community_college_first' as const
  if (assumptions.pathway === 'certification') return 'certification_first' as const
  if (assumptions.studentEarnings > 0) return 'work_while_studying' as const
  if (assumptions.institution === 'private' || assumptions.institution === 'public')
    return 'four_year_direct' as const
  return 'baseline' as const
}

export function calculateParentSimulationCareer(
  career: CareerPath,
  rawAssumptions?: Partial<ParentSimulationAssumptions> | null,
): ParentSimulationCareerResult {
  const assumptions = normalizeParentSimulationAssumptions(rawAssumptions)
  const midpointBaseCost = Math.round((career.estimatedCostMin + career.estimatedCostMax) / 2)
  const estimatedCost =
    assumptions.adjustedCost ?? Math.round(midpointBaseCost * costMultiplier(assumptions, career))
  const contributions =
    assumptions.scholarshipsAndGrants + assumptions.familyContribution + assumptions.studentEarnings
  const estimatedOutOfPocketCost = Math.max(0, estimatedCost - assumptions.scholarshipsAndGrants)
  const estimatedDebt =
    assumptions.expectedBorrowing == null
      ? Math.max(0, estimatedCost - contributions)
      : assumptions.expectedBorrowing
  const expectedSalary = Math.round((career.startingSalaryMin + career.startingSalaryMax) / 2)
  const debtToIncomeRatio =
    expectedSalary > 0 ? Math.round((estimatedDebt / expectedSalary) * 100) / 100 : 1
  const debtRisk = debtRiskFromDebtRatio(debtToIncomeRatio)
  const timeline = timelineAdjustment(assumptions, career)
  const scenarioHealth = scoreCareerHealth(
    {
      ...career,
      pathwayType: pathwayTypeFromSimulation(assumptions.pathway, career),
      estimatedCostMin: Math.max(0, Math.round(estimatedCost * 0.8)),
      estimatedCostMax: estimatedCost,
      timelineYears: timeline,
      debtRisk,
    },
    scenarioIdForSharedScore(assumptions),
  )
  const debtPenalty = debtRisk === 'high' ? 8 : debtRisk === 'medium' ? 3 : 0
  const score = Math.round(
    clamp(scenarioHealth.score - debtPenalty + (demandOutlook(career) === 'strong' ? 3 : 0)),
  )
  const label = score >= 75 ? 'Strong Path' : score >= 55 ? 'Moderate Path' : 'Needs Adjustment'
  const certificationFriendly =
    career.pathwayType !== 'degree' || Boolean(career.certifications?.length)
  const alternativeEntryPath =
    ['certification', 'apprenticeship', 'military', 'direct_work'].includes(assumptions.pathway) ||
    career.pathwayType !== 'degree'

  return {
    careerId: career.id,
    careerTitle: career.title,
    category: career.category,
    careerHealthScore: score,
    careerHealthLabel: label,
    breakdown: scenarioHealth.breakdown,
    estimatedCost,
    estimatedOutOfPocketCost,
    estimatedDebt,
    entrySalaryMin: career.startingSalaryMin,
    entrySalaryMax: career.startingSalaryMax,
    expectedSalary,
    debtToIncomeRatio,
    debtRisk,
    timeToCareerReadinessYears: timeline,
    certificationFriendly,
    alternativeEntryPath,
    demandOutlook: demandOutlook(career),
    milestones: career.milestones.map((milestone) => `${milestone.stage}: ${milestone.title}`),
    lowerCostPaths: lowerCostPaths(career, assumptions),
    explanation: `${career.title} scores ${score}/100 because estimated debt is ${debtRisk}, readiness takes about ${timeline} years, and the modeled route is ${SIMULATION_PATHWAY_LABELS[assumptions.pathway].toLowerCase()}. Estimates are directional and should be refined with real program costs.`,
  }
}

export function calculateParentSimulation(
  careerIds: string[],
  rawAssumptions?: Partial<ParentSimulationAssumptions> | null,
): ParentSimulationSummary {
  const assumptions = normalizeParentSimulationAssumptions(rawAssumptions)
  const uniqueIds = Array.from(new Set(careerIds)).slice(0, 5)
  const results = uniqueIds
    .map((careerId) => CAREERS.find((career) => career.id === careerId))
    .filter((career): career is CareerPath => Boolean(career))
    .map((career) => calculateParentSimulationCareer(career, assumptions))

  return {
    assumptions,
    results,
    averageCareerHealthScore: results.length
      ? Math.round(
          results.reduce((sum, result) => sum + result.careerHealthScore, 0) / results.length,
        )
      : 0,
    totalEstimatedCost: results.reduce((sum, result) => sum + result.estimatedCost, 0),
    totalEstimatedDebt: results.reduce((sum, result) => sum + result.estimatedDebt, 0),
    generatedAt: new Date().toISOString(),
  }
}

export function duplicateSimulationTitle(title?: string | null) {
  const base = title?.trim() || 'Parent Simulation'
  return `${base} Copy`
}
