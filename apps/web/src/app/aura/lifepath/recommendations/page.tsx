import { redirect } from 'next/navigation'
import StudentRecommendationInbox from '@/features/aura/lifepath/components/recommendations/StudentRecommendationInbox'
import { requireAuraLifePathContext } from '@/lib/aura-lifepath'

export default async function LifePathRecommendationsPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/recommendations')
  if (context.role !== 'student') redirect('/aura/lifepath')
  return (
    <section className="container-prose pt-10 pb-20">
      <StudentRecommendationInbox />
    </section>
  )
}
