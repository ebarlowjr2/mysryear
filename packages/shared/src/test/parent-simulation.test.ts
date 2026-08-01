import { describe, expect, it } from 'vitest'
import {
  CAREERS,
  calculateParentSimulation,
  calculateParentSimulationCareer,
  normalizeParentSimulationAssumptions,
} from '..'

describe('parent simulation calculations', () => {
  it('normalizes missing assumptions with safe defaults', () => {
    const assumptions = normalizeParentSimulationAssumptions({
      scholarshipsAndGrants: -50,
      adjustedCost: undefined,
    })
    expect(assumptions.scholarshipsAndGrants).toBe(0)
    expect(assumptions.familyContribution).toBeGreaterThan(0)
    expect(assumptions.adjustedCost).toBeNull()
  })

  it('calculates scenario-specific cost, debt, and Career Health', () => {
    const career = CAREERS.find((item) => item.id === 'software-engineer')!
    const result = calculateParentSimulationCareer(career, {
      pathway: 'degree',
      institution: 'private',
      attendance: 'out_of_state',
      scholarshipsAndGrants: 1000,
      familyContribution: 1000,
      studentEarnings: 0,
      housing: 'independent',
    })

    expect(result.estimatedCost).toBeGreaterThan(career.estimatedCostMin)
    expect(result.estimatedDebt).toBeGreaterThan(0)
    expect(result.debtRisk).toBe('high')
    expect(result.careerHealthScore).toBeLessThan(75)
    expect(result.explanation.toLowerCase()).toContain('software')
  })

  it('rewards lower-cost certification or apprenticeship assumptions', () => {
    const career = CAREERS.find((item) => item.id === 'cybersecurity-analyst')!
    const highCost = calculateParentSimulationCareer(career, {
      pathway: 'degree',
      institution: 'private',
      attendance: 'out_of_state',
      scholarshipsAndGrants: 0,
      familyContribution: 0,
      studentEarnings: 0,
      housing: 'independent',
    })
    const lowerCost = calculateParentSimulationCareer(career, {
      pathway: 'certification',
      institution: 'community_college',
      attendance: 'in_state',
      scholarshipsAndGrants: 5000,
      familyContribution: 2000,
      studentEarnings: 4000,
      housing: 'living_at_home',
    })

    expect(lowerCost.estimatedDebt).toBeLessThan(highCost.estimatedDebt)
    expect(lowerCost.careerHealthScore).toBeGreaterThan(highCost.careerHealthScore)
  })

  it('dedupes career selections and ignores missing catalog ids', () => {
    const summary = calculateParentSimulation(['nurse', 'nurse', 'missing-career'])
    expect(summary.results).toHaveLength(1)
    expect(summary.averageCareerHealthScore).toBeGreaterThan(0)
  })
})
