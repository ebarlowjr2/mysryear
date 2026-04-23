import type { LifePathScenario, LifePathScenarioId } from './types'

export const SCENARIOS: LifePathScenario[] = [
  {
    id: 'baseline',
    label: 'Baseline',
    description: 'A balanced plan using the most common pathway for this career.',
  },
  {
    id: 'community_college_first',
    label: 'Community College First',
    description: 'Reduce cost by starting at community college then transferring (if applicable).',
  },
  {
    id: 'four_year_direct',
    label: '4-Year Direct Path',
    description: 'Go directly into a 4-year program (higher cost, sometimes stronger readiness).',
  },
  {
    id: 'work_while_studying',
    label: 'Work While Studying',
    description: 'Work part-time while training to reduce borrowing and build momentum.',
  },
  {
    id: 'certification_first',
    label: 'Certification First',
    description: 'Start with a certification/credential to enter faster and lower debt risk.',
  },
]

export function isScenarioId(value: string): value is LifePathScenarioId {
  return SCENARIOS.some((s) => s.id === value)
}
