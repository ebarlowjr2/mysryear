import Link from 'next/link'

export const metadata = {
  title: 'Terms of Use',
  description: 'Terms for using MySRYear during early release.',
}

export default function TermsPage() {
  return (
    <section className="container-prose py-16">
      <div className="badge">Terms</div>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Terms of Use</h1>
      <p className="mt-4 text-slate-700">
        These terms describe the expected use of MySRYear during early release. MySRYear helps with
        planning and organization; it does not replace official school, scholarship, college,
        employer, or government requirements.
      </p>

      <div className="mt-8 grid gap-6">
        <div className="card p-6">
          <h2 className="text-xl font-black">Use The Official Source</h2>
          <p className="mt-2 text-slate-700">
            MySRYear may link to scholarship, school, career, and opportunity resources. Users are
            responsible for confirming deadlines, requirements, and submissions with the official
            provider before acting.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black">Accounts And Access</h2>
          <p className="mt-2 text-slate-700">
            Keep login information secure. Family, guardian, counselor, and business access should
            only be used for legitimate student support or opportunity management.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black">Uploaded Documents</h2>
          <p className="mt-2 text-slate-700">
            Only upload documents you are allowed to store and share. Remove documents that are no
            longer needed or were uploaded by mistake.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black">Support</h2>
          <p className="mt-2 text-slate-700">
            If something looks incorrect, contact support so we can review it quickly.
          </p>
          <Link className="btn-secondary mt-4 inline-flex" href="/contact">
            Contact MySRYear
          </Link>
        </div>
      </div>
    </section>
  )
}
