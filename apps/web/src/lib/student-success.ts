export type GradeLevel = '9' | '10' | '11'

export type SuccessTaskTemplate = {
  title: string
  description: string
  grade_level: GradeLevel
  category: string
  upload_required?: boolean
}

export function templatesForGrade(grade: GradeLevel): SuccessTaskTemplate[] {
  const ninth: SuccessTaskTemplate[] = [
    {
      title: 'Upload first report card',
      description: 'Start your academic record vault with a baseline report card.',
      grade_level: '9',
      category: 'Academics',
      upload_required: true,
    },
    {
      title: 'Select top 5 LifePath careers',
      description: 'Pick 1–5 careers to explore so A.U.R.A can guide your path.',
      grade_level: '9',
      category: 'LifePath',
    },
    {
      title: 'Join one club or activity',
      description: 'Pick something you can stick with through the year.',
      grade_level: '9',
      category: 'Activities',
    },
    {
      title: 'Start your student resume',
      description: 'Add clubs, leadership, volunteering, and awards as you go.',
      grade_level: '9',
      category: 'Portfolio',
    },
    {
      title: 'Complete one career exploration activity',
      description: 'Watch a career day talk, job shadow, or interview someone.',
      grade_level: '9',
      category: 'LifePath',
    },
    {
      title: 'Track first volunteer/service activity',
      description: 'Log hours, what you did, and who can verify it later.',
      grade_level: '9',
      category: 'Service',
    },
    {
      title: 'Complete a basic financial literacy activity',
      description: 'Learn the basics of budgeting, saving, and student debt.',
      grade_level: '9',
      category: 'Life Skills',
    },
  ]

  const tenth: SuccessTaskTemplate[] = [
    {
      title: 'Upload transcript or progress report',
      description: 'Keep your records current for planning and scholarships later.',
      grade_level: '10',
      category: 'Academics',
      upload_required: true,
    },
    {
      title: 'Review LifePath career choices',
      description: 'Update your top interests based on what you learned this year.',
      grade_level: '10',
      category: 'LifePath',
    },
    {
      title: 'Explore PSAT / pre-ACT prep',
      description: 'Identify test options and start a light practice plan.',
      grade_level: '10',
      category: 'Testing',
    },
    {
      title: 'Complete one career skill course',
      description: 'Pick a short online course that builds a portfolio skill.',
      grade_level: '10',
      category: 'Skills',
    },
    {
      title: 'Attend one career event or workshop',
      description: 'Career fair, STEM event, local trade day, or online webinar.',
      grade_level: '10',
      category: 'LifePath',
    },
    {
      title: 'Start summer program/internship search',
      description: 'Find 2–3 programs and note deadlines.',
      grade_level: '10',
      category: 'Opportunities',
    },
    {
      title: 'Add activities/awards to portfolio',
      description: 'Keep your resume updated so junior year is easier.',
      grade_level: '10',
      category: 'Portfolio',
    },
  ]

  const eleventh: SuccessTaskTemplate[] = [
    {
      title: 'Upload transcript',
      description: 'Junior-year transcript is a key planning document.',
      grade_level: '11',
      category: 'Academics',
      upload_required: true,
    },
    {
      title: 'Build college/certification/trade shortlist',
      description: 'List realistic options aligned with your LifePath.',
      grade_level: '11',
      category: 'Planning',
    },
    {
      title: 'Start SAT/ACT/ASVAB planning',
      description: 'Pick a date range and build a basic study plan.',
      grade_level: '11',
      category: 'Testing',
    },
    {
      title: 'Request recommendation contacts',
      description: 'Identify teachers/mentors and note their emails.',
      grade_level: '11',
      category: 'Applications',
    },
    {
      title: 'Begin scholarship preparation',
      description: 'Set up documents and a shortlist; don’t wait for senior year.',
      grade_level: '11',
      category: 'Scholarships',
    },
    {
      title: 'Update resume',
      description: 'Refresh your resume and add measurable impact where possible.',
      grade_level: '11',
      category: 'Portfolio',
    },
    {
      title: 'Identify internships / job shadowing',
      description: 'Pick 1–2 options and list next steps.',
      grade_level: '11',
      category: 'Opportunities',
    },
  ]

  if (grade === '9') return ninth
  if (grade === '10') return tenth
  return eleventh
}

export function computeAcademicHealth(input: {
  gpa: number | null
  hasRecentRecord: boolean
  checklistDone: number
  checklistTotal: number
}) {
  const { gpa, hasRecentRecord, checklistDone, checklistTotal } = input
  let score = 0

  if (typeof gpa === 'number') {
    if (gpa >= 3.5) score += 40
    else if (gpa >= 3.0) score += 30
    else if (gpa >= 2.5) score += 20
    else score += 10
  } else {
    score += 10
  }

  score += hasRecentRecord ? 25 : 5

  const pct = checklistTotal > 0 ? checklistDone / checklistTotal : 0
  score += Math.round(pct * 35)

  const label = score >= 75 ? 'Strong' : score >= 50 ? 'Watch Closely' : 'Needs Attention'
  const nextAction =
    !hasRecentRecord
      ? 'Upload your latest report card or progress report.'
      : typeof gpa !== 'number'
        ? 'Add your GPA from your latest record (optional) to improve tracking.'
        : pct < 0.4
          ? 'Knock out 1–2 checklist items this week to build momentum.'
          : 'Keep going—update records each grading period.'

  return { score, label, nextAction }
}

