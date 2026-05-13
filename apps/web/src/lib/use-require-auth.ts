'use client'

import { useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthSession } from '@/lib/use-auth-session'

export function useRequireAuth() {
  const router = useRouter()
  const pathname = usePathname()
  const { isAuthenticated, loading } = useAuthSession()

  useEffect(() => {
    if (loading) return
    if (isAuthenticated) return

    const rt = pathname || '/dashboard'
    router.replace(`/login?redirectTo=${encodeURIComponent(rt)}`)
  }, [isAuthenticated, loading, pathname, router])

  return { isAuthenticated, loading }
}

