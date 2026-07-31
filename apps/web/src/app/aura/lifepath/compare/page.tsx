import { redirect } from 'next/navigation'
import LifePathCompareDashboard from '@/features/aura/lifepath/components/LifePathCompareDashboard'
import { requireAuraLifePathContext } from '@/lib/aura-lifepath'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'

export default async function LifePathComparePage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/compare')
  if (context.role !== 'student') redirect('/aura/lifepath')
  const studentProfile = await getActiveStudentProfileSummary()
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks />
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathCompareDashboard />
    </section>
  )
}
