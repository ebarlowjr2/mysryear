import { NextResponse, type NextRequest } from 'next/server'
import { createWebSupabaseServerClient } from '@mysryear/shared'

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createWebSupabaseServerClient({
    getAll() {
      return request.cookies.getAll()
    },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
      supabaseResponse = NextResponse.next({
        request,
      })
      cookiesToSet.forEach(({ name, value, options }) =>
        supabaseResponse.cookies.set(name, value, options),
      )
    },
  })

  const {
    data: { session },
  } = await supabase.auth.getSession()

  const pathname = request.nextUrl.pathname
  const isPublicApiRoute =
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/api/integrations/google/authorize') ||
    pathname.startsWith('/api/scholarships')

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/resources') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth') ||
    (pathname.startsWith('/api') && isPublicApiRoute)

  if (!isPublicRoute && !session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/login'
    redirectUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // If the user is authenticated but has not completed onboarding, route them through onboarding
  // for any authenticated, non-public page. This prevents "half-set-up" sessions from drifting.
  if (
    session &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/api') &&
    !pathname.startsWith('/auth')
  ) {
    const { data: profileRow, error: profileError } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', session.user.id)
      .maybeSingle()

    // If the profile row doesn't exist yet (rare race on first login) OR onboarding is incomplete,
    // force the user through /onboarding.
    if (!profileError && (!profileRow || profileRow.onboarding_complete === false)) {
      const redirectUrl = request.nextUrl.clone()
      redirectUrl.pathname = '/onboarding'
      return NextResponse.redirect(redirectUrl)
    }
  }

  if ((pathname === '/login' || pathname === '/signup') && session) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = '/dashboard'
    return NextResponse.redirect(redirectUrl)
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
