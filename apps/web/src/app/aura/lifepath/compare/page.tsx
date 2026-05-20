import LifePathCompareDashboard from '@/features/aura/lifepath/components/LifePathCompareDashboard'
import { requireSessionProfile } from '@/lib/auth'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'

export default async function LifePathComparePage() {
  await requireSessionProfile('/aura/lifepath/compare')
  const studentProfile = await getActiveStudentProfileSummary()
  return (
    <section className="container-prose pt-10 pb-20">
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathCompareDashboard />
    </section>
  )
}
