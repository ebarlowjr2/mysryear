import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = join(__dirname, '../../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('role-safe family experience contract', () => {
  it('keeps official student checklist writes student-only', () => {
    const route = read('apps/web/src/app/api/dashboard/tasks/route.ts')
    const familyDashboard = read('apps/web/src/app/dashboard/family/FamilyDashboardClient.tsx')
    const summary = read('apps/web/src/app/api/dashboard/summary/route.ts')

    expect(route).toContain("viewerProfile?.role as string | null) !== 'student'")
    expect(familyDashboard).toContain('readOnly')
    expect(summary).toContain("if (viewerRole === 'student' && toInsert.length > 0)")
  })

  it('gives parent and guardian accounts the same mobile family navigation', () => {
    const tabs = read('apps/mobile/app/(app)/_layout.tsx')
    const students = read('apps/mobile/app/(app)/students.tsx')

    expect(tabs).toContain('const isFamily = isFamilyRole(role)')
    expect(tabs).toContain("href: isFamily ? ('/students' as const) : null")
    expect(tabs).toContain("href: isStudent || isFamily ? '/scholarships' : null")
    expect(students).toContain("profile?.role === 'guardian' ? 'guardian' : 'parent'")
  })

  it('does not present counselors or businesses with the student dashboard', () => {
    const dashboard = read('apps/mobile/app/(app)/index.tsx')
    const tabs = read('apps/mobile/app/(app)/_layout.tsx')

    expect(dashboard).toContain("if (role === 'business')")
    expect(dashboard).toContain("if (role === 'counselor')")
    expect(tabs).toContain("const isBusiness = role === 'business'")
    expect(tabs).not.toContain('const isBusiness = false')
  })

  it('uses family-first parent and guardian wording on web and mobile', () => {
    const familyDashboard = read('apps/web/src/app/dashboard/family/FamilyDashboardClient.tsx')
    const webProfile = read('apps/web/src/app/profile/page.tsx')
    const mobileProfile = read('apps/mobile/app/(app)/profile.tsx')

    expect(familyDashboard).toContain('familyActionCenterLabel')
    expect(webProfile).toContain('Review this student’s school and graduation details.')
    expect(mobileProfile).toContain("Student's School")
    expect(mobileProfile).toContain('Family Connections')
  })

  it('blocks non-business accounts from the web business dashboard', () => {
    const businessDashboard = read('apps/web/src/app/business/dashboard/page.tsx')
    expect(businessDashboard).toContain("if (sp.role !== 'business') redirect(dashboardPathForRole(sp.role))")
  })
})
