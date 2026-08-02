import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole, isFamilyRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'
import FamilyDashboardClient from './FamilyDashboardClient'

export default async function FamilyDashboardPage() {
  const sp = await requireSessionProfile('/dashboard/family')
  if (!isFamilyRole(sp.role)) {
    redirect(dashboardPathForRole(sp.role))
  }

  return <FamilyDashboardClient />
}
