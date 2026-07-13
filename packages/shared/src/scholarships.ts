export type ScholarshipRequirementType =
  | 'minimum_gpa'
  | 'volunteer_hours'
  | 'certification'
  | 'essay'
  | 'transcript'
  | 'recommendation'
  | 'fafsa'
  | 'test_score'
  | 'portfolio_upload'
  | 'career_interest'
  | 'state'
  | 'grade_level'

export type ScholarshipStatus = 'suggested' | 'saved' | 'applying' | 'submitted' | 'awarded' | 'rejected'

export type ScholarshipForMatching = {
  id: string
  title: string
  organization?: string | null
  description?: string | null
  amount?: number | null
  deadline?: string | null
  application_url?: string | null
  state?: string | null
  country?: string | null
  minimum_gpa?: number | null
  minimum_grade_level?: number | null
  maximum_grade_level?: number | null
  financial_need_required?: boolean | null
  essay_required?: boolean | null
  recommendation_required?: boolean | null
  volunteer_required?: boolean | null
  certification_tags?: string[] | null
  career_tags?: string[] | null
  major_tags?: string[] | null
  skill_tags?: string[] | null
}

export type ScholarshipRequirement = {
  requirement_type: ScholarshipRequirementType | string
  requirement_key?: string | null
  requirement_label: string
  required_value?: string | null
  numeric_value?: number | null
  required?: boolean | null
}

export type StudentScholarshipProfile = {
  academicHealthScore: number
  careerHealthAverage?: number | null
  portfolioReadinessScore: number
  gpa?: number | null
  gradeLevel?: number | null
  graduationYear?: number | null
  state?: string | null
  volunteerHours: number
  activitiesCount: number
  achievementsCount: number
  certifications: string[]
  careerInterests: string[]
  careerCategories: string[]
  uploadedDocumentContexts: string[]
  hasResume: boolean
  hasTranscript: boolean
  hasRecommendation: boolean
  hasFafsa: boolean
}

export type ScholarshipMatchResult = {
  scholarshipId: string
  matchScore: number
  readinessPercentage: number
  matchReason: string[]
  missingRequirements: string[]
}

export type ScholarshipReadinessResult = {
  percentage: number
  label: 'Needs Foundation' | 'Building Scholarship Readiness' | 'Scholarship Ready'
  strengths: string[]
  missingRequirements: string[]
  topMissingRequirement: string | null
}

function clamp(value: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value))
}

function normalize(value: string | null | undefined) {
  return (value || '').trim().toLowerCase()
}

function includesAny(source: string[], targets: string[]) {
  const normalizedSource = new Set(source.map((item) => normalize(item)).filter(Boolean))
  return targets.map((item) => normalize(item)).some((item) => normalizedSource.has(item))
}

function tags(value: string[] | null | undefined) {
  return (value || []).map((item) => String(item).trim()).filter(Boolean)
}

