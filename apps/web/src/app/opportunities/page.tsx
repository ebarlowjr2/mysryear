import Link from 'next/link'
import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import { BriefcaseBusiness, MapPin, Search } from 'lucide-react'

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

type BusinessSummary = { organization_name: string | null; industry: string | null; verified: boolean | null }

type OpportunityRow = {
  id: string
  title: string
  opportunity_type: string
  description: string
  city: string | null
  state: string | null
  remote_available: boolean | null
  career_category: string | null
  deadline: string | null
  paid: boolean | null
  compensation: string | null
  business_profiles?: BusinessSummary | BusinessSummary[] | null
}

function one(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ').replace(/\w/g, (c) => c.toUpperCase()) : 'Opportunity'
}

export default async function OpportunitiesPage({ searchParams }: Props) {
  await requireSessionProfile('/opportunities')
  const params = await searchParams
  const type = one(params.type)?.trim()
  const category = one(params.category)?.trim()
  const state = one(params.state)?.trim().toUpperCase()
  const remote = one(params.remote)

  const supabase = await createNextServerSupabaseClient()
  let query = supabase
    .from('business_opportunities')
    .select('id,title,opportunity_type,description,city,state,remote_available,career_category,deadline,paid,compensation,business_profiles(organization_name,industry,verified)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(100)

  if (type) query = query.eq('opportunity_type', type)
  if (category) query = query.ilike('career_category', `%${category}%`)
  if (state) query = query.eq('state', state)
  if (remote === 'true') query = query.eq('remote_available', true)

  const { data: opportunities, error } = await query

  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <div className="badge">Career Opportunities</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Business Opportunities Board</h1>
        <p className="mt-3 text-slate-700 max-w-3xl">
          Browse internships, volunteer roles, job shadowing, apprenticeships, workshops, career events, and student programs.
        </p>
      </div>

      <form className="card p-4 mb-8 grid sm:grid-cols-5 gap-3" action="/opportunities">
        <label className="text-sm font-semibold text-slate-700 sm:col-span-1">
          Type
          <select name="type" defaultValue={type || ''} className="input mt-2 w-full px-3 py-2 rounded-lg">
            <option value="">All</option>
            {['internship','volunteer','job_shadowing','apprenticeship','mentorship','workshop','summer_program','part_time_job','career_event'].map((item) => <option key={item} value={item}>{label(item)}</option>)}
          </select>
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-1">
          Category
          <input name="category" defaultValue={category || ''} className="input mt-2 w-full px-3 py-2 rounded-lg" placeholder="Technology" />
        </label>
        <label className="text-sm font-semibold text-slate-700 sm:col-span-1">
          State
          <input name="state" defaultValue={state || ''} className="input mt-2 w-full px-3 py-2 rounded-lg" placeholder="AL" maxLength={2} />
        </label>
        <label className="flex items-end gap-2 text-sm font-semibold text-slate-700 sm:col-span-1 pb-2">
          <input type="checkbox" name="remote" value="true" defaultChecked={remote === 'true'} /> Remote
        </label>
        <button className="btn-primary sm:mt-7" type="submit"><Search className="w-4 h-4" /> Filter</button>
      </form>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error.message}</div> : null}

      <div className="grid md:grid-cols-2 gap-6">
        {((opportunities || []) as unknown as OpportunityRow[]).length === 0 ? (
          <div className="card p-6 md:col-span-2 text-slate-700">No active opportunities match these filters yet.</div>
        ) : (
          ((opportunities || []) as unknown as OpportunityRow[]).map((opportunity) => {
            const businessProfile = Array.isArray(opportunity.business_profiles) ? opportunity.business_profiles[0] : opportunity.business_profiles
            return (
            <Link key={opportunity.id} href={`/opportunities/${opportunity.id}`} className="card p-6 hover:shadow-lg transition block">
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-brand-50 text-brand-700 p-3"><BriefcaseBusiness className="w-6 h-6" /></div>
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="badge">{label(opportunity.opportunity_type)}</span>
                    {opportunity.career_category ? <span className="badge">{opportunity.career_category}</span> : null}
                    {opportunity.paid ? <span className="badge">Paid</span> : null}
                  </div>
                  <h2 className="text-xl font-black tracking-tight">{opportunity.title}</h2>
                  <p className="mt-1 text-sm font-semibold text-slate-700">{businessProfile?.organization_name || 'Business partner'}</p>
                  <p className="mt-3 text-sm text-slate-600 line-clamp-3">{opportunity.description}</p>
                  <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1"><MapPin className="w-3 h-3" />{[opportunity.city, opportunity.state].filter(Boolean).join(', ') || (opportunity.remote_available ? 'Remote' : 'Location TBD')}</span>
                    {opportunity.deadline ? <span>Deadline {new Date(opportunity.deadline).toLocaleDateString()}</span> : null}
                    {opportunity.compensation ? <span>{opportunity.compensation}</span> : null}
                  </div>
                </div>
              </div>
            </Link>
            )
          })
        )}
      </div>
    </div>
  )
}
