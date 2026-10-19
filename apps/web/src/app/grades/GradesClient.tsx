'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { emptyReportCard, parseReportCard, type ReportCardData } from '@mysryear/shared'
import { prepareReportPhoto } from '@/lib/grades/photo'
import { groupReportCardsBySchoolYear } from '@/lib/grades/year-groups'

type Student = {
  id: string
  first_name: string | null
  last_name: string | null
  grade_level: string | null
}
type Card = {
  id: string
  student_profile_id: string
  data: ReportCardData
  reviewed_at: string
  source_path: string | null
}
type Overview = {
  students: Student[]
  activeStudentId: string | null
  records: Card[]
  analysisAvailable: boolean
}
const inputStyle =
  'block w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-brand-500 disabled:bg-slate-100'
const nameOf = (s?: Student) => [s?.first_name, s?.last_name].filter(Boolean).join(' ') || 'Student'

async function jsonRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, options)
  const json = await response.json().catch(() => null)
  if (!response.ok || !json) throw new Error(json?.error || 'Unable to connect. Please try again.')
  return json
}

function GradeTable({ data }: { data: ReportCardData }) {
  const periods = Array.from(new Set(data.courses.flatMap((c) => c.grades.map((g) => g.period))))
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">
          Course grades as reported by the school. A dash means no grade reported.
        </caption>
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="min-w-44 p-4">Course</th>
            {periods.map((p) => (
              <th key={p} className="min-w-20 p-4">
                {p}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.courses.map((c, i) => (
            <tr key={i} className="border-t border-slate-200">
              <th scope="row" className="p-4 font-medium">
                {c.name}
              </th>
              {periods.map((p) => {
                const grade = c.grades.find((g) => g.period === p)
                return (
                  <td key={p} className="p-4 tabular-nums">
                    {grade?.numeric ?? ''}
                    {grade?.numeric !== null && grade?.numeric !== undefined && grade?.letter
                      ? ' / '
                      : ''}
                    {grade?.letter || ''}
                    {grade?.numeric == null && !grade?.letter ? '—' : ''}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportCardDetails({ record, student }: { record: Card; student: Student }) {
  return (
    <article className="border-t border-slate-200 px-4 py-5 first:border-t-0 sm:px-6">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold">{nameOf(student)}</h3>
          <p className="mt-1 text-sm text-slate-600">
            Grade {record.data.grade_level}
            {record.data.school_name ? ` · ${record.data.school_name}` : ''}
          </p>
        </div>
        <span className="badge self-start">Family reviewed</span>
      </div>
      <div className="mt-4">
        <GradeTable data={record.data} />
      </div>
      <div className="mt-4 flex flex-wrap gap-6 text-sm text-slate-600">
        <span>Attendance: {record.data.attendance.scope || 'Period not reported'}</span>
        <span>Absences: {record.data.attendance.absences ?? 'Not reported'}</span>
        <span>Tardies: {record.data.attendance.tardies ?? 'Not reported'}</span>
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-3 text-xs text-slate-500">
        <p>
          Reviewed {new Date(record.reviewed_at).toLocaleDateString()}. School-reported grades; not
          a verified transcript.
        </p>
        {record.source_path && (
          <a
            className="font-semibold text-brand-700 underline"
            href={`/api/grades/source?id=${record.id}`}
            target="_blank"
            rel="noreferrer"
          >
            View source photo
          </a>
        )}
      </div>
    </article>
  )
}

function SchoolYearSection({
  schoolYear,
  records,
  student,
  defaultOpen,
}: {
  schoolYear: string
  records: Card[]
  student: Student
  defaultOpen: boolean
}) {
  const gradeLevels = Array.from(
    new Set(records.map((record) => record.data.grade_level).filter(Boolean)),
  )
  const gradeLabel =
    gradeLevels.length === 1 ? `Grade ${gradeLevels[0]}` : `${gradeLevels.length} grade levels`

  return (
    <details className="card group overflow-hidden" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-5 marker:content-none sm:px-6">
        <div>
          <h2 className="text-xl font-bold">{schoolYear}</h2>
          <p className="mt-1 text-sm text-slate-600">
            {records.length} {records.length === 1 ? 'report card' : 'report cards'} · {gradeLabel}
          </p>
        </div>
        <span className="rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-brand-700 group-open:hidden">
          View year
        </span>
        <span className="hidden rounded-full border border-slate-300 px-3 py-1 text-sm font-semibold text-brand-700 group-open:inline">
          Hide year
        </span>
      </summary>
      <div className="border-t border-slate-200">
        {records.map((record) => (
          <ReportCardDetails key={record.id} record={record} student={student} />
        ))}
      </div>
    </details>
  )
}

function ReportEditor({
  student,
  analysisAvailable,
  onSaved,
  onCancel,
}: {
  student: Student
  analysisAvailable: boolean
  onSaved: () => void
  onCancel: () => void
}) {
  const [id, setId] = useState(() => crypto.randomUUID())
  const [draft, setDraft] = useState<ReportCardData>(() => ({
    ...emptyReportCard(),
    grade_level: /^(9|10|11|12)$/.test(student.grade_level || '') ? student.grade_level : null,
  }))
  const [photo, setPhoto] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [consent, setConsent] = useState(false)
  const [reviewed, setReviewed] = useState(false)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    if (!photo) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(photo)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photo])
  const update = (next: ReportCardData) => {
    setDraft(next)
    setId(crypto.randomUUID())
    setReviewed(false)
  }
  async function choosePhoto(file?: File) {
    if (!file) return
    setBusy('Preparing photo')
    setError('')
    try {
      setPhoto(await prepareReportPhoto(file))
      setId(crypto.randomUUID())
      setReviewed(false)
      setConsent(false)
      setNotice('Photo attached. Analyze it or enter the grades below.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }
  async function analyze() {
    if (!photo) return
    if (
      draft.courses.length &&
      !window.confirm('Replace the current draft with grades read from this photo?')
    )
      return
    setBusy('Reading report card')
    setError('')
    try {
      const form = new FormData()
      form.set('photo', photo)
      form.set('studentId', student.id)
      form.set('consent', String(consent))
      const result = await jsonRequest('/api/grades/analyze', { method: 'POST', body: form })
      update(parseReportCard(result.data))
      setNotice(
        'Draft ready. Check every course, period, grade, and the student before saving. Unclear values may be blank.',
      )
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }
  async function save() {
    setError('')
    try {
      const normalized = parseReportCard(draft, true)
      if (!reviewed) throw new Error('Confirm that you reviewed these grades.')
      setBusy('Saving report card')
      const form = new FormData()
      form.set('id', id)
      form.set('studentId', student.id)
      form.set('data', JSON.stringify(normalized))
      form.set('reviewed', 'true')
      if (photo) form.set('photo', photo)
      await jsonRequest('/api/grades', { method: 'POST', body: form })
      onSaved()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy('')
    }
  }
  return (
    <section className="card p-4 sm:p-6 space-y-5" aria-labelledby="report-editor-title">
      <div>
        <div className="badge">New report card</div>
        <h2 id="report-editor-title" className="mt-2 text-xl font-bold">
          Add grades for {nameOf(student)}
        </h2>
        <p className="mt-2 text-sm text-slate-600">
          Capture the whole page in good light, keep the camera straight, and avoid shadows. Check
          the student above before adding a photo.
        </p>
      </div>
      <fieldset disabled={Boolean(busy)} className="space-y-5 disabled:opacity-60">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm font-semibold">
            Take a photo
            <input
              aria-label="Take a photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="mt-2 block w-full text-sm"
              onChange={(e) => {
                void choosePhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          <label className="block text-sm font-semibold">
            Choose a photo
            <input
              aria-label="Choose a photo"
              type="file"
              accept="image/*"
              className="mt-2 block w-full text-sm"
              onChange={(e) => {
                void choosePhoto(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
        </div>
        {preview && (
          <div className="space-y-3">
            {/* Local object URL only; source photos are never public. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Selected report-card photo for review"
              className="max-h-80 max-w-full rounded-xl border object-contain"
            />
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setPhoto(null)
                setId(crypto.randomUUID())
                setConsent(false)
                setReviewed(false)
              }}
            >
              Remove photo
            </button>
            {analysisAvailable ? (
              <>
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                  />
                  I agree to send this photo to OpenAI to read the grades. I have permission to use
                  this student&apos;s report card.
                </label>
                <button
                  type="button"
                  className="btn-primary disabled:opacity-50"
                  disabled={!consent}
                  onClick={() => void analyze()}
                >
                  Analyze photo
                </button>
              </>
            ) : (
              <p className="text-sm text-slate-600">
                Photo analysis is not enabled yet. You can attach the photo and enter the grades
                below.
              </p>
            )}
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            School
            <input
              className={inputStyle}
              value={draft.school_name || ''}
              maxLength={200}
              onChange={(e) => update({ ...draft, school_name: e.target.value || null })}
            />
          </label>
          <label className="text-sm font-semibold">
            School year
            <input
              className={inputStyle}
              placeholder="2026-2027"
              value={draft.school_year || ''}
              onChange={(e) => update({ ...draft, school_year: e.target.value || null })}
            />
          </label>
          <label className="text-sm font-semibold">
            Grade level
            <select
              className={inputStyle}
              value={draft.grade_level || ''}
              onChange={(e) => update({ ...draft, grade_level: e.target.value || null })}
            >
              <option value="">Choose grade</option>
              {Array.from({ length: 12 }, (_, i) => String(i + 1)).map((g) => (
                <option value={g} key={g}>
                  Grade {g}
                </option>
              ))}
              <option value="K">Kindergarten</option>
            </select>
          </label>
        </div>
        <div className="space-y-4">
          <h3 className="font-bold">Review course grades</h3>
          <p className="text-sm text-slate-600">
            Preserve the school&apos;s period labels (for example Q1 or S1). Leave unreported values
            blank. GPA is not inferred.
          </p>
          {draft.courses.map((course, i) => (
            <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex gap-2">
                <label className="flex-1 text-sm font-semibold">
                  Course {i + 1}
                  <input
                    className={inputStyle}
                    value={course.name}
                    maxLength={200}
                    onChange={(e) =>
                      update({
                        ...draft,
                        courses: draft.courses.map((c, n) =>
                          n === i ? { ...c, name: e.target.value } : c,
                        ),
                      })
                    }
                  />
                </label>
                <button
                  type="button"
                  className="text-sm text-red-700 self-end py-2"
                  aria-label={`Remove course ${i + 1}`}
                  onClick={() =>
                    update({ ...draft, courses: draft.courses.filter((_, n) => n !== i) })
                  }
                >
                  Remove
                </button>
              </div>
              {course.grades.map((grade, j) => (
                <div key={j} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2 items-end">
                  {(['period', 'numeric', 'letter'] as const).map((field) => (
                    <label className="text-xs font-medium" key={field}>
                      {field === 'numeric'
                        ? 'Score (0-100)'
                        : field === 'letter'
                          ? 'Letter / mark'
                          : 'Period'}
                      <input
                        aria-label={`Course ${i + 1} period ${j + 1} ${field}`}
                        className={inputStyle}
                        type={field === 'numeric' ? 'number' : 'text'}
                        min={field === 'numeric' ? 0 : undefined}
                        max={field === 'numeric' ? 100 : undefined}
                        step={field === 'numeric' ? 'any' : undefined}
                        value={grade[field] ?? ''}
                        onChange={(e) =>
                          update({
                            ...draft,
                            courses: draft.courses.map((c, n) =>
                              n === i
                                ? {
                                    ...c,
                                    grades: c.grades.map((g, k) =>
                                      k === j
                                        ? {
                                            ...g,
                                            [field]:
                                              field === 'numeric'
                                                ? e.target.value === ''
                                                  ? null
                                                  : Number(e.target.value)
                                                : e.target.value ||
                                                  (field === 'letter' ? null : ''),
                                          }
                                        : g,
                                    ),
                                  }
                                : c,
                            ),
                          })
                        }
                      />
                    </label>
                  ))}
                  <button
                    type="button"
                    className="p-2 text-red-700"
                    aria-label={`Remove course ${i + 1} period ${j + 1}`}
                    onClick={() =>
                      update({
                        ...draft,
                        courses: draft.courses.map((c, n) =>
                          n === i ? { ...c, grades: c.grades.filter((_, k) => k !== j) } : c,
                        ),
                      })
                    }
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                className="text-sm font-semibold text-brand-700"
                disabled={course.grades.length >= 16}
                onClick={() =>
                  update({
                    ...draft,
                    courses: draft.courses.map((c, n) =>
                      n === i
                        ? {
                            ...c,
                            grades: [...c.grades, { period: '', numeric: null, letter: null }],
                          }
                        : c,
                    ),
                  })
                }
              >
                Add grading period
              </button>
            </div>
          ))}
          <button
            type="button"
            className="btn-secondary"
            disabled={draft.courses.length >= 40}
            onClick={() =>
              update({
                ...draft,
                courses: [
                  ...draft.courses,
                  { name: '', grades: [{ period: 'Q1', numeric: null, letter: null }] },
                ],
              })
            }
          >
            Add course
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-sm font-semibold">
            Attendance period
            <input
              className={inputStyle}
              placeholder="Year to date / Q1"
              value={draft.attendance.scope || ''}
              onChange={(e) =>
                update({
                  ...draft,
                  attendance: { ...draft.attendance, scope: e.target.value || null },
                })
              }
            />
          </label>
          {(['absences', 'tardies'] as const).map((field) => (
            <label key={field} className="text-sm font-semibold capitalize">
              {field}
              <input
                className={inputStyle}
                type="number"
                min="0"
                max="366"
                step="any"
                value={draft.attendance[field] ?? ''}
                onChange={(e) =>
                  update({
                    ...draft,
                    attendance: {
                      ...draft.attendance,
                      [field]: e.target.value === '' ? null : Number(e.target.value),
                    },
                  })
                }
              />
            </label>
          ))}
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={reviewed}
            onChange={(e) => setReviewed(e.target.checked)}
            className="mt-1"
          />
          I checked the source, student ({nameOf(student)}), school year, grade level, and every
          grade. Save this as a family-reviewed report card.
        </label>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!reviewed}
            onClick={() => void save()}
          >
            Save reviewed report card
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              if (window.confirm('Discard this unsaved report-card draft?')) onCancel()
            }}
          >
            Cancel
          </button>
        </div>
      </fieldset>
      {busy && <p role="status">{busy}...</p>}
      {notice && (
        <p role="status" className="text-sm text-brand-700">
          {notice}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-red-800">
          {error}
        </p>
      )}
    </section>
  )
}

export default function GradesClient() {
  const [overview, setOverview] = useState<Overview | null>(null)
  const [studentId, setStudentId] = useState('')
  const [version, setVersion] = useState(0)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [switching, setSwitching] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setOverview(null)
    setError('')
    jsonRequest(`/api/grades${studentId ? `?student=${encodeURIComponent(studentId)}` : ''}`, {
      signal: controller.signal,
    })
      .then((data: Overview) => {
        if (!controller.signal.aborted) setOverview(data)
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(e.message)
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [studentId, version])
  async function switchStudent(id: string) {
    setSwitching(true)
    setError('')
    setNotice('')
    try {
      await jsonRequest('/api/grades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: id }),
      })
      setOverview(null)
      setStudentId(id)
      setVersion((v) => v + 1)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSwitching(false)
    }
  }
  const student = overview?.students.find((s) => s.id === overview.activeStudentId)
  const schoolYearGroups = groupReportCardsBySchoolYear(overview?.records || [])
  return (
    <section className="container-prose py-10 space-y-6">
      <Link href="/dashboard" className="text-sm font-semibold text-brand-700">
        Back to dashboard
      </Link>
      <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-start">
        <div>
          <span className="badge">Student success</span>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">
            Grades &amp; Report Cards
          </h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Turn a report-card photo into a clear record of courses, grades, and attendance. Review
            together, one grading period at a time.
          </p>
        </div>
        {student && !editing && !loading && (
          <button
            className="btn-primary shrink-0"
            onClick={() => {
              setEditing(true)
              setNotice('')
            }}
          >
            Add report card
          </button>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-brand-50 p-4 text-brand-800">
          {notice}
        </p>
      )}
      {error && (
        <div role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {error}{' '}
          <button className="underline" onClick={() => setVersion((v) => v + 1)}>
            Try again
          </button>
        </div>
      )}
      {loading ? (
        <p role="status">Loading grades...</p>
      ) : (
        overview && (
          <>
            {overview.students.length ? (
              <div className="card p-4">
                <label className="block text-sm font-semibold">
                  Student profile
                  <select
                    className={`${inputStyle} mt-2 sm:max-w-md`}
                    aria-label="Student profile"
                    value={overview.activeStudentId || ''}
                    disabled={editing || switching}
                    onChange={(e) => void switchStudent(e.target.value)}
                  >
                    {overview.students.map((s) => (
                      <option key={s.id} value={s.id}>
                        {nameOf(s)}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-slate-500">
                  {editing
                    ? 'Save or cancel this draft before switching students.'
                    : 'Only students you are authorized to manage appear here.'}
                </p>
              </div>
            ) : (
              <div className="card p-6">
                <h2 className="text-lg font-bold">No connected student yet</h2>
                <p className="mt-2 text-slate-600">
                  Connect with a student or create a managed profile before adding grades. Pending
                  invitations do not grant access.
                </p>
                <Link href="/profile" className="btn-secondary mt-4">
                  Manage student connections
                </Link>
              </div>
            )}
            {editing && student ? (
              <ReportEditor
                key={student.id}
                student={student}
                analysisAvailable={overview.analysisAvailable}
                onCancel={() => setEditing(false)}
                onSaved={() => {
                  setEditing(false)
                  setNotice(
                    'Report card saved. These reviewed grades are now available to the student and authorized parents.',
                  )
                  setVersion((v) => v + 1)
                }}
              />
            ) : (
              student && (
                <>
                  {!schoolYearGroups.length ? (
                    <div className="card p-8 text-center">
                      <h2 className="text-xl font-bold">
                        A clearer view of {nameOf(student)}&apos;s progress
                      </h2>
                      <p className="mt-2 text-slate-600">
                        Add the first report card to see grades here. Files previously added to the
                        vault remain there; they have not been analyzed.
                      </p>
                      <button className="btn-primary mt-5" onClick={() => setEditing(true)}>
                        Add first report card
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm text-slate-600">
                        Open a school year to view its report cards. The most recent year is open by
                        default.
                      </p>
                      {schoolYearGroups.map((group, index) => (
                        <SchoolYearSection
                          key={group.schoolYear}
                          schoolYear={group.schoolYear}
                          records={group.records}
                          student={student}
                          defaultOpen={index === 0}
                        />
                      ))}
                    </div>
                  )}
                </>
              )
            )}
          </>
        )
      )}
    </section>
  )
}
