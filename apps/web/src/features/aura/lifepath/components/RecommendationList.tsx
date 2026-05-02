type Props = {
  items: string[]
}

export default function RecommendationList({ items }: Props) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-600">Recommendations</div>
      <ul className="mt-3 space-y-2">
        {items.slice(0, 5).map((r) => (
          <li key={r} className="flex gap-3">
            <div className="h-6 w-6 rounded-full bg-brand-600 text-white grid place-items-center font-black text-xs">
              ✓
            </div>
            <div className="text-sm text-slate-700">{r}</div>
          </li>
        ))}
      </ul>
    </div>
  )
}
