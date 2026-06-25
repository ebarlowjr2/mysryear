import { supabase } from '../lib/supabase'
import { getStudentSuccessSummary, type StudentSuccessSummary } from './academic'
import { listStudentPortfolio } from './portfolio'
import { averageCareerHealth, listSelectedLifePathCareers } from './lifepath'

export type DashboardMetrics = {
  scholarshipsCount: number
  upcomingDeadlines: number
  pendingTasks: number
  completedTasks: number
  academicHealthScore?: number
  academicHealthLabel?: string
  reportCardStatus?: 'updated' | 'missing'
  checklistDone?: number
  checklistTotal?: number
  lifePathCareersCount?: number
  lifePathAverageHealth?: number
  lifePathNextAction?: string
  parentNextAction?: string
  portfolioActivitiesCount?: number
  portfolioServiceHoursTotal?: number
  portfolioAchievementsCount?: number
  portfolioCertificationsCompleted?: number
  portfolioScholarshipReadinessScore?: number
  portfolioScholarshipReadinessLabel?: string
}

export type NextDeadline = {
  title: string
  dueDate: string
  category: string
} | null

export async function getStudentSuccessDashboard(userId: string): Promise<StudentSuccessSummary> {
  return getStudentSuccessSummary(userId)
}

export async function getDashboardMetrics(userId: string): Promise<DashboardMetrics> {
  const [scholarshipsResult, tasksResult] = await Promise.all([
    supabase
      .from('scraped_scholarships')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true),
    supabase
      .from('user_tasks')
      .select('id, status, due_date')
      .eq('user_id', userId)
  ])

  const scholarshipsCount = scholarshipsResult.count ?? 0

  const tasks = tasksResult.data ?? []
  const now = new Date()
  
  const pendingTasks = tasks.filter(t => t.status !== 'done').length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const upcomingDeadlines = tasks.filter(t => {
    if (!t.due_date) return false
    const dueDate = new Date(t.due_date)
    return dueDate >= now && t.status !== 'done'
  }).length

  const success = await getStudentSuccessSummary(userId)
  const portfolio = success.studentProfileId ? await listStudentPortfolio(success.studentProfileId) : null
  const lifePathCareers = success.studentProfileId ? await listSelectedLifePathCareers(success.studentProfileId) : []

  return {
    scholarshipsCount,
    upcomingDeadlines,
    pendingTasks,
    completedTasks,
    academicHealthScore: success.academicHealth.score,
    academicHealthLabel: success.academicHealth.label,
    reportCardStatus: success.reportCardStatus,
    checklistDone: success.checklist.done,
    checklistTotal: success.checklist.total,
    lifePathCareersCount: lifePathCareers.length || success.lifepath.selectedCareersCount,
    lifePathAverageHealth: averageCareerHealth(lifePathCareers),
    lifePathNextAction: lifePathCareers.length ? 'Open LifePath and review your next pathway milestone.' : 'Start LifePath by choosing career interests.',
    parentNextAction: success.academicHealth.nextAction,
    portfolioActivitiesCount: portfolio?.summary.activitiesCount || 0,
    portfolioServiceHoursTotal: portfolio?.summary.serviceHoursTotal || 0,
    portfolioAchievementsCount: portfolio?.summary.achievementsCount || 0,
    portfolioCertificationsCompleted: portfolio?.summary.certificationsCompleted || 0,
    portfolioScholarshipReadinessScore: portfolio?.summary.scholarshipReadinessScore || 0,
    portfolioScholarshipReadinessLabel: portfolio?.summary.scholarshipReadinessLabel || 'Needs Foundation',
  }
}

export async function getNextDeadline(userId: string): Promise<NextDeadline> {
  const now = new Date().toISOString().split('T')[0]
  
  const { data, error } = await supabase
    .from('user_tasks')
    .select('title, due_date, category')
    .eq('user_id', userId)
    .neq('status', 'done')
    .gte('due_date', now)
    .order('due_date', { ascending: true })
    .limit(1)
    .single()

  if (error || !data) return null

  return {
    title: data.title,
    dueDate: data.due_date,
    category: data.category
  }
}
