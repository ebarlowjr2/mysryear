import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const signupPage = readFileSync(join(process.cwd(), 'src/app/signup/page.tsx'), 'utf8')
const homePage = readFileSync(join(process.cwd(), 'src/app/page.tsx'), 'utf8')
const navbar = readFileSync(join(process.cwd(), 'src/components/Navbar.tsx'), 'utf8')
const confirmationPage = readFileSync(
  join(process.cwd(), 'src/app/auth/email-confirmed/page.tsx'),
  'utf8',
)
const migration = readFileSync(
  join(process.cwd(), '../../supabase/migrations/20260802100000_school_level_college_support.sql'),
  'utf8',
)

describe('signup UI contract', () => {
  it('uses high-contrast account heading and clear signup CTA states', () => {
    expect(signupPage).toContain('Create Your Account')
    expect(signupPage).toContain('text-slate-950')
    expect(signupPage).toContain('bg-brand-600')
    expect(signupPage).toContain('hover:bg-brand-700')
    expect(signupPage).toContain('disabled:bg-slate-300')
    expect(signupPage).toContain('disabled:text-slate-600')
  })

  it('renders the requested ordered signup fields and role labels through shared helpers', () => {
    expect(signupPage.indexOf('htmlFor="email"')).toBeLessThan(
      signupPage.indexOf('htmlFor="password"'),
    )
    expect(signupPage.indexOf('htmlFor="password"')).toBeLessThan(
      signupPage.indexOf('htmlFor="confirmPassword"'),
    )
    expect(signupPage.indexOf('htmlFor="confirmPassword"')).toBeLessThan(
      signupPage.indexOf('htmlFor="role"'),
    )
    expect(signupPage.indexOf('htmlFor="role"')).toBeLessThan(
      signupPage.indexOf('htmlFor="schoolLevel"'),
    )
    expect(signupPage.indexOf('htmlFor="schoolLevel"')).toBeLessThan(
      signupPage.indexOf('htmlFor="school"'),
    )
    expect(signupPage).toContain('ACCOUNT_TYPE_LABELS[r]')
  })

  it('supports High School, College, and Add My School Later without free-text school creation', () => {
    expect(signupPage).toContain('High School')
    expect(signupPage).toContain('College')
    expect(signupPage).toContain('Add My School Later')
    expect(signupPage).not.toContain("from('schools').insert")
  })

  it('adds school-level columns additively and keeps existing schools as high school by default', () => {
    expect(migration).toContain("school_level text not null default 'high_school'")
    expect(migration).toContain('institution_identifier text')
    expect(migration).toContain('active boolean not null default true')
    expect(migration).toContain("school_level in ('high_school', 'college')")
  })

  it('shows email confirmation success only after token exchange and includes invalid state', () => {
    expect(confirmationPage).toContain('exchangeCodeForSession(code)')
    expect(confirmationPage).toContain('Your email has been confirmed.')
    expect(confirmationPage).toContain('This confirmation link is invalid or expired.')
    expect(confirmationPage).toContain('Return to MySRYear')
    expect(confirmationPage).toContain('/api/bootstrap')
  })

  it('moves signed-out Resources from top nav to hero beside How It Works', () => {
    expect(navbar).toContain("isAuthenticated || l.href !== '/resources'")
    expect(homePage.indexOf('How it Works')).toBeLessThan(homePage.indexOf('Resources'))
    expect(homePage).toContain('href="/resources"')
    expect(homePage).toContain('sm:flex-row')
  })
})
