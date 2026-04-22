import { createServerSupabaseClient } from './supabase'
import type { UserRole } from '@mysryear/shared'

export type Session = {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: UserRole
  }
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', session.user.id)
    .single()

  return {
    user: {
      id: session.user.id,
      email: session.user.email || null,
      name: session.user.user_metadata?.name || null,
      image: session.user.user_metadata?.avatar_url || null,
      role: (userData?.role as UserRole) || 'student',
    },
  }
}
