import Link from 'next/link'
import type { LinkedStudentSummary } from '@/lib/aura-lifepath'

type Props = {
  activeStudent: LinkedStudentSummary | null
  linkedStudents: LinkedStudentSummary[]
  hasStudentLifePath: boolean
  hasSimulation: boolean
}

function studentName(student: LinkedStudentSummary | null) {
  if (!student) return 'No active student selected'
  return [student.first_name, student.last_name].filter(Boolean).join(' ') || 'Student'
}

export default function ParentLifePathLanding({ activeStudent, linkedStudents, hasStudentLifePath, hasSimulation }: Props) {
  return (
    <div className="space-y-6">
      <div className="card p-8">
        <div className="badge">A.U.R.A LifePath for Families</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">How would you like to use LifePath?</h1>
        <p className="mt-3 max-w-2xl text-slate-700">
          You can review your student’s official LifePath or try the experience yourself in a separate Parent Simulation. Simulation choices never change your student’s plan.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Option 1</div>
          <h2 className="mt-2 text-2xl font-black">View My Student’s LifePath</h2>
          <p className="mt-2 text-slate-700">
            Active student: <span className="font-bold">{studentName(activeStudent)}</span>
            {activeStudent?.graduation_year ? ` • Class of ${activeStudent.graduation_year}` : ''}
            {activeStudent?.schools?.name ? ` • ${activeStudent.schools.name}` : ''}
          </p>
          {linkedStudents.length > 1 ? (
            <p className="mt-2 text-sm text-slate-600">Switch active students from Profile before opening their LifePath.</p>
          ) : null}
          <div className="mt-5 flex flex-wrap gap-3">
            {activeStudent ? (
              <Link href="/aura/lifepath/student" className="btn-primary">
                {hasStudentLifePath ? 'View Student LifePath' : 'View Student Setup'}
              </Link>
            ) : (
              <Link href="/profile" className="btn-primary">Add or Link a Student</Link>
            )}
            <Link href="/profile" className="btn-secondary">Manage Students</Link>
          </div>
        </div>

        <div className="card p-6 border-brand-200 bg-brand-50/50">
          <div className="text-sm font-semibold text-brand-700">Option 2</div>
          <h2 className="mt-2 text-2xl font-black">Try A.U.R.A LifePath</h2>
          <p className="mt-2 text-slate-700">
            Experience the A.U.R.A LifePath process yourself. Your selections and results will be saved as a Parent Simulation and will not change your student’s official LifePath.
          </p>
          <div className="mt-5">
            <Link href="/aura/lifepath/simulation" className="btn-primary">
              {hasSimulation ? 'Continue Parent Simulation' : 'Start Parent Simulation'}
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
