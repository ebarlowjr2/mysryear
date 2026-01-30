'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { Profile } from '@mysryear/shared'
import { getProfile, ensureProfile } from '@mysryear/shared'

export type AuthState = {
  user: User | null
  profile: Profile | null
  session: Session | null
  loading: boolean
  error: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    session: null,
    loading: true,
    error: null
  })

  const supabase = createClient()

  const fetchProfile = useCallback(async (userId: string, email?: string) => {
    try {
      // Ensure profile exists (creates if not)
      const { profile, error } = await ensureProfile(supabase, userId, email)
      if (error) {
        console.error('Error ensuring profile:', error)
      }
      return profile
    } catch (err) {
      console.error('Error fetching profile:', err)
      return null
    }
  }, [supabase])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          setState(prev => ({ ...prev, loading: false, error: error.message }))
          return
        }

        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email)
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null
          })
        } else {
          setState(prev => ({ ...prev, loading: false }))
        }
      } catch (err) {
        setState(prev => ({ 
          ...prev, 
          loading: false, 
          error: err instanceof Error ? err.message : 'Unknown error' 
        }))
      }
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          const profile = await fetchProfile(session.user.id, session.user.email)
          setState({
            user: session.user,
            profile,
            session,
            loading: false,
            error: null
          })
        } else {
          setState({
            user: null,
            profile: null,
            session: null,
            loading: false,
            error: null
          })
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, fetchProfile])

  const signInWithEmail = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    return { error: null }
  }

  const signUpWithEmail = async (email: string, password: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    return { error: null }
  }

  const signInWithGoogle = async () => {
    setState(prev => ({ ...prev, loading: true, error: null }))
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })

    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    return { error: null }
  }

  const signOut = async () => {
    setState(prev => ({ ...prev, loading: true }))
    
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      setState(prev => ({ ...prev, loading: false, error: error.message }))
      return { error }
    }

    setState({
      user: null,
      profile: null,
      session: null,
      loading: false,
      error: null
    })

    return { error: null }
  }

  const refreshProfile = async () => {
    if (!state.user) return
    
    const profile = await getProfile(supabase, state.user.id)
    setState(prev => ({ ...prev, profile }))
  }

  return {
    ...state,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signOut,
    refreshProfile,
    supabase
  }
}
