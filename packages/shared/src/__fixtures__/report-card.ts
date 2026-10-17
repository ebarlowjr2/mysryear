import type { ReportCardData } from '../report-cards'

// Fictional ninth-grade fixture inspired by the sample layout. No student/teacher identifiers.
export const ninthGradeReportCard: ReportCardData = {
  schema_version: 1,
  school_name: 'Example High School',
  school_year: '2026-2027',
  grade_level: '9',
  courses: [
    {
      name: 'Mathematics',
      grades: [
        { period: 'Q1', numeric: 82, letter: 'B' },
        { period: 'Q2', numeric: null, letter: null },
      ],
    },
    { name: 'Career Explorations', grades: [{ period: 'Q1', numeric: 87, letter: 'B' }] },
    { name: 'Music', grades: [{ period: 'Q1', numeric: 94, letter: 'A' }] },
    { name: 'Homeroom', grades: [{ period: 'Q1', numeric: null, letter: null }] },
    { name: 'English Language Arts', grades: [{ period: 'Q1', numeric: 84, letter: 'B' }] },
    { name: 'Science', grades: [{ period: 'Q1', numeric: 93, letter: 'A' }] },
    { name: 'Physical Education', grades: [{ period: 'Q1', numeric: 100, letter: 'A' }] },
    { name: 'Social Studies', grades: [{ period: 'Q1', numeric: 84, letter: 'B' }] },
  ],
  attendance: { scope: 'Year to date', absences: 2, tardies: 1 },
}
