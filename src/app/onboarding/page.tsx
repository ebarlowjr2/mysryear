'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'

export default function OnboardingRouter() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkProfileAndRoute = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role, onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (profileError && profileError.code !== 'PGRST116') {
          setError('Failed to load profile')
          return
        }

        if (!profile) {
          // No profile yet, create one and show role selection
          const { error: createError } = await supabase
            .from('profiles')
            .insert({
              user_id: user.id,
              full_name: user.email?.split('@')[0] || null,
              onboarding_complete: false
            })

          if (createError) {
            console.error('Error creating profile:', createError)
          }
          
          // Show role selection
          router.push('/onboarding/role')
          return
        }

        if (profile.onboarding_complete) {
          router.push('/dashboard')
          return
        }

        if (!profile.role) {
          router.push('/onboarding/role')
          return
        }

        // Route to role-specific onboarding
        switch (profile.role) {
          case 'student':
            router.push('/onboarding/student')
            break
          case 'teacher':
            router.push('/onboarding/teacher')
            break
          case 'parent':
            router.push('/onboarding/parent')
            break
          case 'business':
            router.push('/onboarding/business')
            break
          case 'mentor':
            router.push('/onboarding/mentor')
            break
          case 'recruiter':
            router.push('/onboarding/recruiter')
            break
          default:
            router.push('/onboarding/role')
        }
      } catch (err) {
        console.error('Error in onboarding router:', err)
        setError('An error occurred')
      }
    }

    checkProfileAndRoute()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-primary px-4 py-2 rounded-lg"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Setting up your account...</p>
      </div>
    </div>
  )
}