export function identifyMissingRequirements(
  student: StudentScholarshipProfile,
  scholarship: ScholarshipForMatching,
  requirements: ScholarshipRequirement[] = [],
): string[] {
  const missing = new Set<string>()

  if (typeof scholarship.minimum_gpa === 'number' && (student.gpa == null || student.gpa < scholarship.minimum_gpa)) {
    missing.add(`GPA ${scholarship.minimum_gpa.toFixed(1)}+`)
  }
  if (typeof scholarship.minimum_grade_level === 'number' && (student.gradeLevel == null || student.gradeLevel < scholarship.minimum_grade_level)) {
    missing.add(`Grade ${scholarship.minimum_grade_level}+`)
  }
  if (typeof scholarship.maximum_grade_level === 'number' && (student.gradeLevel == null || student.gradeLevel > scholarship.maximum_grade_level)) {
    missing.add(`Grade ${scholarship.maximum_grade_level} or below`)
  }
  if (scholarship.state && student.state && normalize(scholarship.state) !== normalize(student.state)) {
    missing.add(`${scholarship.state} residency`)
  }
  if (scholarship.volunteer_required && student.volunteerHours <= 0) missing.add('Volunteer/service hours')
  if (scholarship.essay_required && !student.uploadedDocumentContexts.includes('scholarship_essay')) missing.add('Scholarship essay')
  if (scholarship.recommendation_required && !student.hasRecommendation) missing.add('Recommendation letter')

  const requiredCerts = tags(scholarship.certification_tags)
  if (requiredCerts.length > 0 && !includesAny(student.certifications, requiredCerts)) {
    missing.add(`Certification: ${requiredCerts[0]}`)
  }

  for (const requirement of requirements) {
    if (requirement.required === false) continue
    const label = requirement.requirement_label || requirement.requirement_type
    if (requirement.requirement_type === 'minimum_gpa' && typeof requirement.numeric_value === 'number' && (student.gpa == null || student.gpa < requirement.numeric_value)) missing.add(label)
    if (requirement.requirement_type === 'volunteer_hours' && typeof requirement.numeric_value === 'number' && student.volunteerHours < requirement.numeric_value) missing.add(label)
    if (requirement.requirement_type === 'certification' && requirement.required_value && !includesAny(student.certifications, [requirement.required_value])) missing.add(label)
    if (requirement.requirement_type === 'essay' && !student.uploadedDocumentContexts.includes('scholarship_essay')) missing.add(label)
    if (requirement.requirement_type === 'transcript' && !student.hasTranscript) missing.add(label)
    if (requirement.requirement_type === 'recommendation' && !student.hasRecommendation) missing.add(label)
    if (requirement.requirement_type === 'fafsa' && !student.hasFafsa) missing.add(label)
    if (requirement.requirement_type === 'portfolio_upload' && !student.hasResume) missing.add(label)
    if (requirement.requirement_type === 'career_interest' && requirement.required_value && !includesAny([...student.careerInterests, ...student.careerCategories], [requirement.required_value])) missing.add(label)
  }

  return Array.from(missing)
}

export function explainScholarshipMatch(
  student: StudentScholarshipProfile,
  scholarship: ScholarshipForMatching,
  missingRequirements: string[] = [],
): string[] {
  const reasons: string[] = []

  if (typeof scholarship.minimum_gpa === 'number' && typeof student.gpa === 'number' && student.gpa >= scholarship.minimum_gpa) reasons.push(`GPA qualifies (${student.gpa.toFixed(2)})`)
  if (student.volunteerHours >= 10) reasons.push(`${student.volunteerHours} volunteer/service hours logged`)
  if (student.certifications.length > 0) reasons.push(`${student.certifications.length} certification signal${student.certifications.length === 1 ? '' : 's'}`)
  if (student.activitiesCount > 0) reasons.push(`${student.activitiesCount} activity/leadership entr${student.activitiesCount === 1 ? 'y' : 'ies'}`)
  if (student.achievementsCount > 0) reasons.push(`${student.achievementsCount} award/achievement entr${student.achievementsCount === 1 ? 'y' : 'ies'}`)
  if (student.hasTranscript) reasons.push('Transcript uploaded')
  if (student.hasResume) reasons.push('Resume or portfolio proof uploaded')
  if (scholarship.state && student.state && normalize(scholarship.state) === normalize(student.state)) reasons.push(`Matches ${scholarship.state} location`)

  const scholarshipTags = [...tags(scholarship.career_tags), ...tags(scholarship.major_tags), ...tags(scholarship.skill_tags)]
  const studentTags = [...student.careerInterests, ...student.careerCategories, ...student.certifications]
  const matchingTags = scholarshipTags.filter((tag) => includesAny(studentTags, [tag]))
  if (matchingTags.length > 0) reasons.push(`Matches ${matchingTags.slice(0, 3).join(', ')}`)

  if (reasons.length === 0 && missingRequirements.length === 0) reasons.push('Broad eligibility based on current profile')
  if (reasons.length === 0) reasons.push('Potential fit, but profile needs more scholarship signals')

  return reasons.slice(0, 8)
}

