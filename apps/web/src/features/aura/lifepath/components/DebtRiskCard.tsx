import type { DebtRisk } from '../lib/types'

type Props = {
  debtRisk: DebtRisk
  costMax: number
}

function debtCopy(risk: DebtRisk, costMax: number) {
  if (risk === 'low') {
    return {
      title: 'Low debt pressure',
      body: 'This path can often be funded with savings, part-time work, or limited borrowing.',
      hint: `Keep costs controlled and you can likely avoid heavy debt (est. max: $${costMax.toLocaleString()}).`,
      color: 'text-emerald-700',
      bg: 'bg-emerald-50',
    }
  }
  if (risk === 'medium') {
    return {
      title: 'Medium debt pressure',
      body: 'Borrowing may be needed depending on program choice, aid, and living costs.',
      hint: `You can reduce risk by choosing lower-cost schools or working while studying (est. max: $${costMax.toLocaleString()}).`,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
    }
  }
  return {
    title: 'High debt pressure',
    body: 'This path can become expensive quickly. Plan scholarships, aid, and borrowing limits early.',
    hint: `Make a debt plan before committing to high-cost programs (est. max: $${costMax.toLocaleString()}).`,
    color: 'text-rose-700',
    bg: 'bg-rose-50',
  }
}

export default function DebtRiskCard({ debtRisk, costMax }: Props) {
  const c = debtCopy(debtRisk, costMax)
  return (
    <div className={`card p-5 ${c.bg}`}>
      <div className="text-sm font-semibold">Debt Monitor</div>
      <div className={`mt-2 text-xl font-black ${c.color}`}>{c.title}</div>
      <p className="mt-2 text-sm text-slate-700">{c.body}</p>
      <p className="mt-2 text-sm font-semibold text-slate-700">{c.hint}</p>
    </div>
  )
}
