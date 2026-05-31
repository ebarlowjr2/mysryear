import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import ActiveStudentProfileSelector from './ui/ActiveStudentProfileSelector'
import RelationshipInvites from './ui/RelationshipInvites'
import StudentProfileDetailsForm from './ui/StudentProfileDetailsForm'
import LinkedSupporters from './ui/LinkedSupporters'
import { CalendarDays, Megaphone, Users } from 'lucide-react'

type SchoolRow = { name: string | null } | null
type StudentProfileRow = {
  id: string
  first_name: string | null
  last_name: string | null
  graduation_year: number | null
  school_id: string | null
  schools: SchoolRow
}

type RelationshipRow = {
  role: string
  student_profile_id: string
  user_id: string
  created_at: string
  student_profiles: StudentProfileRow | null
}

type InviteRow = {
  id: string
  student_profile_id: string
  invited_email: string | null
  invited_user_id: string | null
  relationship_role: 'parent' | 'guardian' | 'counselor' | 'student'
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  created_by_user_id: string
  created_at: string
}

export default async function ProfilePage() {
  const sp = await requireSessionProfile('/profile')
  const supabase = await createNextServerSupabaseClient()

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('role,onboarding_complete,state,path,testing,early_action,deadline_lead_days,active_student_profile_id')
    .eq('id', sp.user.id)
    .maybeSingle()

  if (profileError) throw profileError

  const { data: ownedStudentProfile } = await supabase
    .from('student_profiles')
    .select('id,first_name,last_name,graduation_year,school_id,schools(name)')
    .eq('student_user_id', sp.user.id)
    .maybeSingle()

  const { data: relRows } = await supabase
    .from('family_relationships')
    .select(
      'role,user_id,student_profile_id,created_at,student_profiles(id,first_name,last_name,graduation_year,school_id,schools(name))',
    )
    .eq('user_id', sp.user.id)
    .order('created_at', { ascending: true })

  const studentProfiles: StudentProfileRow[] = []
  if (ownedStudentProfile?.id) studentProfiles.push(ownedStudentProfile as unknown as StudentProfileRow)
  for (const r of (relRows || []) as unknown as RelationshipRow[]) {
    const spRow = r.student_profiles
    if (!spRow?.id) continue
    if (!studentProfiles.some((x) => x.id === spRow.id)) studentProfiles.push(spRow)
  }

  const activeStudentProfileId =
    (profileRow?.active_student_profile_id as string | null | undefined) ||
    (ownedStudentProfile?.id as string | undefined) ||
    studentProfiles[0]?.id ||
    null

  const activeStudentProfile =
    studentProfiles.find((p) => p.id === activeStudentProfileId) || studentProfiles[0] || null

  const { data: invitesCreated } = await supabase
    .from('student_profile_relationship_invites')
    .select('*')
    .eq('created_by_user_id', sp.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  const { data: invitesReceived } = await supabase
    .from('student_profile_relationship_invites')
    .select('*')
    // Rely on RLS to only return invites meant for this user:
    // - invited_user_id = auth.uid()
    // - or invited_email matches auth.jwt email (for invites created before account existed)
    .order('created_at', { ascending: false })
    .limit(50)

  // Linked supporters for the active student profile (membership rows).
  const { data: linkedRows } = activeStudentProfileId
    ? await supabase
        .from('family_relationships')
        .select('user_id,role,created_at')
        .eq('student_profile_id', activeStudentProfileId)
        .order('created_at', { ascending: true })
    : { data: [] as unknown[] }

  const pendingInvitesForActive =
    (invitesCreated || []).filter(
      (i) => i.student_profile_id === activeStudentProfileId && i.status === 'pending',
    ) || []

  const { data: schools } = await supabase
    .from('schools')
    .select('id,name,city,state')
    .order('name', { ascending: true })
    .limit(5000)

  return (
    <section className="container-prose pt-10 pb-20 space-y-6">
      <div className="card p-8">
        <div className="badge">Account</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Profile</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          Manage your account, your active student profile, and linked supporters (parent/guardian/counselor).
        </p>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">Email</div>
            <div className="mt-1 font-black break-all">{sp.user.email || '—'}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">Role</div>
            <div className="mt-1 font-black">{profileRow?.role || sp.role || '—'}</div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">Onboarding</div>
            <div className="mt-1 font-black">
              {Boolean(profileRow?.onboarding_complete ?? sp.onboardingComplete) ? 'Complete' : 'Not complete'}
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">Planner Defaults</div>
            <div className="mt-1 text-sm text-slate-700">
              <div>
                <span className="font-semibold">State:</span> {profileRow?.state || '—'}
              </div>
              <div>
                <span className="font-semibold">Path:</span> {profileRow?.path || '—'}
              </div>
              <div>
                <span className="font-semibold">Testing:</span> {profileRow?.testing || '—'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-8">
        <div className="badge">Student Profile</div>
        <h2 className="mt-3 text-2xl font-black tracking-tight">Active Student Profile</h2>
        <p className="mt-2 text-slate-700">
          LifePath, uploads, and planning tools should attach to your active student profile.
        </p>

        <div className="mt-6">
          <ActiveStudentProfileSelector
            activeStudentProfileId={activeStudentProfileId}
            studentProfiles={studentProfiles}
          />
        </div>

        <div className="mt-6 grid sm:grid-cols-2 gap-4">
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">Student</div>
            <div className="mt-1 font-black">
              {activeStudentProfile
                ? [activeStudentProfile.first_name, activeStudentProfile.last_name].filter(Boolean).join(' ') || '—'
                : '—'}
            </div>
            <div className="mt-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold">Graduation year:</span>{' '}
                {activeStudentProfile?.graduation_year || '—'}
              </div>
              <div>
                <span className="font-semibold">School:</span> {activeStudentProfile?.schools?.name || '—'}
              </div>
            </div>
          </div>
          <div className="card p-4">
            <div className="text-xs font-semibold text-slate-600">What’s Next</div>
            <div className="mt-2 text-sm text-slate-700 space-y-1">
              <div>1. Invite a parent/guardian/counselor below.</div>
              <div>2. Build LifePath in A.U.R.A.</div>
              <div>3. Upload documents and track milestones.</div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <StudentProfileDetailsForm
            studentProfileId={activeStudentProfileId}
            initialFirstName={activeStudentProfile?.first_name || null}
            initialLastName={activeStudentProfile?.last_name || null}
            initialGraduationYear={activeStudentProfile?.graduation_year || null}
            initialSchoolId={activeStudentProfile?.school_id || null}
            schools={(schools || []) as unknown as { id: string; name: string; city: string | null; state: string | null }[]}
          />
        </div>
      </div>

      <div className="card p-8">
        <div className="badge">School</div>
        <h2 className="mt-3 text-2xl font-black tracking-tight">School Hub</h2>
        <p className="mt-2 text-slate-700">
          These modules will connect to your school and student directory data. (Coming soon on web—already listed on mobile.)
        </p>

        <div className="mt-6 grid md:grid-cols-3 gap-4">
          <div className="card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black">School Announcements</div>
                <div className="mt-1 text-sm text-slate-700">
                  Updates from your school and district—deadlines, reminders, and key info.
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <CalendarDays className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black">Events Calendar</div>
                <div className="mt-1 text-sm text-slate-700">
                  Track school events, testing dates, and important milestones in one place.
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <div className="text-lg font-black">Student Directory</div>
                <div className="mt-1 text-sm text-slate-700">
                  Connect with classmates, cohorts, and verified school groups (privacy-safe).
                </div>
                <div className="mt-3">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-slate-100 text-slate-700">
                    Coming Soon
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card p-8">
        <div className="badge">Relationships</div>
        <h2 className="mt-3 text-2xl font-black tracking-tight">Invites & Linked Support</h2>
        <p className="mt-2 text-slate-700">
          Invite supporters to help plan. Counselors are read/support access only for now.
        </p>

        <div className="mt-6">
          <LinkedSupporters
            currentUserId={sp.user.id}
            linked={(linkedRows || []) as unknown as { user_id: string; role: string; created_at: string }[]}
            pendingInvites={pendingInvitesForActive as unknown as { id: string; invited_email: string | null; relationship_role: string; status: string; created_at: string }[]}
          />
        </div>

        <div className="mt-6">
          <RelationshipInvites
            activeStudentProfileId={activeStudentProfileId}
            invitesCreated={(invitesCreated || []) as unknown as InviteRow[]}
            invitesReceived={(invitesReceived || []) as unknown as InviteRow[]}
          />
        </div>
      </div>
    </section>
  )
}
