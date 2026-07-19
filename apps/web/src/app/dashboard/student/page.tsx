import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'
import StudentDashboardClient from './StudentDashboardClient'

export default async function StudentDashboardPage() {
  const sp = await requireSessionProfile('/dashboard/student')
  if (sp.role && sp.role !== 'student') {
    redirect(dashboardPathForRole(sp.role))
  }

  return <StudentDashboardClient />
}
