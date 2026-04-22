import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseEnv } from './env'

export function createWebSupabaseClient() {
  const { url, anonKey } = getSupabaseEnv()
  return createBrowserClient(url, anonKey)
}
