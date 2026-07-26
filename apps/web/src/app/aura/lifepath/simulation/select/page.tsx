import SimulationSelectionGrid from '@/features/aura/lifepath/components/simulation/SimulationSelectionGrid'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'
import { isFamilyRole, requireAuraLifePathContext } from '@/lib/aura-lifepath'
import { redirect } from 'next/navigation'

export default async function ParentSimulationSelectPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath/simulation/select')
  if (!isFamilyRole(context.role)) redirect('/aura/lifepath')
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks
        backHref="/aura/lifepath/simulation"
        backLabel="Back to Parent Simulation"
      />
      <SimulationSelectionGrid />
    </section>
  )
}
