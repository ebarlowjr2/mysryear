import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import OpportunityForm from '../../ui/OpportunityForm'

export default async function NewBusinessOpportunityPage() {
  await requireSessionProfile('/business/opportunities/new')
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = session
    ? await supabase.from('business_profiles').select('id').eq('owner_user_id', session.user.id).maybeSingle()
    : { data: null }

  if (!profile?.id) redirect('/business/onboarding')

  return (
    <div className="container-prose py-14">
      <div className="mb-6"><Link href="/business/dashboard" className="text-sm font-semibold text-brand-700">Back to Business Dashboard</Link></div>
      <OpportunityForm mode="create" />
    </div>
  )
}
