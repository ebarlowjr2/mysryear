import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole, isFamilyRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import FamilyDashboardClient from './FamilyDashboardClient'

export default async function FamilyDashboardPage() {
  const sp = await requireSessionProfile('/dashboard/family')
  if (!isFamilyRole(sp.role)) {
    redirect(dashboardPathForRole(sp.role))
  }

  const supabase = await createNextServerSupabaseClient()
  const { data: schools } = await supabase
    .from('schools')
    .select('id,name,city,state')
    .order('name', { ascending: true })
    .limit(5000)

  return <FamilyDashboardClient schools={(schools || []) as { id: string; name: string; city: string | null; state: string | null }[]} />
}
