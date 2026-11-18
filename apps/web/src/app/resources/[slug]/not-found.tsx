import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default function GuideNotFound() {
  return (
    <div className="container-prose py-20 text-center">
      <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Guide not found</p>
      <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">
        We couldn’t find that guide.
      </h1>
      <p className="mx-auto mt-3 max-w-xl text-slate-600">
        The guide you’re looking for may have moved or the link may be incorrect. Browse all 100
        guides in the College Readiness Hub instead.
      </p>
      <Link
        href="/resources"
        className="btn-primary mt-8 inline-flex"
      >
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Back to the Hub
      </Link>
    </div>
  )
}
