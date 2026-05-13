import { requireSessionProfile } from '@/lib/auth'
import LifePathDashboard from '@/features/aura/lifepath/components/LifePathDashboard'

export default async function LifePathLandingPage() {
  await requireSessionProfile('/aura/lifepath')
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathDashboard />
    </section>
  )
}
