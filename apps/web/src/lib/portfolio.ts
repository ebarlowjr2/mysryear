import { computePortfolioSummary } from '@mysryear/shared'

type SupabaseLike = {
  from(table: string): {
    select(columns?: string, options?: { count?: 'exact'; head?: boolean }): unknown
    insert(values: unknown): unknown
    update(values: unknown): unknown
    delete(): unknown
  }
}

export type PortfolioKind = 'activities' | 'serviceHours' | 'achievements' | 'certifications'

export const portfolioTables: Record<PortfolioKind, string> = {
  activities: 'student_activities',
  serviceHours: 'student_service_hours',
  achievements: 'student_achievements',
  certifications: 'student_certifications',
}

export function computeStudentPortfolioSummary(input: {
  activities: unknown[]
  serviceHours: Array<{ hours?: number | null }>
  achievements: unknown[]
  certifications: Array<{ status?: string | null }>
}) {
  return computePortfolioSummary({
    activitiesCount: input.activities.length,
    serviceHoursTotal: input.serviceHours.reduce((sum, row) => sum + Number(row.hours || 0), 0),
    achievementsCount: input.achievements.length,
    certificationsCompleted: input.certifications.filter((row) => row.status === 'completed').length,
  })
}

// Named app-layer helper exports for future server/client consolidation.
export const listStudentActivities = (supabase: SupabaseLike) => supabase.from(portfolioTables.activities).select('*')
export const createStudentActivity = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.activities).insert(values)
export const updateStudentActivity = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.activities).update(values)
export const deleteStudentActivity = (supabase: SupabaseLike) => supabase.from(portfolioTables.activities).delete()

export const listStudentServiceHours = (supabase: SupabaseLike) => supabase.from(portfolioTables.serviceHours).select('*')
export const createStudentServiceHour = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.serviceHours).insert(values)
export const updateStudentServiceHour = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.serviceHours).update(values)
export const deleteStudentServiceHour = (supabase: SupabaseLike) => supabase.from(portfolioTables.serviceHours).delete()

export const listStudentAchievements = (supabase: SupabaseLike) => supabase.from(portfolioTables.achievements).select('*')
export const createStudentAchievement = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.achievements).insert(values)
export const updateStudentAchievement = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.achievements).update(values)
export const deleteStudentAchievement = (supabase: SupabaseLike) => supabase.from(portfolioTables.achievements).delete()

export const listStudentCertifications = (supabase: SupabaseLike) => supabase.from(portfolioTables.certifications).select('*')
export const createStudentCertification = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.certifications).insert(values)
export const updateStudentCertification = (supabase: SupabaseLike, values: unknown) => supabase.from(portfolioTables.certifications).update(values)
export const deleteStudentCertification = (supabase: SupabaseLike) => supabase.from(portfolioTables.certifications).delete()
