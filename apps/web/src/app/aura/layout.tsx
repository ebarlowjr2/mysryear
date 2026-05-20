import StudentScopedHeader from '@/components/StudentScopedHeader'
import type { ReactNode } from 'react'

export default async function AuraLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <StudentScopedHeader requirePath="/aura" />
      {children}
    </>
  )
}
