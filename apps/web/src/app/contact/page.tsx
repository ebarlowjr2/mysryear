export const metadata = {
  title: 'Contact',
  description: 'Contact MySRYear support.',
}

export default function ContactPage() {
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL || 'quavonojoke@yahoo.com'
  return (
    <section className="container-prose py-16">
      <div className="badge">Support</div>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Contact MySRYear</h1>
      <p className="mt-4 max-w-2xl text-slate-700">
        Need help with an account, invitation, document upload, TestFlight access, or a deletion
        request? Send us a note and include the email connected to your account.
      </p>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <div className="card p-6">
          <h2 className="text-xl font-black">Email Support</h2>
          <p className="mt-2 text-slate-700">We’ll use this channel for early tester support.</p>
          <a className="btn-primary mt-4 inline-flex" href={`mailto:${supportEmail}`}>
            Email {supportEmail}
          </a>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black">What To Include</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-700">
            <li>Your account email.</li>
            <li>Whether you are a student, parent, guardian, counselor, or business user.</li>
            <li>The page or mobile screen where you saw the issue.</li>
            <li>A screenshot if it helps explain the problem.</li>
          </ul>
        </div>
      </div>
    </section>
  )
}
