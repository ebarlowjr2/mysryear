import LifePathCompareDashboard from '@/features/aura/lifepath/components/LifePathCompareDashboard'
import { requireSessionProfile } from '@/lib/auth'

export default async function LifePathComparePage() {
  await requireSessionProfile('/aura/lifepath/compare')
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathCompareDashboard />
    </section>
  )
}
