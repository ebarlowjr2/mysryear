import { createWebSupabaseServerClient } from './server'

// Next.js-only helper. Safe for monorepo use as long as non-Next apps don't import it.
export async function createNextServerSupabaseClient() {
  const { cookies } = (await import('next/headers')) as any
  const cookieStore = await cookies()

  return createWebSupabaseServerClient({
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }: any) => cookieStore.set(name, value, options))
      } catch {
        // ignore when called from a Server Component render
      }
    },
  })
}

