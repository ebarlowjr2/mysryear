import StudentScopedHeader from '@/components/StudentScopedHeader'
import type { ReactNode } from 'react'

export default async function PlannerLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StudentScopedHeader requirePath="/planner" />
      {children}
    </>
  )
}
