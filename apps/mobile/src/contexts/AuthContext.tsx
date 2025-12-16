import React, { createContext, useContext, useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import * as WebBrowser from 'expo-web-browser'
import * as Linking from 'expo-linking'
import { supabase } from '../lib/supabase'

type AuthContextType = {
  session: Session | null
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>
  signInWithGoogle: () => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
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
            
                    const { data: sessionData } = await supabase.auth.getSession()
                    if (!sessionData.session) {
                      return { error: new Error('Failed to establish session') }
                    }
                  } else {
                    return { error: new Error('No authorization code received') }
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
      <AuthContext.Provider value={{ session, user, loading, signIn, signUp, signInWithGoogle, signOut }}>
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
