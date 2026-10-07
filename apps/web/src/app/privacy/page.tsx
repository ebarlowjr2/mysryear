import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How MySRYear handles student, family, and planning information.',
}

export default function PrivacyPage() {
  return (
    <section className="container-prose py-16">
      <div className="badge">Privacy</div>
      <h1 className="mt-4 text-4xl font-black tracking-tight">Privacy Policy</h1>
      <p className="mt-4 text-slate-700">
        MySRYear is built for students and families, so privacy is part of the product foundation.
        This page summarizes the current privacy posture for early testers and small-scale release.
      </p>

      <div className="mt-8 space-y-6 text-slate-700">
        <div className="card p-6">
          <h2 className="text-xl font-black text-slate-950">Information We Collect</h2>
          <p className="mt-2">
            We collect account information, role selection, student profile details, school and
            graduation-year information, uploaded documents, LifePath selections, scholarship and
            opportunity activity, and family/supporter relationship information when users choose to
            provide it.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-slate-950">How We Use Information</h2>
          <p className="mt-2">
            We use this information to operate student planning tools, manage family access, show
            grade-aware recommendations, support document uploads, and improve the MySRYear
            experience.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-slate-950">Student And Family Access</h2>
          <p className="mt-2">
            Student planning records are attached to a student profile. Parents, guardians, and
            counselors only receive access through approved relationships or invitations. Pending
            invitations do not grant access.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-slate-950">Account And Data Deletion</h2>
          <p className="mt-2">
            Signed-in users can permanently delete their account from Profile. Student-owned and
            unclaimed managed profiles, their planning records, and their uploaded files are removed
            as part of that process. Support can also help with deletion questions.
          </p>
        </div>
        <div className="card p-6">
          <h2 className="text-xl font-black text-slate-950">Contact</h2>
          <p className="mt-2">
            For privacy questions or deletion requests, contact us through the support page.
          </p>
          <Link className="btn-primary mt-4 inline-flex" href="/contact">
            Contact Support
          </Link>
        </div>
      </div>
    </section>
  )
}
