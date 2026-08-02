import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'

export default async function DashboardRoleRouter() {
  const sp = await requireSessionProfile('/dashboard')
  redirect(dashboardPathForRole(sp.role))
}
