import StudentScopedHeader from '@/components/StudentScopedHeader'
import type { ReactNode } from 'react'

export default async function OpenDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StudentScopedHeader requirePath="/open-dashboard" />
      {children}
    </>
  )
}
