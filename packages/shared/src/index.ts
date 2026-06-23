export type { UserRole } from './types/roles'
export { USER_ROLES } from './types/roles'

export { getSupabaseEnv } from './supabase/env'
export { createWebSupabaseClient } from './supabase/browser'
export { createWebSupabaseServerClient, type SupabaseCookieMethods } from './supabase/server'
export { createNextServerSupabaseClient } from './supabase/next-server'

export { computeAcademicHealth, normalizeGradeLevel, templatesForGrade } from './student-success'
export type { AcademicHealthInput, AcademicHealthResult, GradeLevel, SuccessTaskTemplate } from './student-success'
export { scoreCareerHealth } from './lifepath'
export type { CareerHealthBreakdown, CareerHealthResult, CareerPathForScoring, DebtRisk, LifePathScenarioId, PathwayType } from './lifepath'
export { computePortfolioSummary } from './portfolio'
export type { PortfolioSummary, PortfolioSummaryInput } from './portfolio'
