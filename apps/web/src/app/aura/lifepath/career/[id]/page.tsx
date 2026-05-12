import LifePathCareerDetail from '@/features/aura/lifepath/components/LifePathCareerDetail'
import { CAREERS } from '@/features/aura/lifepath/data/careers'
import { requireSessionProfile } from '@/lib/auth'

export default async function LifePathCareerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireSessionProfile('/aura/lifepath/compare')
  const { id } = await params
  const career = CAREERS.find((c) => c.id === id)

  if (!career) {
    return (
      <section className="container-prose pt-10 pb-20">
        <div className="card p-8">
          <div className="text-2xl font-black">Career not found</div>
          <p className="mt-2 text-slate-700">Pick a career from the compare screen.</p>
        </div>
      </section>
    )
  }

  return (
    <section className="container-prose pt-10 pb-20">
      <LifePathCareerDetail career={career} />
    </section>
  )
}
