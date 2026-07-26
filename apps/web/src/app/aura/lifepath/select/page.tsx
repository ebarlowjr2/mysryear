import { redirect } from 'next/navigation'
import CareerSelectionGrid from '@/features/aura/lifepath/components/CareerSelectionGrid'
import { requireAuraLifePathContext } from '@/lib/aura-lifepath'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'

export default async function LifePathSelectPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/select')
  if (context.role === 'parent' || context.role === 'guardian')
    redirect('/aura/lifepath/simulation/select')
  if (context.role === 'counselor') redirect('/aura/lifepath')
  const studentProfile = await getActiveStudentProfileSummary()
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks />
      <ActiveStudentHeader studentProfile={studentProfile} />
      <CareerSelectionGrid />
    </section>
  )
}
