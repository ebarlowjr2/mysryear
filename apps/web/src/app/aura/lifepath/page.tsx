import LifePathIntroHero from '@/features/aura/lifepath/components/LifePathIntroHero'
import { requireSessionProfile } from '@/lib/auth'

export default async function LifePathLandingPage() {
  await requireSessionProfile('/aura/lifepath')
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathIntroHero />
    </section>
  )
}
