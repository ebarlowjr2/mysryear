import { describe, it, expect } from 'vitest'
import { getSupabaseEnv } from '../supabase/env'

describe('getSupabaseEnv', () => {
  it('throws when required vars are missing', () => {
    const prevUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const prevKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    expect(() => getSupabaseEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/)

    process.env.NEXT_PUBLIC_SUPABASE_URL = prevUrl
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = prevKey
  })
})
