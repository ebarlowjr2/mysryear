export type DebtRisk = 'low' | 'medium' | 'high'

export type PathwayType = 'degree' | 'certification' | 'apprenticeship' | 'mixed'

export type CareerMilestone = {
  title: string
  description: string
  stage: string
}

export type CohortOpportunity = {
  name: string
  type: string
  description: string
  link?: string
}

export type CareerPath = {
  id: string
  title: string
  category: string
  description: string
  pathwayType: PathwayType
  timelineYears: number
  estimatedCostMin: number
  estimatedCostMax: number
  startingSalaryMin: number
  startingSalaryMax: number
  debtRisk: DebtRisk
  certifications?: string[]
  milestones: CareerMilestone[]
  recommendations: string[]
  cohorts: CohortOpportunity[]
  tags: string[]
}

export type LifePathScenarioId =
  | 'baseline'
  | 'community_college_first'
  | 'four_year_direct'
  | 'work_while_studying'
  | 'certification_first'

export type LifePathScenario = {
  id: LifePathScenarioId
  label: string
  description: string
}
