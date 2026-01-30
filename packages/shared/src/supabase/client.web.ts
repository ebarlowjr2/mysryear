// Web Supabase client using @supabase/ssr for Next.js
import { createBrowserClient, createServerClient } from '@supabase/ssr'
import { getWebEnv } from './env'

// Browser client for client-side operations
export function createWebSupabaseClient() {
  const { url, anonKey } = getWebEnv()
  return createBrowserClient(url, anonKey)
}

// Server client for server-side operations (Next.js App Router)
export async function createWebServerSupabaseClient() {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  const { url, anonKey } = getWebEnv()
  
  return createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore errors in server components
          }
        },
      },
    }
  )
}

// Re-export for convenience
export { createBrowserClient, createServerClient }
