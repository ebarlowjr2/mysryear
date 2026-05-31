import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

function cleanEnv(v: string) {
  // .env values sometimes include quotes or trailing whitespace/newlines.
  const trimmed = (v || '').trim()
  return trimmed.replace(/^['"]|['"]$/g, '')
}

const supabaseUrl = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_URL || '')
const supabaseAnonKey = cleanEnv(process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '')

// Fail fast with a helpful message. "Invalid API key" is often caused by env not being loaded at runtime
// (common in monorepos), or a URL/key mismatch.
function envSummary() {
  const host = supabaseUrl.replace(/^https?:\/\//, '').split('/')[0] || '(empty)'
  const keyPrefix = supabaseAnonKey ? `${supabaseAnonKey.slice(0, 6)}…` : '(empty)'
  return `SUPABASE_URL_HOST=${host} SUPABASE_ANON_KEY_PREFIX=${keyPrefix} KEY_LEN=${supabaseAnonKey.length}`
}

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    `Missing required mobile env vars. Expected EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY. ${envSummary()}`,
  )
}

// This log helps debug "Invalid API key" without leaking the secret.
// eslint-disable-next-line no-console
console.log(`[mysryear-mobile] Supabase env: ${envSummary()}`)

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    flowType: 'pkce',
  },
})
