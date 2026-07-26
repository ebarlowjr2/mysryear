import { redirect } from 'next/navigation'
import LifePathDashboard from '@/features/aura/lifepath/components/LifePathDashboard'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import {
  getCareerIdsForStudentProfile,
  isFamilyRole,
  listLinkedStudentProfilesForCurrentUser,
  requireAuraLifePathContext,
} from '@/lib/aura-lifepath'
import ParentLifePathLanding from '@/features/aura/lifepath/components/parent/ParentLifePathLanding'
import LifePathFeedbackPanel from '@/features/aura/lifepath/components/parent/LifePathFeedbackPanel'
import { createNextServerSupabaseClient } from '@mysryear/shared'

async function parentHasSimulation(userId: string) {
  const supabase = await createNextServerSupabaseClient()
  const { data, error } = await supabase
    .from('lifepath_simulations')
    .select('id')
    .eq('created_by_user_id', userId)
    .eq('simulation_type', 'parent')
    .eq('status', 'active')
    .limit(1)
    .maybeSingle()
  if (error) return false
  return Boolean(data?.id)
}

export default async function LifePathLandingPage() {
  const context = await requireAuraLifePathContext('/aura/lifepath')
  const studentProfile = await getActiveStudentProfileSummary()

  if (isFamilyRole(context.role)) {
    const linkedStudents = await listLinkedStudentProfilesForCurrentUser()
    const careerIds = await getCareerIdsForStudentProfile(context.officialStudentProfileId)
    const hasSimulation = await parentHasSimulation(context.userId)
    return (
      <section className="container-prose pt-10 pb-20">
        <ParentLifePathLanding
          activeStudent={studentProfile}
          linkedStudents={linkedStudents}
          hasStudentLifePath={careerIds.length > 0}
          hasSimulation={hasSimulation}
        />
      </section>
    )
  }

  if (context.role === 'counselor') {
    return (
      <section className="container-prose pt-10 pb-20 space-y-6">
        <ActiveStudentHeader studentProfile={studentProfile} />
        <LifePathDashboard
          readOnly
          title="Linked Student LifePath"
          subtitle="Counselor access is read/support only. Core LifePath edits remain with the student."
          badge="Counselor View"
        />
        <LifePathFeedbackPanel studentProfileId={context.officialStudentProfileId} canAdd={false} />
      </section>
    )
  }

  if (context.role !== 'student') redirect(context.dashboardHref)

  return (
    <section className="container-prose pt-10 pb-20">
      <ActiveStudentHeader studentProfile={studentProfile} />
      <LifePathDashboard />
    </section>
  )
}
