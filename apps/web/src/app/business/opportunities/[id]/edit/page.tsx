import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import OpportunityForm from '../../../ui/OpportunityForm'

type Props = { params: Promise<{ id: string }> }

export default async function EditBusinessOpportunityPage({ params }: Props) {
  await requireSessionProfile('/business/opportunities/edit')
  const { id } = await params
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = session
    ? await supabase.from('business_profiles').select('id').eq('owner_user_id', session.user.id).maybeSingle()
    : { data: null }

  if (!profile?.id) redirect('/business/onboarding')

  const { data: opportunity } = await supabase
    .from('business_opportunities')
    .select('*')
    .eq('id', id)
    .eq('business_profile_id', profile.id)
    .maybeSingle()

  if (!opportunity) notFound()

  return (
    <div className="container-prose py-14">
      <div className="mb-6"><Link href="/business/dashboard" className="text-sm font-semibold text-brand-700">Back to Business Dashboard</Link></div>
      <OpportunityForm mode="edit" initialOpportunity={opportunity} />
    </div>
  )
}
