// Environment configuration for Supabase
// Web apps should use NEXT_PUBLIC_ prefixed env vars
// Mobile apps should use their own env loading mechanism

export type SupabaseEnv = {
  url: string
  anonKey: string
}

export function getWebEnv(): SupabaseEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    console.warn('Supabase environment variables not set, using placeholders')
    return {
      url: 'https://placeholder.supabase.co',
      anonKey: 'placeholder-key'
    }
  }

  return { url, anonKey }
}
