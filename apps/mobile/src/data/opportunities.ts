import { supabase } from '../lib/supabase'
import type { Profile } from './profile'

// Opportunity types matching the database schema
export type OpportunityType = 'internship' | 'webinar' | 'seminar' | 'volunteer'
export type LocationMode = 'local' | 'remote' | 'hybrid'

export interface Opportunity {
  id: string
  owner_user_id: string
  org_name: string | null
  title: string
  type: OpportunityType
  description: string | null
  apply_url: string | null
  location_mode: LocationMode
  state: string | null
  counties: string[] | null
  start_date: string | null
  deadline: string | null
  is_published: boolean
  created_at: string
  updated_at: string
}

export interface CreateOpportunityPayload {
  org_name?: string | null
  title: string
  type?: OpportunityType
  description?: string | null
  apply_url?: string | null
  location_mode?: LocationMode
  state?: string | null
  counties?: string[] | null
  start_date?: string | null
  deadline?: string | null
  is_published?: boolean
}

export interface UpdateOpportunityPayload {
  org_name?: string | null
  title?: string
  type?: OpportunityType
  description?: string | null
  apply_url?: string | null
  location_mode?: LocationMode
  state?: string | null
  counties?: string[] | null
  start_date?: string | null
  deadline?: string | null
  is_published?: boolean
}

// Type display configuration
export const OPPORTUNITY_TYPES: { value: OpportunityType; label: string; color: string; icon: string }[] = [
  { value: 'internship', label: 'Internship', color: '#3b82f6', icon: 'briefcase-outline' },
  { value: 'webinar', label: 'Webinar', color: '#8b5cf6', icon: 'videocam-outline' },
  { value: 'seminar', label: 'Seminar', color: '#f59e0b', icon: 'people-outline' },
  { value: 'volunteer', label: 'Volunteer', color: '#22c55e', icon: 'heart-outline' },
]

export const LOCATION_MODES: { value: LocationMode; label: string }[] = [
  { value: 'local', label: 'Local' },
  { value: 'remote', label: 'Remote' },
  { value: 'hybrid', label: 'Hybrid' },
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

/**
 * Get type display info (label and color)
 */
export function getTypeInfo(type: OpportunityType) {
  return OPPORTUNITY_TYPES.find(t => t.value === type) || OPPORTUNITY_TYPES[0]
}

/**
 * List opportunities for a user (student view)
 * Filters by:
 * - is_published = true
 * - location_mode IN ('remote', 'hybrid') OR (state matches AND county in counties array)
 * Sorted by: deadline asc (nulls last), then created_at desc
 */
export async function listOpportunitiesForUser(profile: Profile | null): Promise<Opportunity[]> {
  // Base query for published opportunities
  const query = supabase
    .from('opportunities')
    .select('*')
    .eq('is_published', true)
    .order('deadline', { ascending: true, nullsFirst: false })
    .order('created_at', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('Error fetching opportunities:', error)
    throw error
  }

  const opportunities = data || []

  // Client-side filtering for location matching
  // If user has state and county, show:
  // - All remote/hybrid opportunities
  // - Local opportunities where state matches AND user's county is in counties array
  if (profile?.state && profile?.county) {
    return opportunities.filter(opp => {
      if (opp.location_mode === 'remote' || opp.location_mode === 'hybrid') {
        return true
      }
      // Local opportunities: check state and county match
      if (opp.location_mode === 'local') {
        const stateMatches = opp.state?.toLowerCase() === profile.state?.toLowerCase()
        const countyMatches = opp.counties?.some(
          c => c.toLowerCase() === profile.county?.toLowerCase()
        )
        return stateMatches && countyMatches
      }
      return true
    })
  }

  // If user missing county/state, show only remote/hybrid
  return opportunities.filter(opp => 
    opp.location_mode === 'remote' || opp.location_mode === 'hybrid'
  )
}

/**
 * List opportunities owned by a business user
 */
export async function listMyOpportunities(ownerUserId: string): Promise<Opportunity[]> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('owner_user_id', ownerUserId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching my opportunities:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single opportunity by ID
 */
export async function getOpportunity(id: string): Promise<Opportunity | null> {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching opportunity:', error)
    throw error
  }

  return data
}

/**
 * Create a new opportunity (business only)
 */
export async function createOpportunity(
  ownerUserId: string,
  payload: CreateOpportunityPayload
): Promise<Opportunity> {
  // Validate counties max 4
  if (payload.counties && payload.counties.length > 4) {
    throw new Error('Maximum 4 counties allowed')
  }

  const { data, error } = await supabase
    .from('opportunities')
    .insert({
      owner_user_id: ownerUserId,
      org_name: payload.org_name || null,
      title: payload.title,
      type: payload.type || 'internship',
      description: payload.description || null,
      apply_url: payload.apply_url || null,
      location_mode: payload.location_mode || 'local',
      state: payload.state || null,
      counties: payload.counties || null,
      start_date: payload.start_date || null,
      deadline: payload.deadline || null,
      is_published: payload.is_published ?? true,
    })
    .select()
    .single()

  if (error) {
    console.error('Error creating opportunity:', error)
    throw error
  }

  return data
}

/**
 * Update an existing opportunity
 */
export async function updateOpportunity(
  id: string,
  patch: UpdateOpportunityPayload
): Promise<Opportunity> {
  // Validate counties max 4
  if (patch.counties && patch.counties.length > 4) {
    throw new Error('Maximum 4 counties allowed')
  }

  const { data, error } = await supabase
    .from('opportunities')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating opportunity:', error)
    throw error
  }

  return data
}

/**
 * Delete an opportunity
 */
export async function deleteOpportunity(id: string): Promise<void> {
  const { error } = await supabase
    .from('opportunities')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('Error deleting opportunity:', error)
    throw error
  }
}

/**
 * Get count of opportunities for user (for dashboard metric)
 */
export async function getOpportunityCount(profile: Profile | null): Promise<number> {
  const opportunities = await listOpportunitiesForUser(profile)
  return opportunities.length
}

/**
 * Format a date string for display
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Not set'
  
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

/**
 * Get days until deadline
 */
export function getDaysUntilDeadline(deadline: string | null): number | null {
  if (!deadline) return null
  
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const deadlineDate = new Date(deadline)
  deadlineDate.setHours(0, 0, 0, 0)
  
  const diffTime = deadlineDate.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  return diffDays
}

/**
 * Parse counties from comma-separated string
 */
export function parseCounties(input: string): string[] {
  return input
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0)
    .slice(0, 4) // Enforce max 4
}

/**
 * Format counties array to display string
 */
export function formatCounties(counties: string[] | null): string {
  if (!counties || counties.length === 0) return ''
  return counties.join(', ')
}
