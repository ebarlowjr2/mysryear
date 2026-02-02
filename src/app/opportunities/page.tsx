'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Briefcase, MapPin, Calendar, ExternalLink, ArrowLeft, Building2, Bookmark } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { listTrackedOpportunities } from '@mysryear/shared'
import type { Opportunity, OpportunityType } from '@mysryear/shared'

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  apprenticeship: 'Apprenticeship',
  job_shadow: 'Job Shadow',
  volunteer: 'Volunteer',
  workshop: 'Workshop',
  other: 'Other'
}

export default function OpportunitiesPage() {
  const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [opportunities, setOpportunities] = useState<Opportunity[]>([])
    const [filterType, setFilterType] = useState<OpportunityType | 'all'>('all')
    const [viewMode, setViewMode] = useState<'all' | 'saved'>('all')
    const [trackedOppIds, setTrackedOppIds] = useState<Set<string>>(new Set())

    const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role, onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

                if (profile.role === 'business') {
          router.push('/opportunities/manage')
          return
        }

        const { data: opps } = await supabase
          .from('opportunities')
          .select(`
            *,
            profiles!opportunities_business_user_id_fkey(org_name, org_state)
          `)
          .eq('is_active', true)
          .order('created_at', { ascending: false })

        const mappedOpps = (opps || []).map(opp => ({
          ...opp,
          business_name: opp.profiles?.org_name || 'Unknown Business',
          business_state: opp.profiles?.org_state || null,
          profiles: undefined
        })) as Opportunity[]

                setOpportunities(mappedOpps)

                const trackedIds = await listTrackedOpportunities(supabase)
                setTrackedOppIds(new Set(trackedIds))

                setLoading(false)
      } catch (err) {
        console.error('Error loading opportunities:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

    const baseOpportunities = viewMode === 'saved'
      ? opportunities.filter(o => trackedOppIds.has(o.id))
      : opportunities

    const filteredOpportunities = filterType === 'all'
      ? baseOpportunities
      : baseOpportunities.filter(o => o.opportunity_type === filterType)

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="flex items-center gap-4 mb-8">
        <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-4xl font-black tracking-tight">Opportunities</h1>
          <p className="text-slate-700 mt-2">Explore internships, apprenticeships, and more</p>
        </div>
      </div>

            <div className="mb-6 space-y-4">
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-4 py-2 font-medium transition border-b-2 -mb-px ${
                    viewMode === 'all'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  All Opportunities
                </button>
                <button
                  onClick={() => setViewMode('saved')}
                  className={`px-4 py-2 font-medium transition border-b-2 -mb-px flex items-center gap-2 ${
                    viewMode === 'saved'
                      ? 'border-brand-600 text-brand-600'
                      : 'border-transparent text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Bookmark className="w-4 h-4" />
                  Saved ({trackedOppIds.size})
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    filterType === 'all'
                      ? 'bg-brand-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  All Types
                </button>
                {(Object.keys(OPPORTUNITY_TYPE_LABELS) as OpportunityType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setFilterType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                      filterType === type
                        ? 'bg-brand-600 text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {OPPORTUNITY_TYPE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

      {filteredOpportunities.length === 0 ? (
        <div className="card p-12 text-center">
          <Briefcase className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No opportunities found</h3>
          <p className="text-slate-500">Check back later for new opportunities</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOpportunities.map(opp => (
            <div key={opp.id} className="card p-6 hover:shadow-lg transition">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{opp.title}</h3>
                  <div className="flex items-center gap-2 text-slate-600 mt-1">
                    <Building2 className="w-4 h-4" />
                    <span>{opp.business_name}</span>
                  </div>
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700">
                  {OPPORTUNITY_TYPE_LABELS[opp.opportunity_type]}
                </span>
              </div>

              {opp.description && (
                <p className="text-slate-600 mb-4 line-clamp-2">{opp.description}</p>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-slate-500 mb-4">
                {(opp.location || opp.is_remote) && (
                  <div className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    <span>{opp.is_remote ? 'Remote' : opp.location}</span>
                  </div>
                )}
                {opp.deadline && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>Deadline: {formatDate(opp.deadline)}</span>
                  </div>
                )}
                {opp.spots_available && (
                  <span>{opp.spots_available} spots available</span>
                )}
              </div>

              <div className="flex gap-3">
                <Link
                  href={`/opportunities/${opp.id}`}
                  className="btn-primary px-4 py-2 rounded-lg text-sm font-medium"
                >
                  View Details
                </Link>
                {opp.external_url && (
                  <a
                    href={opp.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium border border-slate-200 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Apply
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
