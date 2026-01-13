import { createClient, Database, VerificationStatus } from './supabase'

type BusinessProfile = Database['public']['Tables']['business_profiles']['Row']
type BusinessProfileInsert = Database['public']['Tables']['business_profiles']['Insert']
type BusinessProfileUpdate = Database['public']['Tables']['business_profiles']['Update']

export interface BusinessProfileData {
  userId: string
  orgName: string | null
  orgWebsite: string | null
  orgEmail: string | null
  phone: string | null
  industry: string | null
  hqState: string | null
  hqCounty: string | null
  verificationStatus: VerificationStatus
  createdAt: string
  updatedAt: string
}

function mapToBusinessProfileData(profile: BusinessProfile): BusinessProfileData {
  return {
    userId: profile.user_id,
    orgName: profile.org_name,
    orgWebsite: profile.org_website,
    orgEmail: profile.org_email,
    phone: profile.phone,
    industry: profile.industry,
    hqState: profile.hq_state,
    hqCounty: profile.hq_county,
    verificationStatus: profile.verification_status,
    createdAt: profile.created_at,
    updatedAt: profile.updated_at,
  }
}

export async function getBusinessProfile(userId: string): Promise<BusinessProfileData | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('business_profiles')
    .select('*')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return mapToBusinessProfileData(data)
}

export async function ensureBusinessProfile(userId: string): Promise<BusinessProfileData> {
  const supabase = createClient()
  
  const existing = await getBusinessProfile(userId)
  if (existing) {
    return existing
  }

  const newProfile: BusinessProfileInsert = {
    user_id: userId,
    verification_status: 'unverified',
  }

  const { data, error } = await supabase
    .from('business_profiles')
    .insert(newProfile)
    .select()
    .single()

  if (error || !data) {
    console.error('Error creating business profile:', error)
    return {
      userId,
      orgName: null,
      orgWebsite: null,
      orgEmail: null,
      phone: null,
      industry: null,
      hqState: null,
      hqCounty: null,
      verificationStatus: 'unverified',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  }

  return mapToBusinessProfileData(data)
}

export interface BusinessProfilePatch {
  orgName?: string | null
  orgWebsite?: string | null
  orgEmail?: string | null
  phone?: string | null
  industry?: string | null
  hqState?: string | null
  hqCounty?: string | null
}

export async function updateBusinessProfile(
  userId: string,
  patch: BusinessProfilePatch
): Promise<{ success: boolean; error?: string; data?: BusinessProfileData }> {
  const supabase = createClient()
  
  const updateData: BusinessProfileUpdate = {
    updated_at: new Date().toISOString(),
  }

  if (patch.orgName !== undefined) updateData.org_name = patch.orgName
  if (patch.orgWebsite !== undefined) updateData.org_website = patch.orgWebsite
  if (patch.orgEmail !== undefined) updateData.org_email = patch.orgEmail
  if (patch.phone !== undefined) updateData.phone = patch.phone
  if (patch.industry !== undefined) updateData.industry = patch.industry
  if (patch.hqState !== undefined) updateData.hq_state = patch.hqState
  if (patch.hqCounty !== undefined) updateData.hq_county = patch.hqCounty

  const { data, error } = await supabase
    .from('business_profiles')
    .update(updateData)
    .eq('user_id', userId)
    .select()
    .single()

  if (error) {
    console.error('Error updating business profile:', error)
    return { success: false, error: 'Failed to update business profile' }
  }

  return { success: true, data: mapToBusinessProfileData(data) }
}

export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Education',
  'Manufacturing',
  'Retail',
  'Construction',
  'Transportation',
  'Hospitality',
  'Professional Services',
  'Non-profit',
  'Government',
  'Other',
] as const
