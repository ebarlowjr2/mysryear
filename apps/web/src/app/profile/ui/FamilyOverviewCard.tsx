'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ArrowRight,
  Clock3,
  GraduationCap,
  Mail,
  School,
  UserRound,
  Users,
} from 'lucide-react'

type FamilyStudent = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  grade_level: string | null
  student_user_id: string | null
  claim_status: 'managed' | 'claimed' | 'claim_conflict' | null
  relationship_role: 'parent' | 'guardian'
  schools: {
    name: string | null
    school_level: 'high_school' | 'college' | null
  } | null
}

function studentName(student: FamilyStudent) {
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student'
}

function schoolLevelLabel(student: FamilyStudent) {
  if (student.schools?.school_level === 'college') return 'College'
  if (student.schools?.school_level === 'high_school') return 'High School'
  return 'School level not set'
}

function studentStatus(student: FamilyStudent) {
  if (student.claim_status === 'claim_conflict') {
    return {
      label: 'Claim needs attention',
      detail: 'The student needs help resolving a profile claim.',
      className: 'border-amber-200 bg-amber-50 text-amber-800',
    }
  }

  if (student.claim_status === 'managed' || student.student_user_id === null) {
    return {
      label: 'Managed profile',
      detail: 'The student can claim this profile later.',
      className: 'border-brand-200 bg-brand-50 text-brand-800',
    }
  }

  return {
    label: 'Connected',
    detail: `${student.relationship_role === 'guardian' ? 'Guardian' : 'Parent'} access is active.`,
    className: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  }
}

export default function FamilyOverviewCard({
  parentName,
  parentEmail,
  parentRole,
  activeStudentProfileId,
  students,
  pendingConnectionCount,
}: {
  parentName: string
  parentEmail: string | null
  parentRole: 'parent' | 'guardian'
  activeStudentProfileId: string | null
  students: FamilyStudent[]
  pendingConnectionCount: number
}) {
  const router = useRouter()
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const studentAttentionCount = students.filter(
    (student) =>
      student.claim_status === 'managed' ||
      student.claim_status === 'claim_conflict' ||
      student.student_user_id === null,
  ).length
  const actionCount = pendingConnectionCount + studentAttentionCount

  async function makeActive(studentProfileId: string) {
    if (studentProfileId === activeStudentProfileId) return

    setSavingStudentId(studentProfileId)
    setError(null)
    try {
      const response = await fetch('/api/profile/active-student-profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ studentProfileId }),
      })
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean
        error?: string
      } | null
      if (!response.ok || !data?.ok) {
        setError(data?.error || 'Could not switch the active student.')
        return
      }
      router.refresh()
    } finally {
      setSavingStudentId(null)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="badge">Family Account</div>
          <h1 className="mt-3 text-3xl font-black tracking-tight sm:text-4xl">Family Overview</h1>
          <p className="mt-3 max-w-2xl text-slate-700">
            Keep your family account and the student profiles you support in one place.
          </p>
        </div>
        <Link href="/dashboard/family" className="btn-secondary shrink-0">
          Family Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-100">
              <UserRound className="h-5 w-5 text-brand-700" />
            </div>
            <div className="min-w-0">
              <div className="font-black text-slate-950">{parentName}</div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600">
                <span className="font-semibold text-brand-700">
                  {parentRole === 'guardian' ? 'Guardian' : 'Parent'}
                </span>
                {parentEmail ? (
                  <span className="inline-flex min-w-0 items-center gap-1 break-all">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    {parentEmail}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Users className="h-4 w-4" />
              Students
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950">{students.length}</div>
            <div className="mt-1 text-sm text-slate-600">Connected to your family</div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              <Clock3 className="h-4 w-4" />
              Needs Attention
            </div>
            <div className="mt-2 text-2xl font-black text-slate-950">{actionCount}</div>
            <div className="mt-1 text-sm text-slate-600">
              {actionCount === 1 ? 'Family item to review' : 'Family items to review'}
            </div>
          </div>
        </div>
      </div>

      {error ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">
          {error}
        </div>
      ) : null}

      {students.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-brand-300 bg-brand-50 p-5">
          <div className="flex items-start gap-3">
            <Users className="mt-0.5 h-6 w-6 shrink-0 text-brand-700" />
            <div>
              <h2 className="font-black text-slate-950">No student profile is connected yet</h2>
              <p className="mt-1 max-w-2xl text-sm text-slate-700">
                Connect to an existing student with their family link code or create a managed
                profile that they can claim later.
              </p>
              {pendingConnectionCount > 0 ? (
                <p className="mt-3 text-sm font-semibold text-amber-800">
                  {pendingConnectionCount} connection{' '}
                  {pendingConnectionCount === 1 ? 'request is' : 'requests are'} awaiting student
                  approval.
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-3">
                <Link href="/dashboard/family?studentAction=link" className="btn-secondary">
                  Connect Existing Student
                </Link>
                <Link href="/dashboard/family?studentAction=create" className="btn-primary">
                  Create Student Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Your Students</h2>
              <p className="mt-1 text-sm text-slate-700">
                Select a student to make them active across your family dashboard, documents, and
                LifePath views.
              </p>
            </div>
            <Link
              href="/dashboard/family"
              className="text-sm font-bold text-brand-700 hover:text-brand-800"
            >
              Manage students
            </Link>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {students.map((student) => {
              const isActive = student.id === activeStudentProfileId
              const status = studentStatus(student)
              return (
                <button
                  key={student.id}
                  type="button"
                  className={`group rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                    isActive
                      ? 'border-brand-400 bg-brand-50 shadow-soft'
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50'
                  }`}
                  disabled={savingStudentId !== null}
                  aria-pressed={isActive}
                  onClick={() => void makeActive(student.id)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate font-black text-slate-950">
                          {studentName(student)}
                        </div>
                        {isActive ? (
                          <span className="rounded-full bg-brand-600 px-2 py-0.5 text-xs font-bold text-white">
                            Active
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-700">
                        <span className="inline-flex items-center gap-1">
                          <GraduationCap className="h-4 w-4 text-brand-700" />
                          {schoolLevelLabel(student)}
                        </span>
                        {student.graduation_year ? (
                          <span>Class of {student.graduation_year}</span>
                        ) : null}
                      </div>
                    </div>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-brand-700" />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <School className="h-4 w-4 shrink-0 text-slate-500" />
                    <span className="truncate">{student.schools?.name || 'School not set'}</span>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <span className="text-xs text-slate-600">
                      {savingStudentId === student.id
                        ? 'Switching...'
                        : isActive
                          ? 'Current family context'
                          : 'Make active'}
                    </span>
                  </div>
                  <div className="mt-2 text-xs text-slate-600">{status.detail}</div>
                </button>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <Link href="/dashboard/family" className="btn-secondary">
              Manage Students
            </Link>
            <Link href="/dashboard/family?studentAction=create" className="btn-primary">
              Create Another Profile
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
