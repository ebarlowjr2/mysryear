// Opportunities data layer
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Opportunity, CreateOpportunityInput, UpdateOpportunityInput } from '../types'

export async function getOpportunities(
  supabase: SupabaseClient,
  options?: {
    activeOnly?: boolean
    limit?: number
    offset?: number
  }
): Promise<Opportunity[]> {
  let query = supabase
    .from('opportunities')
    .select(`
      *,
      profiles!opportunities_business_user_id_fkey(org_name, org_state)
    `)
    .order('created_at', { ascending: false })

  if (options?.activeOnly !== false) {
    query = query.eq('is_active', true)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  if (options?.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching opportunities:', error)
    return []
  }

  return (data || []).map(opp => ({
    ...opp,
    business_name: opp.profiles?.org_name || null,
    business_state: opp.profiles?.org_state || null,
    profiles: undefined
  })) as Opportunity[]
}

export async function getOpportunityById(
  supabase: SupabaseClient,
  id: string
): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select(`
      *,
      profiles!opportunities_business_user_id_fkey(org_name, org_state)
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching opportunity:', error)
    return null
  }

  return {
    ...data,
    business_name: data.profiles?.org_name || null,
    business_state: data.profiles?.org_state || null,
    profiles: undefined
  } as Opportunity
}

export async function getBusinessOpportunities(
  supabase: SupabaseClient,
  businessUserId: string
): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('business_user_id', businessUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching business opportunities:', error)
    return []
  }

  return data as Opportunity[]
}

export async function createOpportunity(
  supabase: SupabaseClient,
  businessUserId: string,
  input: CreateOpportunityInput
): Promise<{ opportunity: Opportunity | null; error: string | null }> {
  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      business_user_id: businessUserId,
      title: input.title,
      description: input.description || null,
      opportunity_type: input.opportunity_type || 'other',
      location: input.location || null,
      is_remote: input.is_remote || false,
      deadline: input.deadline || null,
      spots_available: input.spots_available || null,
      requirements: input.requirements || null,
      contact_email: input.contact_email || null,
      external_url: input.external_url || null,
      is_active: true
    })
    .select()
    .single()

  if (error) {
    return { opportunity: null, error: error.message }
  }

  return { opportunity: data as Opportunity, error: null }
}

export async function updateOpportunity(
  supabase: SupabaseClient,
  id: string,
  businessUserId: string,
  updates: UpdateOpportunityInput
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('opportunities')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .eq('business_user_id', businessUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function deleteOpportunity(
  supabase: SupabaseClient,
  id: string,
  businessUserId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)
    .eq('business_user_id', businessUserId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export async function toggleOpportunityActive(
  supabase: SupabaseClient,
  id: string,
  businessUserId: string,
  isActive: boolean
): Promise<{ success: boolean; error: string | null }> {
  return updateOpportunity(supabase, id, businessUserId, { is_active: isActive })
}
