import React from 'react'

type Item = { month: string; items: string[] }
export default function Timeline({ data }: { data: Item[] }) {
  return (
    <ol className="relative border-l border-slate-200 pl-6 space-y-6">
      {data.map((m, idx) => (
        <li key={idx}>
          <div className="absolute -left-[10px] top-1 h-5 w-5 rounded-full bg-brand-600 ring-4 ring-brand-100"></div>
          <h4 className="font-bold">{m.month}</h4>
          <ul className="mt-2 list-disc ml-4 text-slate-700 space-y-1">
            {m.items.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  )
}
