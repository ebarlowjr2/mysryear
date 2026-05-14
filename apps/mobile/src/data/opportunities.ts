import { supabase } from '../lib/supabase'

export type OpportunityType = 'internship' | 'webinar' | 'seminar'

export type Opportunity = {
  id: string
  created_by: string
  org_name: string
  title: string
  description: string
  type: OpportunityType
  start_at: string | null
  end_at: string | null
  apply_url: string | null
  is_remote: boolean
  state: string | null
  counties: string[]
  created_at: string
}

export async function getOpportunities(filters?: {
  type?: OpportunityType
  state?: string
  county?: string
}): Promise<Opportunity[]> {
  let query = supabase
    .from('opportunities')
    .select('*')
    .order('created_at', { ascending: false })

  if (filters?.type) {
    query = query.eq('type', filters.type)
  }

  if (filters?.state) {
    query = query.eq('state', filters.state)
  }

  const { data, error } = await query

  if (error) {
    console.warn('Failed to get opportunities:', error.message)
    return []
  }

  let opportunities = data as Opportunity[]

  if (filters?.county) {
    opportunities = opportunities.filter(
      (opp) => opp.counties.length === 0 || opp.counties.includes(filters.county!)
    )
  }

  return opportunities
}

export async function getMyOpportunities(userId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('created_by', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Failed to get my opportunities:', error.message)
    return []
  }

  return data as Opportunity[]
}

export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Opportunity
}

export async function createOpportunity(
  userId: string,
  opportunity: {
    org_name: string
    title: string
    description: string
    type: OpportunityType
    start_at?: string
    end_at?: string
    apply_url?: string
    is_remote?: boolean
    state?: string
    counties?: string[]
  }
): Promise<{ opportunity: Opportunity | null; error: string | null }> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      created_by: userId,
      org_name: opportunity.org_name,
      title: opportunity.title,
      description: opportunity.description,
      type: opportunity.type,
      start_at: opportunity.start_at || null,
      end_at: opportunity.end_at || null,
      apply_url: opportunity.apply_url || null,
      is_remote: opportunity.is_remote || false,
      state: opportunity.state || null,
      counties: opportunity.counties || [],
    })
    .select()
    .single()

  if (error) {
    return { opportunity: null, error: error.message }
  }

  return { opportunity: data as Opportunity, error: null }
}

export async function updateOpportunity(
  id: string,
  updates: Partial<Omit<Opportunity, 'id' | 'created_by' | 'created_at'>>
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('opportunities')
    .update(updates)
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function deleteOpportunity(id: string): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; icon: string }[] = [
  { value: 'internship', label: 'Internship', icon: 'briefcase-outline' },
  { value: 'webinar', label: 'Webinar', icon: 'videocam-outline' },
  { value: 'seminar', label: 'Seminar', icon: 'people-outline' },
]

export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]