export function computeScholarshipMatch(
  student: StudentScholarshipProfile,
  scholarship: ScholarshipForMatching,
  requirements: ScholarshipRequirement[] = [],
): ScholarshipMatchResult {
  const missingRequirements = identifyMissingRequirements(student, scholarship, requirements)
  let score = 20

  score += Math.round(student.academicHealthScore * 0.18)
  score += Math.round(student.portfolioReadinessScore * 0.18)
  score += Math.round((student.careerHealthAverage || 50) * 0.08)

  if (typeof scholarship.minimum_gpa === 'number') {
    if (typeof student.gpa === 'number' && student.gpa >= scholarship.minimum_gpa) score += 12
    else score -= 18
  }

  if (scholarship.state) {
    if (!student.state) score -= 3
    else if (normalize(scholarship.state) === normalize(student.state)) score += 8
    else score -= 18
  }

  const scholarshipCareerTags = [...tags(scholarship.career_tags), ...tags(scholarship.major_tags), ...tags(scholarship.skill_tags)]
  if (scholarshipCareerTags.length > 0) {
    if (includesAny([...student.careerInterests, ...student.careerCategories, ...student.certifications], scholarshipCareerTags)) score += 15
    else score -= 5
  }

  if (scholarship.volunteer_required) score += student.volunteerHours > 0 ? 7 : -10
  else if (student.volunteerHours >= 10) score += 4

  if (scholarship.certification_tags?.length) score += includesAny(student.certifications, scholarship.certification_tags) ? 10 : -8
  if (scholarship.essay_required) score += student.uploadedDocumentContexts.includes('scholarship_essay') ? 4 : -5
  if (scholarship.recommendation_required) score += student.hasRecommendation ? 4 : -5

  score -= Math.min(25, missingRequirements.length * 5)

  const matchScore = Math.round(clamp(score))
  const readinessPercentage = Math.round(clamp(100 - missingRequirements.length * 12 + matchScore * 0.15))
  const matchReason = explainScholarshipMatch(student, scholarship, missingRequirements)

  return { scholarshipId: scholarship.id, matchScore, readinessPercentage, matchReason, missingRequirements }
}

export function computeScholarshipReadiness(input: {
  student: StudentScholarshipProfile
  matches?: ScholarshipMatchResult[]
}): ScholarshipReadinessResult {
  const { student, matches = [] } = input
  const checks = [
    { label: 'GPA added', complete: typeof student.gpa === 'number' },
    { label: 'Transcript uploaded', complete: student.hasTranscript },
    { label: 'Resume uploaded', complete: student.hasResume },
    { label: 'At least 10 volunteer hours', complete: student.volunteerHours >= 10 },
    { label: 'Activity/leadership entered', complete: student.activitiesCount > 0 },
    { label: 'Award/achievement entered', complete: student.achievementsCount > 0 },
    { label: 'Certification or credential entered', complete: student.certifications.length > 0 },
    { label: 'Career interests selected', complete: student.careerInterests.length > 0 || student.careerCategories.length > 0 },
  ]

  const base = Math.round((checks.filter((check) => check.complete).length / checks.length) * 100)
  const matchBoost = matches.length > 0 ? Math.min(10, Math.round(matches.filter((m) => m.matchScore >= 70).length * 2)) : 0
  const percentage = clamp(base + matchBoost)
  const strengths = checks.filter((check) => check.complete).map((check) => check.label)
  const missingRequirements = checks.filter((check) => !check.complete).map((check) => check.label)

  const label = percentage >= 80 ? 'Scholarship Ready' : percentage >= 45 ? 'Building Scholarship Readiness' : 'Needs Foundation'

  return {
    percentage,
    label,
    strengths,
    missingRequirements,
    topMissingRequirement: missingRequirements[0] || null,
  }
}

export type ScholarshipApplicationTaskStatus = 'not_started' | 'in_progress' | 'done'

export type ScholarshipApplicationTaskSeed = {
  title: string
  description?: string | null
  category: 'setup' | 'documents' | 'essay' | 'recommendation' | 'submission' | 'follow_up' | 'general'
  dueDate?: string | null
  uploadRequired?: boolean
}

export type ScholarshipApplicationProgress = {
  total: number
  completed: number
  percentage: number
  nextTask: string | null
  overdue: number
  documentsNeeded: number
}

function daysBefore(dateValue: string | null | undefined, days: number) {
  if (!dateValue) return null
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null
  date.setDate(date.getDate() - days)
  return date.toISOString().slice(0, 10)
}

function addUniqueTask(tasks: ScholarshipApplicationTaskSeed[], task: ScholarshipApplicationTaskSeed) {
  if (!tasks.some((existing) => normalize(existing.title) === normalize(task.title))) tasks.push(task)
}

