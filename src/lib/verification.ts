import { createClient, VerificationStatus, UserRole } from './supabase'

export interface VerificationInfo {
  status: VerificationStatus
  canRequestVerification: boolean
}

export async function getVerificationStatus(
  userId: string,
  role: UserRole
): Promise<VerificationInfo> {
  const supabase = createClient()
  
  if (role === 'business') {
    const { data, error } = await supabase
      .from('business_profiles')
      .select('verification_status')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return { status: 'unverified', canRequestVerification: true }
    }

    return {
      status: data.verification_status,
      canRequestVerification: data.verification_status === 'unverified' || data.verification_status === 'rejected',
    }
  }

  if (role === 'teacher') {
    const { data, error } = await supabase
      .from('teacher_profiles')
      .select('verification_status')
      .eq('user_id', userId)
      .single()

    if (error || !data) {
      return { status: 'unverified', canRequestVerification: true }
    }

    return {
      status: data.verification_status,
      canRequestVerification: data.verification_status === 'unverified' || data.verification_status === 'rejected',
    }
  }

  return { status: 'unverified', canRequestVerification: false }
}

export async function requestVerification(
  userId: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  if (role === 'business') {
    const { data: existing } = await supabase
      .from('business_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!existing) {
      const { error: insertError } = await supabase
        .from('business_profiles')
        .insert({ user_id: userId, verification_status: 'pending' })

      if (insertError) {
        console.error('Error creating business profile:', insertError)
        return { success: false, error: 'Failed to create profile' }
      }
    } else {
      const { error: updateError } = await supabase
        .from('business_profiles')
        .update({ verification_status: 'pending', updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating business verification:', updateError)
        return { success: false, error: 'Failed to request verification' }
      }
    }

    return { success: true }
  }

  if (role === 'teacher') {
    const { data: existing } = await supabase
      .from('teacher_profiles')
      .select('user_id')
      .eq('user_id', userId)
      .single()

    if (!existing) {
      const { error: insertError } = await supabase
        .from('teacher_profiles')
        .insert({ user_id: userId, verification_status: 'pending' })

      if (insertError) {
        console.error('Error creating teacher profile:', insertError)
        return { success: false, error: 'Failed to create profile' }
      }
    } else {
      const { error: updateError } = await supabase
        .from('teacher_profiles')
        .update({ verification_status: 'pending', updated_at: new Date().toISOString() })
        .eq('user_id', userId)

      if (updateError) {
        console.error('Error updating teacher verification:', updateError)
        return { success: false, error: 'Failed to request verification' }
      }
    }

    return { success: true }
  }

  return { success: false, error: 'Invalid role for verification' }
}

export function getVerificationBannerConfig(status: VerificationStatus): {
  message: string
  bgColor: string
  textColor: string
  borderColor: string
} {
  switch (status) {
    case 'unverified':
      return {
        message: 'Unverified - limited visibility',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700',
        borderColor: 'border-gray-300',
      }
    case 'pending':
      return {
        message: 'Verification pending',
        bgColor: 'bg-yellow-50',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-300',
      }
    case 'verified':
      return {
        message: 'Verified',
        bgColor: 'bg-green-50',
        textColor: 'text-green-800',
        borderColor: 'border-green-300',
      }
    case 'rejected':
      return {
        message: 'Rejected - update info & request again',
        bgColor: 'bg-red-50',
        textColor: 'text-red-800',
        borderColor: 'border-red-300',
      }
  }
}
