import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase'
import { ensureProfile, getProfile, type Profile } from '../data/profile'

type AuthContextType = {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (userId: string, email?: string) => {
    try {
      const { profile: userProfile } = await ensureProfile(userId, email)
      setProfile(userProfile)
    } catch (err) {
      console.warn('Failed to load profile:', err)
      setProfile(null)
    }
  }

  const refreshProfile = async () => {
    if (user) {
      try {
        const userProfile = await getProfile(user.id)
        setProfile(userProfile)
      } catch (err) {
        console.warn('Failed to refresh profile:', err)
      }
    }
  }

  useEffect(() => {
    const initSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        setSession(session)
        setUser(session?.user ?? null)
        if (session?.user) {
          loadProfile(session.user.id, session.user.email)
        }
      } catch (err) {
        console.warn('Failed to get session:', err)
      } finally {
        setLoading(false)
      }
    }

    initSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        loadProfile(session.user.id, session.user.email)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error as Error | null }
  }

    const signUp = async (email: string, password: string) => {
      const { error } = await supabase.auth.signUp({ email, password })
      return { error: error as Error | null }
    }

                                                    const signInWithGoogle = async () => {
                  try {
                    const redirectUrl = Linking.createURL('auth/callback')
        
                    const { data, error } = await supabase.auth.signInWithOAuth({
                      provider: 'google',
                      options: {
                        redirectTo: redirectUrl,
                        skipBrowserRedirect: true
                      }
                    })

                    if (error) {
                      return { error: error as Error }
                    }

                    if (!data.url) {
                      return { error: new Error('No OAuth URL returned') }
                    }

                    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl)

                    if (result.type === 'success' && result.url) {
                      const parsedUrl = Linking.parse(result.url)
                      const code = parsedUrl.queryParams?.code as string | undefined
          
                      if (code) {
                        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
                        if (exchangeError) {
                          return { error: exchangeError as Error }
                        }
                      } else {
                        const accessToken = parsedUrl.queryParams?.access_token as string | undefined
                        const refreshToken = parsedUrl.queryParams?.refresh_token as string | undefined
            
                        if (accessToken && refreshToken) {
                          const { error: setSessionError } = await supabase.auth.setSession({
                            access_token: accessToken,
                            refresh_token: refreshToken
                          })
                          if (setSessionError) {
                            return { error: setSessionError as Error }
                          }
                        } else {
                          const errorDesc = parsedUrl.queryParams?.error_description as string | undefined
                          const errorMsg = parsedUrl.queryParams?.error as string | undefined
                          if (errorDesc || errorMsg) {
                            return { error: new Error(errorDesc || errorMsg || 'OAuth error') }
                          }
                          return { error: new Error('No authorization code or tokens received') }
                        }
                      }
          
                      const { data: sessionData } = await supabase.auth.getSession()
                      if (!sessionData.session) {
                        return { error: new Error('Failed to establish session') }
                      }
                    } else if (result.type === 'cancel') {
                      return { error: new Error('Sign in was cancelled') }
                    } else {
                      return { error: new Error('Authentication failed') }
                    }

                    return { error: null }
                  } catch (err) {
                    return { error: err as Error }
                  }
                }

    const signOut = async () => {
      await supabase.auth.signOut()
    }

    return (
      <AuthContext.Provider value={{ session, user, profile, loading, signIn, signUp, signInWithGoogle, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
