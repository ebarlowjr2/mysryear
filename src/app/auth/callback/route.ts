import { createServerSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = requestUrl.searchParams.get('redirectTo') || '/dashboard'

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { data: { session }, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && session) {
      const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', session.user.id)
        .single()

      if (!existingUser) {
        await supabase
          .from('users')
          .insert([
            {
              id: session.user.id,
              email: session.user.email!,
              role: 'student',
            }
          ])
      }

      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_failed', requestUrl.origin))
}
