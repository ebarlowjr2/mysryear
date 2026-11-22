import { requireSessionProfile } from '@/lib/auth'
import ScholarshipDetailView from './ScholarshipDetailView'

export const dynamic = 'force-dynamic'

export default async function ScholarshipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  await requireSessionProfile(`/scholarships/${id}`)
  return (
    <div className="container-prose py-10 md:py-12">
      <ScholarshipDetailView scholarshipId={id} />
    </div>
  )
}
