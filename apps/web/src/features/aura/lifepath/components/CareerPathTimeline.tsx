import type { CareerMilestone } from '../lib/types'

type Props = {
  milestones: CareerMilestone[]
}

export default function CareerPathTimeline({ milestones }: Props) {
  return (
    <div className="card p-5">
      <div className="text-sm font-semibold text-slate-600">Structured Path</div>
      <div className="mt-3 space-y-4">
        {milestones.map((m, idx) => (
          <div key={`${m.stage}-${m.title}-${idx}`} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-9 w-9 rounded-full bg-brand-600 text-white grid place-items-center font-black">
                {idx + 1}
              </div>
              {idx !== milestones.length - 1 ? (
                <div className="w-px flex-1 bg-slate-200" />
              ) : (
                <div className="w-px flex-1" />
              )}
            </div>
            <div className="pb-2">
              <div className="text-xs font-semibold text-slate-600">{m.stage}</div>
              <div className="mt-1 font-black">{m.title}</div>
              <div className="mt-1 text-sm text-slate-700">{m.description}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
