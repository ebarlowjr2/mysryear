type Props = {
  selectedCount: number
  max: number
}

export default function TopFiveProgress({ selectedCount, max }: Props) {
  const pct = Math.round((selectedCount / max) * 100)
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-600">Your top choices</div>
          <div className="mt-1 text-lg font-black">
            {selectedCount} of {max} selected
          </div>
        </div>
        <div className="w-40">
          <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-full bg-brand-600" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-xs text-slate-500">Tip: picking 5 makes comparisons stronger.</div>
        </div>
      </div>
    </div>
  )
}
