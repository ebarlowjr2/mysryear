export type ParentActionGrade = '9' | '10' | '11' | '12' | 'general'

export type ParentActionTemplate = {
  key: string
  grade: ParentActionGrade
  title: string
  description: string
  completionWindow: string
  deepLink?: string
}

export type ParentActionCompletion = {
  action_key: string
  status: 'completed' | 'dismissed' | string | null
  completed_at?: string | null
}

export type ParentActionItem = ParentActionTemplate & {
  completed: boolean
  completedAt: string | null
}

const ninth: ParentActionTemplate[] = [
  {
    key: 'g9_review_grad_requirements',
    grade: '9',
    title: 'Review graduation requirements and the four-year course plan.',
    description: 'Confirm the student understands required credits and has room for interests, CTE, AP, dual enrollment, or electives.',
    completionWindow: 'Fall semester',
    deepLink: '/dashboard',
  },
  {
    key: 'g9_report_card_routine',
    grade: '9',
    title: 'Establish a report-card check-in routine.',
    description: 'Pick a regular time each grading period to review grades, missing work, and support needs without waiting for a crisis.',
    completionWindow: 'Every grading period',
    deepLink: '/dashboard',
  },
  {
    key: 'g9_discuss_career_clusters',
    grade: '9',
    title: 'Discuss several career clusters without forcing a final choice.',
    description: 'Help the student explore possibilities while keeping curiosity high and pressure low.',
    completionWindow: 'Spring semester',
    deepLink: '/aura/lifepath',
  },
  {
    key: 'g9_family_cost_conversation',
    grade: '9',
    title: 'Begin the family conversation about pathway costs.',
    description: 'Talk about college, training, apprenticeships, military, and work options so cost is visible early.',
    completionWindow: 'Anytime this year',
    deepLink: '/aura/lifepath?mode=parent-simulation',
  },
  {
    key: 'g9_organize_portfolio_records',
    grade: '9',
    title: 'Help organize activities, awards, certifications, and achievements.',
    description: 'Create a habit of saving important proof now so applications are easier later.',
    completionWindow: 'Before summer',
    deepLink: '/portfolio',
  },
]

const tenth: ParentActionTemplate[] = [
  {
    key: 'g10_review_credits',
    grade: '10',
    title: 'Review credits and confirm graduation progress.',
    description: 'Use the latest transcript or progress report to spot gaps before junior year pressure ramps up.',
    completionWindow: 'Fall and spring',
    deepLink: '/dashboard',
  },
  {
    key: 'g10_compare_pathway_options',
    grade: '10',
    title: 'Compare AP, dual-enrollment, CTE, and certification options.',
    description: 'Help the student choose rigorous or career-aligned opportunities that fit their goals and workload.',
    completionWindow: 'Course selection season',
  },
  {
    key: 'g10_review_career_requirements',
    grade: '10',
    title: 'Review career options and education requirements.',
    description: 'Look at training time, cost, certifications, and salary so interests connect to real pathways.',
    completionWindow: 'Spring semester',
    deepLink: '/aura/lifepath',
  },
  {
    key: 'g10_plan_summer_experience',
    grade: '10',
    title: 'Help plan a meaningful summer experience.',
    description: 'Identify a camp, job shadow, internship, course, service project, or local opportunity tied to the student’s interests.',
    completionWindow: 'Winter to spring',
    deepLink: '/opportunities',
  },
  {
    key: 'g10_affordability_range',
    grade: '10',
    title: 'Establish an initial family affordability range.',
    description: 'Start discussing what feels realistic before applications and program decisions arrive.',
    completionWindow: 'Before junior year',
    deepLink: '/aura/lifepath?mode=parent-simulation',
  },
]

const eleventh: ParentActionTemplate[] = [
  {
    key: 'g11_build_shortlist',
    grade: '11',
    title: 'Help build a realistic post-graduation shortlist.',
    description: 'Compare college, trade, apprenticeship, military, certification, and direct-work options side by side.',
    completionWindow: 'Fall semester',
    deepLink: '/aura/lifepath',
  },
  {
    key: 'g11_review_testing_timeline',
    grade: '11',
    title: 'Review testing, application, visit, and entry timelines.',
    description: 'Create a shared calendar for SAT/ACT/ASVAB, campus visits, program deadlines, and recommendation requests.',
    completionWindow: 'Fall to winter',
  },
  {
    key: 'g11_parent_simulation',
    grade: '11',
    title: 'Complete a Parent Simulation comparing cost, debt, time, and salary.',
    description: 'Use A.U.R.A to compare scenarios before the student commits to a path.',
    completionWindow: 'Before senior year',
    deepLink: '/aura/lifepath?mode=parent-simulation',
  },
  {
    key: 'g11_organize_financial_aid',
    grade: '11',
    title: 'Start organizing financial-aid and scholarship information.',
    description: 'Gather household documents, scholarship requirements, deadlines, and recurring application materials.',
    completionWindow: 'Spring semester',
    deepLink: '/scholarships',
  },
  {
    key: 'g11_confirm_senior_courses',
    grade: '11',
    title: 'Confirm senior-year courses support preferred pathways.',
    description: 'Make sure the student’s schedule keeps options open and supports their most likely next step.',
    completionWindow: 'Course selection season',
  },
]

