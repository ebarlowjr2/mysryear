import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'
import CounselorDashboardClient from './CounselorDashboardClient'

export default async function CounselorDashboardPage() {
  const sp = await requireSessionProfile('/dashboard/counselor')
  if (sp.role !== 'counselor') {
    redirect(dashboardPathForRole(sp.role))
  }

  return <CounselorDashboardClient />
}
