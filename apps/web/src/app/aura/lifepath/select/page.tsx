import CareerSelectionGrid from '@/features/aura/lifepath/components/CareerSelectionGrid'
import { requireSessionProfile } from '@/lib/auth'

export default async function LifePathSelectPage() {
  await requireSessionProfile('/aura/lifepath/select')
  return (
    <section className="container-prose pt-10 pb-20">
      <CareerSelectionGrid />
    </section>
  )
}