const twelfth: ParentActionTemplate[] = [
  {
    key: 'g12_deadline_calendar',
    grade: '12',
    title: 'Maintain a shared deadline calendar.',
    description: 'Track applications, scholarships, financial aid, program entry, housing, orientation, and decision dates.',
    completionWindow: 'All year',
    deepLink: '/planner',
  },
  {
    key: 'g12_funding_steps',
    grade: '12',
    title: 'Complete FAFSA or other applicable funding steps with the student.',
    description: 'Help the student understand funding forms, verification requests, and award letters.',
    completionWindow: 'As soon as forms open',
    deepLink: '/scholarships',
  },
  {
    key: 'g12_compare_net_cost',
    grade: '12',
    title: 'Compare offers by net cost, debt, time, and career outcome.',
    description: 'Look beyond acceptance letters and compare what each path really costs and leads to.',
    completionWindow: 'Decision season',
    deepLink: '/aura/lifepath?mode=parent-simulation',
  },
  {
    key: 'g12_confirm_transition_paperwork',
    grade: '12',
    title: 'Confirm graduation and post-graduation paperwork.',
    description: 'Check enrollment, hiring, training, military, housing, transcript, and final document steps.',
    completionWindow: 'Spring semester',
  },
  {
    key: 'g12_first_90_days_budget',
    grade: '12',
    title: 'Help create a transition budget and first-90-days plan.',
    description: 'Plan transportation, books/tools, housing, income, food, emergencies, and support systems.',
    completionWindow: 'Before graduation',
  },
]

const general: ParentActionTemplate[] = [
  {
    key: 'general_confirm_student_goals',
    grade: 'general',
    title: 'Confirm what support the student wants from you.',
    description: 'Ask where they want help: deadlines, cost comparisons, documents, encouragement, or accountability.',
    completionWindow: 'This month',
  },
  {
    key: 'general_review_latest_documents',
    grade: 'general',
    title: 'Review the latest academic or planning documents.',
    description: 'Upload or review transcripts, reports, resumes, certifications, or program materials together.',
    completionWindow: 'Every term',
    deepLink: '/dashboard',
  },
  {
    key: 'general_compare_pathway_costs',
    grade: 'general',
    title: 'Compare the cost and timeline of current pathway options.',
    description: 'Use LifePath or Parent Simulation to understand tradeoffs before decisions get urgent.',
    completionWindow: 'This term',
    deepLink: '/aura/lifepath?mode=parent-simulation',
  },
]

export function highSchoolGradeFromGraduationYear(
  graduationYear: number | null | undefined,
  asOf: Date = new Date(),
): ParentActionGrade {
  if (!graduationYear || !Number.isFinite(graduationYear)) return 'general'
  const calendarYear = asOf.getFullYear()
  const month = asOf.getMonth()
  const academicYearStart = month >= 7 ? calendarYear : calendarYear - 1
  const schoolYearEnd = academicYearStart + 1
  const grade = 12 - (graduationYear - schoolYearEnd)
  if (grade === 9 || grade === 10 || grade === 11 || grade === 12) return String(grade) as ParentActionGrade
  return 'general'
}

export function parentActionTemplatesForGrade(grade: ParentActionGrade): ParentActionTemplate[] {
  if (grade === '9') return ninth
  if (grade === '10') return tenth
  if (grade === '11') return eleventh
  if (grade === '12') return twelfth
  return general
}

export function parentActionTemplatesForStudent(input: {
  graduationYear?: number | null
  schoolLevel?: 'high_school' | 'college' | string | null
  asOf?: Date
}): ParentActionTemplate[] {
  if (input.schoolLevel === 'college') return general
  return parentActionTemplatesForGrade(highSchoolGradeFromGraduationYear(input.graduationYear, input.asOf))
}

export function mergeParentActionCompletions(
  templates: ParentActionTemplate[],
  completions: ParentActionCompletion[] = [],
): ParentActionItem[] {
  const byKey = new Map(completions.map((completion) => [completion.action_key, completion]))
  return templates.map((template) => {
    const completion = byKey.get(template.key)
    return {
      ...template,
      completed: completion?.status === 'completed',
      completedAt: completion?.completed_at || null,
    }
  })
}
