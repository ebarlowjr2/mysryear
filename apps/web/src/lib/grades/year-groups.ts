import type { ReportCardData } from '@mysryear/shared'

export type ReportCardListItem = {
  id: string
  data: ReportCardData
}

export type ReportCardYearGroup<T extends ReportCardListItem = ReportCardListItem> = {
  schoolYear: string
  records: T[]
}

const UNREPORTED_YEAR = 'School year not reported'

export function groupReportCardsBySchoolYear<T extends ReportCardListItem>(
  records: T[],
): ReportCardYearGroup<T>[] {
  const groups = new Map<string, T[]>()

  for (const record of records) {
    const schoolYear = record.data.school_year || UNREPORTED_YEAR
    const existing = groups.get(schoolYear)
    if (existing) existing.push(record)
    else groups.set(schoolYear, [record])
  }

  return Array.from(groups, ([schoolYear, groupedRecords]) => ({
    schoolYear,
    records: groupedRecords,
  })).sort((a, b) => {
    if (a.schoolYear === UNREPORTED_YEAR) return 1
    if (b.schoolYear === UNREPORTED_YEAR) return -1
    return b.schoolYear.localeCompare(a.schoolYear)
  })
}
