import LifePathDashboard from '@/features/aura/lifepath/components/LifePathDashboard'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import { requireAuraLifePathContext } from '@/lib/aura-lifepath'
import LifePathFeedbackPanel from '@/features/aura/lifepath/components/parent/LifePathFeedbackPanel'

export default async function LinkedStudentLifePathPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/student')
  const studentProfile = await getActiveStudentProfileSummary()
  const readOnly = !context.canEditOfficialLifePath
  return (
    <section className="container-prose pt-10 pb-20 space-y-6">
      <div className="flex flex-wrap gap-3">
        <a href="/aura/lifepath" className="btn-secondary">
          Back to LifePath Options
        </a>
        <a href="/aura" className="btn-secondary">
          Back to A.U.R.A
        </a>
      </div>
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathDashboard
        readOnly={readOnly}
        title={readOnly ? 'Student LifePath' : 'My LifePath Dashboard'}
        subtitle={
          readOnly
            ? 'Viewing the official LifePath for the active linked student. Editing is disabled for this role.'
            : undefined
        }
        badge={readOnly ? 'Linked Student LifePath' : 'A.U.R.A LifePath'}
      />
      <LifePathFeedbackPanel
        studentProfileId={context.officialStudentProfileId}
        canAdd={context.canAddFeedback}
      />
    </section>
  )
}
