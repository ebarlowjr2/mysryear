export type PortfolioSummaryInput = {
  activitiesCount: number
  serviceHoursTotal: number
  achievementsCount: number
  certificationsCompleted: number
  proofDocumentsCount?: number
}

export type PortfolioSummary = Required<PortfolioSummaryInput> & {
  readinessLabel: 'Getting Started' | 'Building Momentum' | 'Portfolio Ready'
  nextAction: string
  scholarshipReadinessScore: number
  scholarshipReadinessLabel: 'Needs Foundation' | 'Getting Scholarship Ready' | 'Scholarship Ready'
  scholarshipReadinessChecklist: Array<{ label: string; complete: boolean }>
  missingScholarshipItems: string[]
}

export function computePortfolioSummary(input: PortfolioSummaryInput): PortfolioSummary {
  const activitiesCount = Math.max(0, input.activitiesCount || 0)
  const serviceHoursTotal = Math.max(0, input.serviceHoursTotal || 0)
  const achievementsCount = Math.max(0, input.achievementsCount || 0)
  const certificationsCompleted = Math.max(0, input.certificationsCompleted || 0)
  const proofDocumentsCount = Math.max(0, input.proofDocumentsCount || 0)

  const scholarshipReadinessChecklist = [
    { label: 'At least one activity or leadership entry', complete: activitiesCount > 0 },
    { label: 'At least 10 volunteer/service hours', complete: serviceHoursTotal >= 10 },
    { label: 'At least one award or achievement', complete: achievementsCount > 0 },
    { label: 'At least one certification or skill credential', complete: certificationsCompleted > 0 },
    { label: 'At least one proof document attached', complete: proofDocumentsCount > 0 },
  ]

  const signalCount = scholarshipReadinessChecklist.filter((item) => item.complete).length
  const scholarshipReadinessScore = Math.round((signalCount / scholarshipReadinessChecklist.length) * 100)

  let readinessLabel: PortfolioSummary['readinessLabel'] = 'Getting Started'
  if (signalCount >= 4) readinessLabel = 'Portfolio Ready'
  else if (signalCount >= 2) readinessLabel = 'Building Momentum'

  let scholarshipReadinessLabel: PortfolioSummary['scholarshipReadinessLabel'] = 'Needs Foundation'
  if (scholarshipReadinessScore >= 80) scholarshipReadinessLabel = 'Scholarship Ready'
  else if (scholarshipReadinessScore >= 40) scholarshipReadinessLabel = 'Getting Scholarship Ready'

  const missingScholarshipItems = scholarshipReadinessChecklist
    .filter((item) => !item.complete)
    .map((item) => item.label)

  let nextAction = 'Add one activity, award, service entry, certification, or proof document.'
  if (activitiesCount === 0) nextAction = 'Add your first club, job, sport, or leadership activity.'
  else if (serviceHoursTotal < 10) nextAction = 'Log recent volunteer or service hours.'
  else if (achievementsCount === 0) nextAction = 'Add an award, honor, or achievement.'
  else if (certificationsCompleted === 0) nextAction = 'Add a completed or planned certification.'
  else if (proofDocumentsCount === 0) nextAction = 'Attach proof, certificates, letters, or screenshots to your portfolio entries.'

  return {
    activitiesCount,
    serviceHoursTotal,
    achievementsCount,
    certificationsCompleted,
    proofDocumentsCount,
    readinessLabel,
    nextAction,
    scholarshipReadinessScore,
    scholarshipReadinessLabel,
    scholarshipReadinessChecklist,
    missingScholarshipItems,
  }
}
