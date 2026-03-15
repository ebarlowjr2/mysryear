import React from 'react'

export type Scholarship = {
  id: string
  name: string
  amount: string
  deadline: string
  link: string
  tags?: string[]
}

export default function ScholarshipCard({ s }: { s: Scholarship }) {
  return (
    <a
      href={s.link}
      target="_blank"
      rel="noreferrer"
      className="card p-5 hover:shadow-lg transition"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-bold text-lg">{s.name}</h3>
          <p className="mt-1 text-sm text-slate-600">Deadline: {s.deadline}</p>
          {s.tags && (
            <div className="mt-2 flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <span key={t} className="badge">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="text-right">
          <span className="text-brand-700 font-bold">{s.amount}</span>
        </div>
      </div>
      <div className="mt-4 text-sm font-semibold text-brand-700">View details →</div>
    </a>
  )
}
