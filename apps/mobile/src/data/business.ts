import { supabase } from '../lib/supabase'
import { VerificationStatus } from './verification'

export type BusinessProfile = {
  user_id: string
  org_name: string | null
  org_website: string | null
  org_email: string | null
  phone: string | null
  industry: string | null
  hq_state: string | null
  hq_county: string | null
  verification_status: VerificationStatus
  created_at: string
  updated_at: string
}

export type BusinessProfileUpdate = Partial<{
  org_name: string | null
  org_website: string | null
  org_email: string | null
  phone: string | null
  industry: string | null
  hq_state: string | null
  hq_county: string | null
}>

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Hospitality',
  'Construction',
  'Transportation',
  'Media & Entertainment',
  'Non-Profit',
  'Government',
  'Other',
]

export async function getBusinessProfile(userId: string): Promise<BusinessProfile | null> {
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as BusinessProfile
}

export async function ensureBusinessProfile(userId: string): Promise<{ profile: BusinessProfile | null; error: string | null }> {
  const existing = await getBusinessProfile(userId)
  
  if (existing) {
    return { profile: existing, error: null }
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .insert({
      user_id: userId,
      verification_status: 'unverified',
    })
    .select()
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as BusinessProfile, error: null }
}

export async function updateBusinessProfile(
  userId: string,
  updates: BusinessProfileUpdate
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('business_profiles')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}
