export type { UserRole } from './types/roles'
export { USER_ROLES } from './types/roles'

export { getSupabaseEnv } from './supabase/env'
export { createWebSupabaseClient } from './supabase/browser'
export { createWebSupabaseServerClient, type SupabaseCookieMethods } from './supabase/server'
export { createNextServerSupabaseClient } from './supabase/next-server'

export { computeAcademicHealth, normalizeGradeLevel, templatesForGrade } from './student-success'
export type { AcademicHealthInput, AcademicHealthResult, GradeLevel, SuccessTaskTemplate } from './student-success'
export { scoreCareerHealth, starterTasksForCareer } from './lifepath'
export type { CareerHealthBreakdown, CareerHealthResult, CareerPathForScoring, LifePathStarterTask, DebtRisk, LifePathScenarioId, PathwayType } from './lifepath'
export { computePortfolioSummary } from './portfolio'
export type { PortfolioSummary, PortfolioSummaryInput } from './portfolio'

export { CAREERS, CATEGORIES } from './career-catalog'
export type { CareerPath, CareerMilestone, CohortOpportunity } from './career-catalog'
