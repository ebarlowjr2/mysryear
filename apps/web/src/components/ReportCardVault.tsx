'use client'

import { useEffect, useMemo, useState } from 'react'
import { useAuthSession } from '@/lib/use-auth-session'

type AcademicRecord = {
  id: string
  document_type: string
  school_year: string | null
  grading_period: string | null
  grade_level: string | null
  gpa: number | null
  created_at: string
}

export default function ReportCardVault() {
  const { isAuthenticated } = useAuthSession()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<AcademicRecord[]>([])
  const [message, setMessage] = useState('')
  const [uploading, setUploading] = useState(false)

  // Metadata inputs
  const [documentType, setDocumentType] = useState('academic_report_card')
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [gradingPeriod, setGradingPeriod] = useState('Q1')
  const [gradeLevel, setGradeLevel] = useState('9')
  const [gpa, setGpa] = useState('')
  const [notes, setNotes] = useState('')

  const uploadContext = useMemo(() => {
    switch (documentType) {
      case 'academic_report_card':
        return 'academic_report_card'
      case 'academic_progress_report':
        return 'academic_progress_report'
      case 'academic_transcript':
        return 'academic_transcript'
      case 'academic_test_score':
        return 'academic_test_score'
      default:
        return 'academic_general'
    }
  }, [documentType])

  async function load() {
    setLoading(true)
    setMessage('')
    try {
      const res = await fetch('/api/dashboard/summary')
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; academicRecords?: AcademicRecord[] }
        | null
      if (json?.ok && Array.isArray(json.academicRecords)) setRecords(json.academicRecords)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false)
      setRecords([])
      return
    }
    load()
  }, [isAuthenticated])

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!isAuthenticated) return
    setUploading(true)
    setMessage('')
    try {
      const formData = new FormData(e.currentTarget)
      formData.set('upload_context', uploadContext)
      formData.set('document_type', documentType)
      formData.set('school_year', schoolYear)
      formData.set('grading_period', gradingPeriod)
      formData.set('grade_level', gradeLevel)
      if (gpa.trim()) formData.set('gpa', gpa.trim())
      if (notes.trim()) formData.set('notes', notes.trim())

      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const json = (await res.json().catch(() => null)) as
        | { ok?: boolean; error?: string }
        | null
      if (!json?.ok) {
        setMessage(`Error: ${json?.error || 'Upload failed'}`)
        return
      }
      setMessage('Uploaded.')
      e.currentTarget.reset()
      await load()
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold">Report Card Vault</h3>
      <p className="mt-2 text-sm text-slate-700">
        Upload report cards, transcripts, and test score documents for the active student profile.
      </p>

      {!isAuthenticated && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          Log in to upload and track academic records.
        </div>
      )}

      {isAuthenticated && (
        <>
          <form onSubmit={onUpload} className="mt-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Document type
                </label>
                <select
                  className="input w-full px-3 py-2 rounded-lg"
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                >
                  <option value="academic_report_card">Report card</option>
                  <option value="academic_progress_report">Progress report</option>
                  <option value="academic_transcript">Transcript</option>
                  <option value="academic_test_score">Test score</option>
                  <option value="academic_general">General academic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Grade level
                </label>
                <select
                  className="input w-full px-3 py-2 rounded-lg"
                  value={gradeLevel}
                  onChange={(e) => setGradeLevel(e.target.value)}
                >
                  <option value="9">9th</option>
                  <option value="10">10th</option>
                  <option value="11">11th</option>
                  <option value="12">12th</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  School year
                </label>
                <input
                  className="input w-full px-3 py-2 rounded-lg"
                  value={schoolYear}
                  onChange={(e) => setSchoolYear(e.target.value)}
                  placeholder="2025-2026"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">
                  Grading period
                </label>
                <input
                  className="input w-full px-3 py-2 rounded-lg"
                  value={gradingPeriod}
                  onChange={(e) => setGradingPeriod(e.target.value)}
                  placeholder="Q1 / Semester 1"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">GPA (optional)</label>
                <input
                  className="input w-full px-3 py-2 rounded-lg"
                  value={gpa}
                  onChange={(e) => setGpa(e.target.value)}
                  placeholder="3.5"
                  inputMode="decimal"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <input
                  className="input w-full px-3 py-2 rounded-lg"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Honors math, strong improvement…"
                />
              </div>
            </div>

            <input type="file" name="file" className="block w-full text-sm text-slate-600" required />
            <button className="btn-primary w-full" disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload Latest Record'}
            </button>
          </form>

          {message && <div className="mt-3 text-sm text-slate-700">{message}</div>}

          <div className="mt-5">
            <div className="text-sm font-semibold">Recent academic records</div>
            {loading ? (
              <div className="mt-2 text-sm text-slate-600">Loading…</div>
            ) : records.length === 0 ? (
              <div className="mt-2 text-sm text-slate-600">No records yet.</div>
            ) : (
              <ul className="mt-2 space-y-2 text-sm">
                {records.slice(0, 6).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{r.document_type}</div>
                      <div className="text-xs text-slate-600">
                        {[r.school_year, r.grading_period, r.grade_level ? `${r.grade_level}th` : null]
                          .filter(Boolean)
                          .join(' • ')}
                      </div>
                    </div>
                    <div className="text-xs text-slate-600">
                      {typeof r.gpa === 'number' ? `GPA ${r.gpa}` : ''}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  )
}
