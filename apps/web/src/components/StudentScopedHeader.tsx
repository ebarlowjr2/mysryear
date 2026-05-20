import { requireSessionProfile } from '@/lib/auth'
import { getActiveStudentProfileSummary } from '@/lib/student-profile'
import ActiveStudentHeader from '@/components/ActiveStudentHeader'

export default async function StudentScopedHeader({ requirePath }: { requirePath: string }) {
  await requireSessionProfile(requirePath)
  const studentProfile = await getActiveStudentProfileSummary()

  return (
    <div className="container-prose pt-10 -mb-6">
      <ActiveStudentHeader studentProfile={studentProfile} />
    </div>
  )
}
