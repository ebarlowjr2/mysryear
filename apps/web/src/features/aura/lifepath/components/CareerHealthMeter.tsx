type Props = {
  score: number
  label: string
}

export default function CareerHealthMeter({ score, label }: Props) {
  const pct = Math.max(0, Math.min(100, score))
  const color = pct >= 75 ? '#16a34a' : pct >= 55 ? '#f59e0b' : '#e11d48'

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between gap-6">
        <div>
          <div className="text-sm font-semibold text-slate-600">Career Health</div>
          <div className="mt-1 text-2xl font-black">{pct}/100</div>
          <div className="mt-1 text-sm font-semibold" style={{ color }}>
            {label}
          </div>
          <p className="mt-2 text-sm text-slate-600">
            This score is a first-pass model. You can improve it by choosing lower-cost routes,
            building momentum, and adding support.
          </p>
        </div>

        <div
          className="shrink-0 h-28 w-28 rounded-full grid place-items-center"
          style={{
            background: `conic-gradient(${color} ${pct}%, #e5e7eb 0)`,
          }}
        >
          <div className="h-24 w-24 rounded-full bg-white grid place-items-center">
            <div className="text-xl font-black" style={{ color }}>
              {pct}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
