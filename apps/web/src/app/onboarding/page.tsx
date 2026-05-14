import { requireSessionProfile } from '@/lib/auth'
import { createNextServerSupabaseClient, type UserRole } from '@mysryear/shared'
import { redirect } from 'next/navigation'
import OnboardingForm from './ui/OnboardingForm'

export default async function OnboardingPage() {
  const sp = await requireSessionProfile('/onboarding')
  const supabase = await createNextServerSupabaseClient()

  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('role,onboarding_complete')
    .eq('id', sp.user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (profileRow?.onboarding_complete) {
    redirect('/dashboard')
  }

  const { data: schools } = await supabase
    .from('schools')
    .select('id,name,city,state')
    .order('name', { ascending: true })
    .limit(5000)

  return (
    <section className="container-prose pt-10 pb-20">
      <div className="card p-8">
        <div className="badge">First-time setup</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Onboarding</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          Tell us who you are and who you’re planning for. MySRYear is built for students and the
          trusted adults who support them.
        </p>

        <div className="mt-8">
          <OnboardingForm
            defaultRole={(profileRow?.role as UserRole | undefined) || 'student'}
            schools={(schools || []) as { id: string; name: string; city: string | null; state: string | null }[]}
          />
        </div>
      </div>
    </section>
  )
}

