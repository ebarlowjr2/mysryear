import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

export type SupabaseCookieMethods = {
  getAll(): { name: string; value: string }[]
  setAll(
    cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
  ): void
}

export function createWebSupabaseServerClient(cookies: SupabaseCookieMethods) {
  const { url, anonKey } = getSupabaseEnv()
  return createServerClient(url, anonKey, { cookies })
}
