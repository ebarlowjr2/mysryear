export type PortfolioSummaryInput = {
  activitiesCount: number
  serviceHoursTotal: number
  achievementsCount: number
  certificationsCompleted: number
}

export type PortfolioSummary = PortfolioSummaryInput & {
  readinessLabel: 'Getting Started' | 'Building Momentum' | 'Portfolio Ready'
  nextAction: string
}

export function computePortfolioSummary(input: PortfolioSummaryInput): PortfolioSummary {
  const activitiesCount = Math.max(0, input.activitiesCount || 0)
  const serviceHoursTotal = Math.max(0, input.serviceHoursTotal || 0)
  const achievementsCount = Math.max(0, input.achievementsCount || 0)
  const certificationsCompleted = Math.max(0, input.certificationsCompleted || 0)

  const signalCount = [
    activitiesCount > 0,
    serviceHoursTotal >= 5,
    achievementsCount > 0,
    certificationsCompleted > 0,
  ].filter(Boolean).length

  let readinessLabel: PortfolioSummary['readinessLabel'] = 'Getting Started'
  if (signalCount >= 3) readinessLabel = 'Portfolio Ready'
  else if (signalCount >= 2) readinessLabel = 'Building Momentum'

  let nextAction = 'Add one activity, award, service entry, or certification.'
  if (activitiesCount === 0) nextAction = 'Add your first club, job, sport, or leadership activity.'
  else if (serviceHoursTotal < 5) nextAction = 'Log recent volunteer or service hours.'
  else if (achievementsCount === 0) nextAction = 'Add an award, honor, or achievement.'
  else if (certificationsCompleted === 0) nextAction = 'Add a completed or planned certification.'

  return {
    activitiesCount,
    serviceHoursTotal,
    achievementsCount,
    certificationsCompleted,
    readinessLabel,
    nextAction,
  }
}
