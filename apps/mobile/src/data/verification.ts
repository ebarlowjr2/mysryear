import { supabase } from '../lib/supabase'

export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected'

export type VerificationInfo = {
  status: VerificationStatus
  updatedAt: string | null
}

export type VerificationBannerConfig = {
  color: 'gray' | 'yellow' | 'green' | 'red'
  backgroundColor: string
  textColor: string
  message: string
  showRequestButton: boolean
}

export async function getVerificationStatus(
  userId: string,
  role: 'business' | 'teacher'
): Promise<VerificationInfo> {
  const table = role === 'business' ? 'business_profiles' : 'teacher_profiles'
  
  const { data, error } = await supabase
    .from(table)
    .select('verification_status, updated_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { status: 'unverified', updatedAt: null }
  }

  return {
    status: data.verification_status as VerificationStatus,
    updatedAt: data.updated_at as string | null,
  }
}

export async function requestVerification(
  userId: string,
  role: 'business' | 'teacher'
): Promise<{ success: boolean; error: string | null }> {
  const table = role === 'business' ? 'business_profiles' : 'teacher_profiles'
  
  const { error } = await supabase
    .from(table)
    .update({
      verification_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

export function getVerificationBannerConfig(status: VerificationStatus): VerificationBannerConfig {
  switch (status) {
    case 'unverified':
      return {
        color: 'gray',
        backgroundColor: '#6B7280',
        textColor: '#FFFFFF',
        message: 'Unverified - limited visibility',
        showRequestButton: true,
      }
    case 'pending':
      return {
        color: 'yellow',
        backgroundColor: '#F59E0B',
        textColor: '#FFFFFF',
        message: 'Verification pending - we will contact you soon',
        showRequestButton: false,
      }
    case 'verified':
      return {
        color: 'green',
        backgroundColor: '#10B981',
        textColor: '#FFFFFF',
        message: 'Verified account',
        showRequestButton: false,
      }
    case 'rejected':
      return {
        color: 'red',
        backgroundColor: '#EF4444',
        textColor: '#FFFFFF',
        message: 'Verification rejected - update your info and request again',
        showRequestButton: true,
      }
  }
}
