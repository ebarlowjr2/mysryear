import { requireSessionProfile } from '@/lib/auth'
import { dashboardPathForRole, isFamilyRole } from '@/lib/dashboard-roles'
import { redirect } from 'next/navigation'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import FamilyDashboardClient from './FamilyDashboardClient'

type FamilyDashboardPageProps = {
  searchParams?: Promise<{ studentAction?: string | string[] }>
}

export default async function FamilyDashboardPage({ searchParams }: FamilyDashboardPageProps) {
  const sp = await requireSessionProfile('/dashboard/family')
  if (!isFamilyRole(sp.role)) {
    redirect(dashboardPathForRole(sp.role))
  }

  const params = (await searchParams) || {}
  const requestedAction = Array.isArray(params.studentAction)
    ? params.studentAction[0]
    : params.studentAction
  const initialStudentAction = requestedAction === 'create' || requestedAction === 'link'
    ? requestedAction
    : null

  const supabase = await createNextServerSupabaseClient()
  const { data: schools } = await supabase
    .from('schools')
    .select('id,name,city,state')
    .order('name', { ascending: true })
    .limit(5000)

  return <FamilyDashboardClient schools={(schools || []) as { id: string; name: string; city: string | null; state: string | null }[]} initialStudentAction={initialStudentAction} />
}
