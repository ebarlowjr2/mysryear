import SimulationDashboard from '@/features/aura/lifepath/components/simulation/SimulationDashboard'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'
import { isFamilyRole, requireAuraLifePathContext } from '@/lib/aura-lifepath'
import { redirect } from 'next/navigation'

export default async function ParentSimulationPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/simulation')
  if (!isFamilyRole(context.role)) redirect('/aura/lifepath')
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks backHref="/aura/lifepath" backLabel="Back to LifePath Options" />
      <SimulationDashboard />
    </section>
  )
}