export function buildScholarshipApplicationTaskSeeds(
  scholarship: ScholarshipForMatching,
  requirements: ScholarshipRequirement[] = [],
): ScholarshipApplicationTaskSeed[] {
  const deadline = scholarship.deadline || null
  const tasks: ScholarshipApplicationTaskSeed[] = []

  addUniqueTask(tasks, {
    title: 'Review eligibility requirements',
    description: 'Confirm GPA, grade level, location, career fit, and any special requirements before spending time on the application.',
    category: 'setup',
    dueDate: daysBefore(deadline, 21),
  })

  addUniqueTask(tasks, {
    title: 'Open official application link',
    description: 'Visit the scholarship provider site and confirm the exact deadline, required documents, and submission method.',
    category: 'setup',
    dueDate: daysBefore(deadline, 20),
  })

  if (scholarship.essay_required || requirements.some((req) => req.requirement_type === 'essay')) {
    addUniqueTask(tasks, {
      title: 'Draft scholarship essay',
      description: 'Create a first draft and save it in the essay/resume vault or document center.',
      category: 'essay',
      dueDate: daysBefore(deadline, 14),
      uploadRequired: true,
    })
    addUniqueTask(tasks, {
      title: 'Review and polish essay',
      description: 'Ask a parent, counselor, mentor, or trusted adult to review the essay before submission.',
      category: 'essay',
      dueDate: daysBefore(deadline, 7),
    })
  }

  if (scholarship.recommendation_required || requirements.some((req) => req.requirement_type === 'recommendation')) {
    addUniqueTask(tasks, {
      title: 'Request recommendation letter',
      description: 'Ask a teacher, counselor, employer, or mentor early and provide context about the scholarship.',
      category: 'recommendation',
      dueDate: daysBefore(deadline, 21),
    })
    addUniqueTask(tasks, {
      title: 'Confirm recommendation was submitted',
      description: 'Follow up politely before the deadline to make sure the recommendation is complete.',
      category: 'recommendation',
      dueDate: daysBefore(deadline, 3),
    })
  }

  if (requirements.some((req) => req.requirement_type === 'transcript') || scholarship.minimum_gpa) {
    addUniqueTask(tasks, {
      title: 'Upload or request transcript',
      description: 'Attach the latest transcript/report card or request an official copy from school if required.',
      category: 'documents',
      dueDate: daysBefore(deadline, 10),
      uploadRequired: true,
    })
  }

  if (scholarship.volunteer_required || requirements.some((req) => req.requirement_type === 'volunteer_hours')) {
    addUniqueTask(tasks, {
      title: 'Verify service hours',
      description: 'Make sure volunteer/service hours are logged with organization or supervisor details.',
      category: 'documents',
      dueDate: daysBefore(deadline, 10),
    })
  }

  if (requirements.some((req) => req.requirement_type === 'fafsa')) {
    addUniqueTask(tasks, {
      title: 'Prepare FAFSA or financial aid proof',
      description: 'Confirm whether the scholarship requires FAFSA completion or financial need documentation.',
      category: 'documents',
      dueDate: daysBefore(deadline, 12),
      uploadRequired: true,
    })
  }

  addUniqueTask(tasks, {
    title: 'Submit scholarship application',
    description: 'Submit before the official deadline and save confirmation if available.',
    category: 'submission',
    dueDate: deadline,
  })

  addUniqueTask(tasks, {
    title: 'Save confirmation or follow-up notes',
    description: 'Record confirmation number, email receipt, or next steps after submission.',
    category: 'follow_up',
    dueDate: deadline,
  })

  return tasks
}

export function computeScholarshipApplicationProgress(tasks: Array<{
  status?: ScholarshipApplicationTaskStatus | string | null
  title?: string | null
  due_date?: string | null
  dueDate?: string | null
  upload_required?: boolean | null
  uploadRequired?: boolean | null
}>): ScholarshipApplicationProgress {
  const today = new Date().toISOString().slice(0, 10)
  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'done').length
  const incomplete = tasks.filter((task) => task.status !== 'done')
  const sortedIncomplete = [...incomplete].sort((a, b) => String(a.due_date || a.dueDate || '9999-12-31').localeCompare(String(b.due_date || b.dueDate || '9999-12-31')))
  const overdue = incomplete.filter((task) => {
    const due = task.due_date || task.dueDate
    return Boolean(due && due < today)
  }).length
  const documentsNeeded = incomplete.filter((task) => Boolean(task.upload_required ?? task.uploadRequired)).length

  return {
    total,
    completed,
    percentage: total ? Math.round((completed / total) * 100) : 0,
    nextTask: sortedIncomplete[0]?.title || null,
    overdue,
    documentsNeeded,
  }
}
