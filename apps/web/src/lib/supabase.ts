import { createWebSupabaseClient, createWebSupabaseServerClient } from '@mysryear/shared'

export { getSupabaseEnv } from '@mysryear/shared'

export function createClient() {
  return createWebSupabaseClient()
}

export async function createServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()

  return createWebSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
      } catch {
        // ignore when called from a Server Component render
      }
    },
  })
}
