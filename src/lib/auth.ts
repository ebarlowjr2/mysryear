import { createServerSupabaseClient } from './supabase'

export type Session = { 
  user: { 
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: 'student' | 'parent' | 'counselor'
  } 
}

export async function getSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error || !user) {
    return null
  }

  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const userRole = !userDataError && userData ? (userData as { role: 'student' | 'parent' | 'counselor' }).role : undefined

  return {
    user: {
      id: user.id,
      name: user.user_metadata?.name || null,
      email: user.email || null,
      image: user.user_metadata?.avatar_url || null,
      role: userRole
    }
  }
}
