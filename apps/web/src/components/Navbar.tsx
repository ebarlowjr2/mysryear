'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import Logo from './Logo'
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '../lib/utils'
import { createWebSupabaseClient, USER_ROLES, type UserRole } from '@mysryear/shared'
import { dashboardPathForRole } from '@/lib/dashboard-roles'

type NavLink = { href: string; label: string }

const publicLinks: NavLink[] = [{ href: '/resources', label: 'Resources' }]

const studentLinks: NavLink[] = [
  { href: '/dashboard/student', label: 'Dashboard' },
  { href: '/aura', label: 'A.U.R.A' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/portfolio', label: 'Portfolio' },
]

const familyLinks: NavLink[] = [
  { href: '/dashboard/family', label: 'Family Dashboard' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/opportunities', label: 'Opportunities' },
  { href: '/portfolio', label: 'Portfolio' },
]

const counselorLinks: NavLink[] = [
  { href: '/dashboard/counselor', label: 'Counselor Dashboard' },
  { href: '/scholarships', label: 'Scholarships' },
  { href: '/opportunities', label: 'Opportunities' },
]

const businessLinks: NavLink[] = [
  { href: '/business/dashboard', label: 'Business Dashboard' },
  { href: '/business/opportunities/new', label: 'Post Opportunity' },
]

function roleLinks(role: UserRole | null): NavLink[] {
  if (role === 'business') return businessLinks
  if (role === 'parent' || role === 'guardian') return familyLinks
  if (role === 'counselor') return counselorLinks
  if (role === 'student') return studentLinks
  return publicLinks
}

function toUserRole(value: unknown): UserRole | null {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : null
}

export default function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [role, setRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const supabase = createWebSupabaseClient()

    async function loadSessionRole() {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setIsAuthenticated(!!session)
      if (!session) {
        setRole(null)
        return
      }

      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .maybeSingle()
      setRole(toUserRole(data?.role))
    }

    void loadSessionRole()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session)
      if (!session) {
        setRole(null)
        return
      }
      void loadSessionRole()
    })

    return () => subscription.unsubscribe()
  }, [])

  const links = useMemo(() => roleLinks(role), [role])

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
                (pathname === l.href || pathname.startsWith(`${l.href}/`)) && 'text-brand-700',
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <>
              <Link href={dashboardPathForRole(role)} className="btn-secondary">
                Dashboard
              </Link>
              <Link href="/profile" className="btn-secondary">
                Profile
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
