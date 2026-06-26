export type DebtRisk = 'low' | 'medium' | 'high'
export type PathwayType = 'degree' | 'certification' | 'apprenticeship' | 'mixed'
export type LifePathScenarioId = 'baseline' | 'community_college_first' | 'four_year_direct' | 'work_while_studying' | 'certification_first'

export type CareerPathForScoring = {
  pathwayType: PathwayType
  timelineYears: number
  estimatedCostMin: number
  estimatedCostMax: number
  debtRisk: DebtRisk
  cohorts: unknown[]
}

export type CareerHealthBreakdown = {
  readiness: number
  affordability: number
  momentum: number
  support: number
  debtImpact: number
}

export type CareerHealthResult = {
  score: number
  label: 'Strong Path' | 'Moderate Path' | 'Needs Adjustment'
  breakdown: CareerHealthBreakdown
  debtRisk: DebtRisk
  adjustedCostMin: number
  adjustedCostMax: number
  adjustedTimelineYears: number
}

const WEIGHTS: Record<keyof CareerHealthBreakdown, number> = {
  readiness: 25,
  affordability: 25,
  momentum: 20,
  support: 15,
  debtImpact: 15,
}

function clamp(n: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, n))
}

function riskToDebtScore(risk: DebtRisk) {
  if (risk === 'low') return 85
  if (risk === 'medium') return 60
  return 35
}

function baseAffordability(costMax: number) {
  if (costMax <= 12000) return 85
  if (costMax <= 30000) return 70
  if (costMax <= 70000) return 55
  if (costMax <= 120000) return 42
  return 30
}

function baseMomentum(timelineYears: number) {
  if (timelineYears <= 1.5) return 85
  if (timelineYears <= 2.5) return 72
  if (timelineYears <= 4) return 58
  if (timelineYears <= 6) return 45
  return 35
}

function baseReadiness(pathwayType: PathwayType) {
  if (pathwayType === 'apprenticeship') return 75
  if (pathwayType === 'certification') return 70
  if (pathwayType === 'mixed') return 72
  return 68
}

function baseSupport(cohortCount: number) {
  if (cohortCount >= 3) return 80
  if (cohortCount === 2) return 72
  if (cohortCount === 1) return 64
  return 55
}

export function scoreCareerHealth(career: CareerPathForScoring, scenario: LifePathScenarioId): CareerHealthResult {
  let costMin = career.estimatedCostMin
  let costMax = career.estimatedCostMax
  let timeline = career.timelineYears
  let debtRisk: DebtRisk = career.debtRisk

  if (scenario === 'community_college_first') {
    costMin *= 0.75
    costMax *= 0.7
    timeline += career.pathwayType === 'degree' ? 0.25 : 0
    if (debtRisk === 'high') debtRisk = 'medium'
  }
  if (scenario === 'four_year_direct') {
    costMin *= 1.05
    costMax *= 1.1
    if (career.pathwayType === 'degree') timeline = Math.max(timeline, 4)
    if (debtRisk === 'medium') debtRisk = 'high'
  }
  if (scenario === 'work_while_studying') {
    costMin *= 0.9
    costMax *= 0.85
    timeline += 0.25
    if (debtRisk === 'high') debtRisk = 'medium'
  }
  if (scenario === 'certification_first') {
    if (career.pathwayType !== 'degree') {
      costMin *= 0.85
      costMax *= 0.8
      timeline = Math.max(1, timeline - 0.25)
      if (debtRisk === 'medium') debtRisk = 'low'
    } else {
      costMin *= 0.95
      costMax *= 0.92
      timeline += 0.1
    }
  }

  const breakdown: CareerHealthBreakdown = {
    readiness: clamp(baseReadiness(career.pathwayType) + (scenario === 'four_year_direct' ? 4 : 0)),
    affordability: clamp(baseAffordability(costMax) + (scenario === 'work_while_studying' ? 5 : 0)),
    momentum: clamp(baseMomentum(timeline) + (scenario === 'certification_first' ? 4 : 0)),
    support: clamp(baseSupport(career.cohorts.length)),
    debtImpact: clamp(riskToDebtScore(debtRisk)),
  }

  const weighted =
    (breakdown.readiness * WEIGHTS.readiness +
      breakdown.affordability * WEIGHTS.affordability +
      breakdown.momentum * WEIGHTS.momentum +
      breakdown.support * WEIGHTS.support +
      breakdown.debtImpact * WEIGHTS.debtImpact) /
    100

  const score = Math.round(clamp(weighted))
  const label = score >= 75 ? 'Strong Path' : score >= 55 ? 'Moderate Path' : 'Needs Adjustment'

  return {
    score,
    label,
    breakdown,
    debtRisk,
    adjustedCostMin: Math.round(costMin),
    adjustedCostMax: Math.round(costMax),
    adjustedTimelineYears: Math.round(timeline * 10) / 10,
  }
}

export type LifePathStarterTask = {
  title: string
  description: string
  career_id: string
}

export function starterTasksForCareer(career: { id: string; milestones: Array<{ stage: string; title: string; description: string }> }): LifePathStarterTask[] {
  return career.milestones.map((milestone, index) => ({
    career_id: career.id,
    title: `${milestone.stage}: ${milestone.title}`,
    description: milestone.description || `Complete milestone ${index + 1} for this career path.`,
  }))
}
