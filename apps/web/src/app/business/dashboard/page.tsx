import Link from 'next/link'
import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import BusinessProfileForm from '../ui/BusinessProfileForm'
import BusinessOpportunityActions from '../ui/BusinessOpportunityActions'
import { labelFromValue, type BusinessOpportunity } from '../ui/business-types'

export default async function BusinessDashboardPage() {
  await requireSessionProfile('/business/dashboard')
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()

  const { data: profile } = session
    ? await supabase.from('business_profiles').select('*').eq('owner_user_id', session.user.id).maybeSingle()
    : { data: null }

  const { data: opportunities } = profile?.id
    ? await supabase
        .from('business_opportunities')
        .select('*')
        .eq('business_profile_id', profile.id)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <div className="container-prose py-14">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
        <div>
          <div className="badge">Business Dashboard</div>
          <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Opportunity Posting Center</h1>
          <p className="mt-3 text-slate-700 max-w-3xl">Post career exposure opportunities for MySRYear students and families.</p>
        </div>
        {profile?.id ? <Link href="/business/opportunities/new" className="btn-primary">Create Opportunity</Link> : null}
      </div>

      {!profile?.id ? (
        <div className="card p-6 mb-8">
          <h2 className="text-xl font-black">Create your business profile first</h2>
          <p className="mt-2 text-sm text-slate-700">You need an organization profile before posting opportunities.</p>
          <div className="mt-4"><Link href="/business/onboarding" className="btn-primary">Set Up Business Profile</Link></div>
        </div>
      ) : null}

      {profile?.id ? <div className="mb-8"><BusinessProfileForm initialProfile={profile} /></div> : null}

      <div className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-black tracking-tight">Your Postings</h2>
            <p className="mt-1 text-sm text-slate-600">Draft and pending postings are visible only to your organization.</p>
          </div>
          {profile?.id ? <Link href="/business/opportunities/new" className="btn-secondary">New Posting</Link> : null}
        </div>
        <div className="mt-6 space-y-4">
          {(opportunities || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">No opportunities posted yet.</div>
          ) : (
            (opportunities as BusinessOpportunity[]).map((opportunity) => (
              <div key={opportunity.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <span className="badge">{labelFromValue(opportunity.opportunity_type)}</span>
                      <span className="badge">{labelFromValue(opportunity.status || 'active')}</span>
                    </div>
                    <h3 className="font-black text-lg">{opportunity.title}</h3>
                    <p className="mt-1 text-sm text-slate-600 line-clamp-2">{opportunity.description}</p>
                    <div className="mt-2 text-xs text-slate-500">
                      {[opportunity.city, opportunity.state].filter(Boolean).join(', ') || (opportunity.remote_available ? 'Remote' : 'Location TBD')}
                      {opportunity.deadline ? ` • Deadline ${new Date(opportunity.deadline).toLocaleDateString()}` : ''}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 md:items-end">
                    <Link href={`/business/opportunities/${opportunity.id}/edit`} className="btn-secondary">Edit</Link>
                    <BusinessOpportunityActions opportunity={opportunity} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
