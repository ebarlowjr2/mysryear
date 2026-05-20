import { requireSessionProfile } from '@/lib/auth'
import LifePathDashboard from '@/features/aura/lifepath/components/LifePathDashboard'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'

export default async function LifePathLandingPage() {
  await requireSessionProfile('/aura/lifepath')
  const studentProfile = await getActiveStudentProfileSummary()
  return (
    <section className="container-prose pt-10 pb-20">
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathDashboard />
    </section>
  )
}
