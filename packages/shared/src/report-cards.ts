/** School-reported values only. Unknown values stay null; no inferred GPA. */
export type ReportCardGrade = {
  period: string
  numeric: number | null
  letter: string | null
}
export type ReportCardCourse = {
  name: string
  grades: ReportCardGrade[]
}
export type ReportCardData = {
  schema_version: 1
  school_name: string | null
  school_year: string | null
  grade_level: string | null
  courses: ReportCardCourse[]
  attendance: {
    scope: string | null
    absences: number | null
    tardies: number | null
  }
}

export function canManageReportCards(role: unknown): boolean {
  return role === 'student' || role === 'parent'
}

export function emptyReportCard(now = new Date()): ReportCardData {
  const year = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1
  return {
    schema_version: 1,
    school_name: null,
    school_year: `${year}-${year + 1}`,
    grade_level: null,
    courses: [],
    attendance: { scope: null, absences: null, tardies: null },
  }
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid report card.')
  return value as Record<string, unknown>
}
function text(value: unknown, max: number): string | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.trim().length > max)
    throw new Error('Invalid report-card text.')
  return value.trim() || null
}
function number(value: unknown, max: number): number | null {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > max) {
    throw new Error('Grades must be between 0 and 100; attendance must be nonnegative.')
  }
  return value
}

/** Whitelists fields so model output cannot supply ownership, identity or workflow state. */
export function parseReportCard(value: unknown, requireComplete = false): ReportCardData {
  const row = object(value)
  if (row.schema_version !== 1) throw new Error('Unsupported report-card format.')
  const year = text(row.school_year, 9)
  if (
    year &&
    (!/^\d{4}-\d{4}$/.test(year) || Number(year.slice(5)) !== Number(year.slice(0, 4)) + 1)
  ) {
    throw new Error('Use a school year such as 2026-2027.')
  }
  const grade = text(row.grade_level, 2)
  if (grade && !/^(K|[1-9]|1[0-2])$/.test(grade)) throw new Error('Choose a valid grade level.')
  if (!Array.isArray(row.courses) || row.courses.length > 40)
    throw new Error('Use at most 40 courses.')
  const courses = row.courses.map((value): ReportCardCourse => {
    const course = object(value)
    const name = text(course.name, 200)
    if (!name) throw new Error('Every course needs a name.')
    if (!Array.isArray(course.grades) || course.grades.length > 16)
      throw new Error('Invalid grading periods.')
    const periods = new Set<string>()
    const grades = course.grades.map((value): ReportCardGrade => {
      const cell = object(value)
      const period = text(cell.period, 40)
      if (!period || periods.has(period.toLowerCase()))
        throw new Error('Each course needs unique grading periods.')
      periods.add(period.toLowerCase())
      return { period, numeric: number(cell.numeric, 100), letter: text(cell.letter, 12) }
    })
    return { name, grades }
  })
  const attendance = object(row.attendance)
  const result: ReportCardData = {
    schema_version: 1,
    school_name: text(row.school_name, 200),
    school_year: year,
    grade_level: grade,
    courses,
    attendance: {
      scope: text(attendance.scope, 80),
      absences: number(attendance.absences, 366),
      tardies: number(attendance.tardies, 366),
    },
  }
  if (
    requireComplete &&
    (!year ||
      !grade ||
      !courses.length ||
      !courses.some((c) => c.grades.some((g) => g.numeric !== null || g.letter !== null)))
  ) {
    throw new Error(
      'Review the school year, grade level, and at least one course grade before saving.',
    )
  }
  return result
}

// Same strict shape is used by the extraction service; validation still runs on its output.
const nullableText = { type: ['string', 'null'] }
const nullableNumber = { type: ['number', 'null'] }
export const REPORT_CARD_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: [
    'schema_version',
    'school_name',
    'school_year',
    'grade_level',
    'courses',
    'attendance',
  ],
  properties: {
    schema_version: { type: 'integer', enum: [1] },
    school_name: nullableText,
    school_year: nullableText,
    grade_level: nullableText,
    courses: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'grades'],
        properties: {
          name: { type: 'string' },
          grades: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['period', 'numeric', 'letter'],
              properties: {
                period: { type: 'string' },
                numeric: nullableNumber,
                letter: nullableText,
              },
            },
          },
        },
      },
    },
    attendance: {
      type: 'object',
      additionalProperties: false,
      required: ['scope', 'absences', 'tardies'],
      properties: { scope: nullableText, absences: nullableNumber, tardies: nullableNumber },
    },
  },
}
