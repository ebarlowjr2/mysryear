import { USER_ROLES, createNextServerSupabaseClient, type UserRole } from '@mysryear/shared'
import type { User } from '@supabase/supabase-js'

export type ProfileRow = Record<string, unknown> & {
  id?: string
  role?: unknown
  onboarding_complete?: unknown
}

export type SessionProfile = {
  user: User
  profile: ProfileRow | null
  role: UserRole | null
  onboardingComplete: boolean
}

function toUserRole(value: unknown): UserRole | null {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null
}

export async function getSessionProfile(): Promise<SessionProfile | null> {
  const supabase = await createNextServerSupabaseClient()

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return null
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .maybeSingle()

  // If the table doesn't exist or RLS blocks it, surface it clearly for handoff.
  if (error) {
    throw error
  }

  const role = toUserRole(profile?.role)
  const onboardingComplete = Boolean(profile?.onboarding_complete)

  return {
    user: session.user,
    profile: (profile as ProfileRow) || null,
    role,
    onboardingComplete,
  }
}

export type Session = {
  user: {
    id: string
    email: string | null
    name: string | null
    image: string | null
    role: UserRole | null
  }
  profile: ProfileRow | null
  onboardingComplete: boolean
}

// Back-compat for existing callsites that expect name/email/image on the session user.
export async function getSession(): Promise<Session | null> {
  const sp = await getSessionProfile()
  if (!sp) return null
  return {
    user: {
      id: sp.user.id,
      email: sp.user.email || null,
      name: (sp.user.user_metadata?.name as string | undefined) || null,
      image: (sp.user.user_metadata?.avatar_url as string | undefined) || null,
      role: sp.role,
    },
    profile: sp.profile,
    onboardingComplete: sp.onboardingComplete,
  }
}
