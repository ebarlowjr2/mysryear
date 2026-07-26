import LifePathCareerDetail from '@/features/aura/lifepath/components/LifePathCareerDetail'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'
import { CAREERS } from '@/features/aura/lifepath/data/careers'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import { requireAuraLifePathContext } from '@/lib/aura-lifepath'

export default async function LifePathCareerPage({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireAuraLifePathContext('/aura/lifepath/career')
  const studentProfile = await getActiveStudentProfileSummary()
  const { id } = await params
  const career = CAREERS.find((c) => c.id === id)
  const isLinkedReadOnly = context.role !== 'student'

  if (!career) {
    return (
      <section className="container-prose pt-10 pb-20">
        <LifePathBackLinks />
        <div className="card p-8">
          <div className="text-2xl font-black">Career not found</div>
          <p className="mt-2 text-slate-700">Pick a career from LifePath.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks
        backHref={isLinkedReadOnly ? '/aura/lifepath/student' : '/aura/lifepath'}
        backLabel={isLinkedReadOnly ? 'Back to Student LifePath' : 'Back to LifePath'}
      />
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathCareerDetail
        career={career}
        readOnly={isLinkedReadOnly}
        badge={isLinkedReadOnly ? 'Linked Student LifePath' : 'A.U.R.A LifePath'}
        backHref={isLinkedReadOnly ? '/aura/lifepath/student' : '/aura/lifepath'}
        backLabel={isLinkedReadOnly ? 'Back to Student LifePath' : 'Back to LifePath'}
        studentProfileId={context.officialStudentProfileId}
        canAddFeedback={context.canAddFeedback}
      />
    </section>
  )
}
