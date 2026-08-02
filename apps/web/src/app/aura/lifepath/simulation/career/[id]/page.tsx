import { redirect } from 'next/navigation'
import { CAREERS } from '@/features/aura/lifepath/data/careers'
import LifePathCareerDetail from '@/features/aura/lifepath/components/LifePathCareerDetail'
import LifePathBackLinks from '@/features/aura/lifepath/components/LifePathBackLinks'
import { isFamilyRole, requireAuraLifePathContext } from '@/lib/aura-lifepath'

export default async function ParentSimulationCareerPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const context = await requireAuraLifePathContext('/aura/lifepath/simulation/career')
  if (!isFamilyRole(context.role)) redirect('/aura/lifepath')
  const { id } = await params
  const career = CAREERS.find((item) => item.id === id)
  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathBackLinks
        backHref="/aura/lifepath/simulation"
        backLabel="Back to Parent Simulation"
      />
      {career ? (
        <LifePathCareerDetail
          career={career}
          badge="Parent Simulation"
          backHref="/aura/lifepath/simulation"
          backLabel="Back to Parent Simulation"
          readOnly
          simulation
        />
      ) : (
        <div className="card p-8">
          <div className="text-2xl font-black">Career not found</div>
        </div>
      )}
    </section>
  )
}
