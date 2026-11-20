'use client'

import React from 'react'
import { Check, Circle } from 'lucide-react'
import { useReviewedGuides } from './useReviewedGuides'

export default function ReviewedButton({ slug }: { slug: string }) {
  const { hydrated, isReviewed, toggle } = useReviewedGuides()
  const reviewed = hydrated && isReviewed(slug)

  return (
    <button
      type="button"
      onClick={() => toggle(slug)}
      aria-pressed={reviewed}
      className={
        reviewed
          ? 'no-print inline-flex items-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-2 font-semibold text-brand-800 transition hover:bg-brand-100'
          : 'no-print inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 transition hover:border-brand-300 hover:text-brand-700'
      }
    >
      {reviewed ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Circle className="h-4 w-4" aria-hidden="true" />
      )}
      {reviewed ? 'Reviewed · Saved on this device' : 'Mark as reviewed'}
    </button>
  )
}
