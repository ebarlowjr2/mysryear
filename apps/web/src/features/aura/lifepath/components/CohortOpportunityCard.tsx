import type { CohortOpportunity } from '../lib/types'

export default function CohortOpportunityCard({ item }: { item: CohortOpportunity }) {
  const content = (
    <div className="card p-4 hover:shadow-soft transition">
      <div className="text-xs font-semibold text-slate-600">{item.type}</div>
      <div className="mt-1 font-black">{item.name}</div>
      <p className="mt-2 text-sm text-slate-700">{item.description}</p>
      {item.link ? (
        <div className="mt-3 text-sm font-semibold text-brand-700">Open link</div>
      ) : (
        <div className="mt-3 text-xs text-slate-500">Mock card (integration coming soon)</div>
      )}
    </div>
  )

  if (item.link) {
    return (
      <a href={item.link} target="_blank" rel="noreferrer">
        {content}
      </a>
    )
  }

  return content
}
