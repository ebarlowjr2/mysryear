'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MapPin, Calendar, ExternalLink, Building2, Mail, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import type { Opportunity, OpportunityType } from '@mysryear/shared'

const OPPORTUNITY_TYPE_LABELS: Record<OpportunityType, string> = {
  internship: 'Internship',
  apprenticeship: 'Apprenticeship',
  job_shadow: 'Job Shadow',
  volunteer: 'Volunteer',
  workshop: 'Workshop',
  other: 'Other'
}

export default function OpportunityDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [loading, setLoading] = useState(true)
  const [opportunity, setOpportunity] = useState<Opportunity | null>(null)

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
          .select('onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        const { data: opp } = await supabase
          .from('opportunities')
          .select(`
            *,
            profiles!opportunities_business_user_id_fkey(org_name, org_state)
          `)
          .eq('id', params.id)
          .single()

        if (!opp) {
          router.push('/opportunities')
          return
        }

        setOpportunity({
          ...opp,
          business_name: opp.profiles?.org_name || 'Unknown Business',
          business_state: opp.profiles?.org_state || null,
          profiles: undefined
        } as Opportunity)

        setLoading(false)
      } catch (err) {
        console.error('Error loading opportunity:', err)
        router.push('/opportunities')
      }
    }

    loadData()
  }, [router, supabase, params.id])

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  if (loading || !opportunity) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <Link href="/opportunities" className="flex items-center gap-2 text-slate-600 hover:text-brand-600 mb-4">
          <ArrowLeft className="w-4 h-4" />
          Back to Opportunities
        </Link>

        <div className="flex justify-between items-start">
          <div>
            <span className="px-3 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 mb-2 inline-block">
              {OPPORTUNITY_TYPE_LABELS[opportunity.opportunity_type]}
            </span>
            <h1 className="text-3xl font-black tracking-tight mt-2">{opportunity.title}</h1>
            <div className="flex items-center gap-2 text-slate-600 mt-2">
              <Building2 className="w-5 h-5" />
              <span className="text-lg">{opportunity.business_name}</span>
              {opportunity.business_state && (
                <span className="text-slate-400">• {opportunity.business_state}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {opportunity.description && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Description</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{opportunity.description}</p>
            </div>
          )}

          {opportunity.requirements && (
            <div className="card p-6">
              <h2 className="text-lg font-bold mb-4">Requirements</h2>
              <p className="text-slate-700 whitespace-pre-wrap">{opportunity.requirements}</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Details</h2>
            <div className="space-y-4">
              {(opportunity.location || opportunity.is_remote) && (
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Location</p>
                    <p className="text-slate-600">
                      {opportunity.is_remote ? 'Remote' : opportunity.location}
                    </p>
                  </div>
                </div>
              )}

              {opportunity.deadline && (
                <div className="flex items-start gap-3">
                  <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Application Deadline</p>
                    <p className="text-slate-600">{formatDate(opportunity.deadline)}</p>
                  </div>
                </div>
              )}

              {opportunity.spots_available && (
                <div className="flex items-start gap-3">
                  <Users className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Spots Available</p>
                    <p className="text-slate-600">{opportunity.spots_available}</p>
                  </div>
                </div>
              )}

              {opportunity.contact_email && (
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="font-medium">Contact</p>
                    <a href={`mailto:${opportunity.contact_email}`} className="text-brand-600 hover:underline">
                      {opportunity.contact_email}
                    </a>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-bold mb-4">Apply</h2>
            {opportunity.external_url ? (
              <a
                href={opportunity.external_url}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Apply Now
              </a>
            ) : opportunity.contact_email ? (
              <a
                href={`mailto:${opportunity.contact_email}?subject=Application for ${opportunity.title}`}
                className="btn-primary w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                Email to Apply
              </a>
            ) : (
              <p className="text-slate-500 text-center">Contact the organization directly to apply</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
