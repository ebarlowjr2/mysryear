import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient } from '@mysryear/shared'
import BusinessProfileForm from '../ui/BusinessProfileForm'

export default async function BusinessOnboardingPage() {
  await requireSessionProfile('/business/onboarding')
  const supabase = await createNextServerSupabaseClient()
  const { data: { session } } = await supabase.auth.getSession()
  const { data: profile } = session
    ? await supabase.from('business_profiles').select('*').eq('owner_user_id', session.user.id).maybeSingle()
    : { data: null }

  return (
    <div className="container-prose py-14">
      <div className="mb-8">
        <div className="badge">Business Partner</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Set up your business profile</h1>
        <p className="mt-3 text-slate-700 max-w-3xl">
          Create the organization profile students and families will see when you post internships, volunteer roles,
          job shadowing, apprenticeships, workshops, and career programs.
        </p>
      </div>
      <BusinessProfileForm initialProfile={profile} />
    </div>
  )
}
