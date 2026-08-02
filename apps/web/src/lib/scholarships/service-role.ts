/**
 * Server-side Supabase service-role client for scholarship ingestion/refresh
 * API routes ONLY.
 *
 * The service-role key bypasses Row Level Security and MUST never be exposed to
 * the browser/mobile or committed to source control. This module reads it from
 * the server environment at request time and is only imported by server route
 * handlers (never by client components).
 *
 * Required env (server-side):
 *   SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export function hasServiceRoleConfig(): boolean {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  return Boolean(url && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

export function createServiceRoleClient(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url) throw new Error('Missing SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)')
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
