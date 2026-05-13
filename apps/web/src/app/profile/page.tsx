import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'

export default async function ProfilePage() {
  const sp = await requireSessionProfile('/profile')
  const supabase = await createNextServerSupabaseClient()

  const { data: profileRow } = await supabase
    .from('profiles')
    .select('role,onboarding_complete,state,path,testing,early_action,deadline_lead_days')
    .eq('id', sp.user.id)
    .maybeSingle()

  return (
    <section className="container-prose pt-10 pb-20 space-y-6">
      <div className="card p-8">
        <div className="badge">Account</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Profile</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          This is your web profile view. We’ll keep this aligned with the mobile profile as the app
          rebuild continues.
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
              <div>
                <span className="font-semibold">Early Action:</span>{' '}
                {profileRow?.early_action === null || profileRow?.early_action === undefined
                  ? '—'
                  : profileRow.early_action
                    ? 'Yes'
                    : 'No'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

