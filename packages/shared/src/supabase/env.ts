// NOTE: This module is imported by browser code.
// Next.js only inlines `process.env.NEXT_PUBLIC_*` when accessed statically,
// so we must not read via a dynamic key (e.g. `process.env[name]`).
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_URL')

  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!anonKey)
    throw new Error('Missing required env var: NEXT_PUBLIC_SUPABASE_ANON_KEY')

  return { url, anonKey }
}
