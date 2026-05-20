import CareerSelectionGrid from '@/features/aura/lifepath/components/CareerSelectionGrid'
import { requireSessionProfile } from '@/lib/auth'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'

export default async function LifePathSelectPage() {
  await requireSessionProfile('/aura/lifepath/select')
  const studentProfile = await getActiveStudentProfileSummary()
  return (
    <section className="container-prose pt-10 pb-20">
      <ActiveStudentHeader studentProfile={studentProfile} />
      <CareerSelectionGrid />
    </section>
  )
}
