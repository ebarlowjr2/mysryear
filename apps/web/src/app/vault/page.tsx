import { requireSessionProfile } from '@/lib/auth'
import VaultUpload from '@/components/VaultUpload'

export default async function VaultPage() {
  await requireSessionProfile('/vault')

  return (
    <section className="container-prose pt-10 pb-20 space-y-6">
      <div className="card p-8">
        <div className="badge">Vault</div>
        <h1 className="mt-3 text-3xl sm:text-4xl font-black tracking-tight">Essays & Resume Vault</h1>
        <p className="mt-3 text-slate-700 max-w-2xl">
          Store and organize key documents for the active student profile—resumes, essays, cover
          letters, recommendation materials, and more.
        </p>
      </div>

      <VaultUpload
        title="Upload a document"
        description="These uploads are private to the active student profile. Use the dropdown to categorize each file."
        defaultContext="vault_resume"
        allowedContexts={[
          { value: 'vault_resume', label: 'Resume' },
          { value: 'vault_essay', label: 'Essay draft' },
          { value: 'vault_cover_letter', label: 'Cover letter' },
          { value: 'vault_recommendation', label: 'Recommendation materials' },
          { value: 'vault_portfolio', label: 'Portfolio / work samples' },
          { value: 'vault_other', label: 'Other' },
        ]}
      />
    </section>
  )
}

