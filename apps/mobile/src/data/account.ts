import { supabase } from '../lib/supabase'

const accountApiBaseUrl = (process.env.EXPO_PUBLIC_WEB_URL || 'https://www.mysryear.net').replace(
  /\/$/,
  '',
)

export async function deleteMyAccount(): Promise<{ success: boolean; error: string | null }> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.access_token) return { success: false, error: 'Your session has expired.' }

  try {
    const response = await fetch(`${accountApiBaseUrl}/api/account/delete`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = (await response.json().catch(() => null)) as { error?: string } | null
    if (!response.ok) {
      return { success: false, error: body?.error || 'Could not delete your account.' }
    }

    await supabase.auth.signOut({ scope: 'local' })
    return { success: true, error: null }
  } catch {
    return { success: false, error: 'Could not connect to account services.' }
  }
}
