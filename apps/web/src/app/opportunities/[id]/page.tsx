import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import SaveOpportunityButton from '../ui/SaveOpportunityButton'

type Props = { params: Promise<{ id: string }> }

type OpportunityDetail = {
  id: string
  title: string
  opportunity_type: string
  description: string
  location_type: string | null
  city: string | null
  state: string | null
  remote_available: boolean | null
  age_min: number | null
  grade_min: string | null
  grade_max: string | null
  career_category: string | null
  skills: string[] | null
  application_url: string | null
  contact_email: string | null
  deadline: string | null
  start_date: string | null
  end_date: string | null
  paid: boolean | null
  compensation: string | null
  hours_required: string | null
  business_profiles?: {
    organization_name: string | null
    contact_email: string | null
    website: string | null
    industry: string | null
    description: string | null
    address_city: string | null
    address_state: string | null
    verified: boolean | null
  } | null
}

function label(value: string | null | undefined) {
  return value ? value.replaceAll('_', ' ').replace(/\w/g, (c) => c.toUpperCase()) : 'Opportunity'
}

export default async function OpportunityDetailPage({ params }: Props) {
  await requireSessionProfile('/opportunities')
  const { id } = await params
  const supabase = await createNextServerSupabaseClient()
  const { data } = await supabase
    .from('business_opportunities')
    .select('*, business_profiles(organization_name,contact_email,website,industry,description,address_city,address_state,verified)')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle()

  if (!data) notFound()
  const opportunity = data as OpportunityDetail
  const applicationHref = opportunity.application_url || (opportunity.contact_email ? `mailto:${opportunity.contact_email}` : null)

  return (
    <div className="container-prose py-14">
      <div className="mb-6"><Link href="/opportunities" className="text-sm font-semibold text-brand-700">Back to Opportunity Board</Link></div>
      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        <article className="card p-8">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="badge">{label(opportunity.opportunity_type)}</span>
            {opportunity.career_category ? <span className="badge">{opportunity.career_category}</span> : null}
            {opportunity.paid ? <span className="badge">Paid</span> : null}
            {opportunity.remote_available ? <span className="badge">Remote Available</span> : null}
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight">{opportunity.title}</h1>
          <p className="mt-3 font-semibold text-slate-700">{opportunity.business_profiles?.organization_name || 'Business partner'}</p>
          <div className="mt-6 prose prose-slate max-w-none whitespace-pre-line text-slate-700">{opportunity.description}</div>

          {opportunity.skills?.length ? (
            <div className="mt-8">
              <h2 className="text-lg font-black">Skills students may practice</h2>
              <div className="mt-3 flex flex-wrap gap-2">{opportunity.skills.map((skill) => <span key={skill} className="badge">{skill}</span>)}</div>
            </div>
          ) : null}
        </article>

        <aside className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-black">Opportunity Details</h2>
            <dl className="mt-4 space-y-3 text-sm text-slate-700">
              <div><dt className="font-semibold">Location</dt><dd>{[opportunity.city, opportunity.state].filter(Boolean).join(', ') || (opportunity.remote_available ? 'Remote' : 'TBD')}</dd></div>
              <div><dt className="font-semibold">Grades</dt><dd>{[opportunity.grade_min, opportunity.grade_max].filter(Boolean).join('–') || 'Not specified'}</dd></div>
              <div><dt className="font-semibold">Age minimum</dt><dd>{opportunity.age_min || 'Not specified'}</dd></div>
              <div><dt className="font-semibold">Deadline</dt><dd>{opportunity.deadline ? new Date(opportunity.deadline).toLocaleDateString() : 'Open until filled'}</dd></div>
              <div><dt className="font-semibold">Dates</dt><dd>{[opportunity.start_date, opportunity.end_date].filter(Boolean).map((d) => new Date(String(d)).toLocaleDateString()).join(' – ') || 'Flexible/TBD'}</dd></div>
              <div><dt className="font-semibold">Compensation</dt><dd>{opportunity.compensation || (opportunity.paid ? 'Paid' : 'Not specified')}</dd></div>
              <div><dt className="font-semibold">Hours</dt><dd>{opportunity.hours_required || 'Not specified'}</dd></div>
            </dl>
            <div className="mt-5 flex flex-col gap-3">
              {applicationHref ? <a className="btn-primary text-center" href={applicationHref} target={opportunity.application_url ? '_blank' : undefined} rel="noreferrer">Apply or Contact</a> : null}
              <SaveOpportunityButton opportunityId={opportunity.id} />
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-black">About the Organization</h2>
            <p className="mt-2 text-sm font-semibold text-slate-800">{opportunity.business_profiles?.organization_name || 'Business partner'}</p>
            <p className="mt-2 text-sm text-slate-600">{opportunity.business_profiles?.description || opportunity.business_profiles?.industry || 'Organization details coming soon.'}</p>
            {opportunity.business_profiles?.website ? <a className="mt-4 inline-flex text-sm font-semibold text-brand-700" href={opportunity.business_profiles.website} target="_blank" rel="noreferrer">Visit website</a> : null}
          </div>
        </aside>
      </div>
    </div>
  )
}
