import { scoreCareerHealth, type CareerHealthBreakdown, type CareerHealthResult } from '@mysryear/shared'
import type { CareerPath, LifePathScenarioId } from './types'

export type HealthBreakdown = CareerHealthBreakdown
export type HealthResult = CareerHealthResult

export function scoreLifePath(career: CareerPath, scenario: LifePathScenarioId): HealthResult {
  return scoreCareerHealth(career, scenario)
}
