'use client'
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '../lib/utils'
import { createWebSupabaseClient } from '@mysryear/shared'

const links = [
  { href: '/planner', label: 'Planner' },
  { href: '/open-dashboard/applications', label: 'Applications' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/resources', label: 'Resources' },
  { href: '/aura', label: 'A.U.R.A' },
]

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const supabase = createWebSupabaseClient()

    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogout = async () => {
    const supabase = createWebSupabaseClient()
    await supabase.auth.signOut()
    router.push('/')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="container-prose flex h-16 items-center justify-between">
        <Link href="/" aria-label="My SR Year Home">
          <Logo />
        </Link>
        <nav className="hidden md:flex items-center gap-6">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                'text-sm font-medium hover:text-brand-700',
                pathname === l.href && 'text-brand-700',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href="/dashboard" className="btn-secondary">
                Dashboard
              </Link>
              <Link href="/open-dashboard" className="btn-primary">
                Open Dashboard
              </Link>
              <button onClick={handleLogout} className="btn-secondary">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary">
                Login
              </Link>
              <Link href="/signup" className="btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
