import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  const cookieStore = await cookies()
  const response = NextResponse.json({ success: true })

  const allCookies = cookieStore.getAll()
  const supabaseCookies = allCookies.filter(cookie => 
    cookie.name.includes('sb-') || cookie.name.includes('supabase')
  )

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  await supabase.auth.signOut()

  supabaseCookies.forEach((cookie) => {
    response.cookies.delete(cookie.name)
  })

  return response
}
