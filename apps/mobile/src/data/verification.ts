import { supabase } from '../lib/supabase'

export type VerificationStatus = 'unverified' | 'pending' | 'verified'

export type VerificationInfo = {
  status: VerificationStatus
  requestedAt: string | null
}

export type VerificationBannerConfig = {
  color: 'gray' | 'blue' | 'green'
  backgroundColor: string
  textColor: string
  message: string
  helperText: string
  showRequestButton: boolean
  icon: 'alert-circle' | 'time' | 'checkmark-circle'
}

// Sprint 10: Get verification status from profiles table
export async function getVerificationStatus(
  userId: string
): Promise<VerificationInfo> {
  const { data, error } = await supabase
    .from('profiles')
    .select('verification_status, verification_requested_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return { status: 'unverified', requestedAt: null }
  }

  return {
    status: (data.verification_status as VerificationStatus) || 'unverified',
    requestedAt: data.verification_requested_at as string | null,
  }
}

// Sprint 10: Request verification - updates profiles table
export async function requestVerification(
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  const { error } = await supabase
    .from('profiles')
    .update({
      verification_status: 'pending',
      verification_requested_at: new Date().toISOString(),
    })
    .eq('user_id', userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true, error: null }
}

// Sprint 10: Get banner config based on status and role
export function getVerificationBannerConfig(
  status: VerificationStatus,
  role: 'business' | 'teacher'
): VerificationBannerConfig {
  const helperTexts = {
    business: 'Verified businesses appear more prominently and build trust with students.',
    teacher: 'Verified educators will be able to post school announcements and events (coming soon).',
  }

  switch (status) {
    case 'unverified':
      return {
        color: 'gray',
        backgroundColor: '#FEF3C7', // Yellow-100
        textColor: '#92400E', // Yellow-800
        message: 'This account is not yet verified. Verified accounts build trust with students and parents.',
        helperText: helperTexts[role],
        showRequestButton: true,
        icon: 'alert-circle',
      }
    case 'pending':
      return {
        color: 'blue',
        backgroundColor: '#DBEAFE', // Blue-100
        textColor: '#1E40AF', // Blue-800
        message: 'Verification request submitted. We\'ll notify you once reviewed.',
        helperText: '',
        showRequestButton: false,
        icon: 'time',
      }
    case 'verified':
      return {
        color: 'green',
        backgroundColor: '#D1FAE5', // Green-100
        textColor: '#065F46', // Green-800
        message: 'Verified Account',
        helperText: '',
        showRequestButton: false,
        icon: 'checkmark-circle',
      }
  }
}
