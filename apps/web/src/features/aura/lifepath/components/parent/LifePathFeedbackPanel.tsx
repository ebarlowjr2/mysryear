'use client'

import { useEffect, useState } from 'react'

type Feedback = {
  id: string
  author_role: string
  note: string
  created_at: string
  author_user_id: string
}

type Props = {
  studentProfileId: string | null
  careerId?: string | null
  canAdd?: boolean
}

export default function LifePathFeedbackPanel({ studentProfileId, careerId = null, canAdd = false }: Props) {
  const [items, setItems] = useState<Feedback[]>([])
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function load() {
    if (!studentProfileId) return
    setError(null)
    const params = new URLSearchParams({ studentProfileId })
    if (careerId) params.set('careerId', careerId)
    const res = await fetch(`/api/aura/lifepath/feedback?${params.toString()}`)
    const json = (await res.json().catch(() => null)) as { ok?: boolean; feedback?: Feedback[]; error?: string } | null
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not load feedback')
      return
    }
    setItems(json.feedback || [])
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentProfileId, careerId])

  async function submit() {
    if (!studentProfileId || !note.trim()) return
    setSaving(true)
    setError(null)
    const res = await fetch('/api/aura/lifepath/feedback', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ studentProfileId, careerId, note }),
    })
    const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
    setSaving(false)
    if (!res.ok || !json?.ok) {
      setError(json?.error || 'Could not save feedback')
      return
    }
    setNote('')
    await load()
  }

  return (
    <div className="card p-6">
      <div className="text-sm font-semibold text-slate-600">Parent Notes + Feedback</div>
      <p className="mt-2 text-sm text-slate-700">Notes are separate from the official LifePath. They do not change careers, tasks, scoring, scholarships, or student progress.</p>

      {canAdd ? (
        <div className="mt-4 space-y-3">
          <textarea
            value={note}
            onChange={(event) => setNote(event.target.value)}
            className="min-h-24 w-full rounded-2xl border border-slate-200 px-4 py-3"
            placeholder="Add a question, encouragement, concern, or idea for this LifePath..."
          />
          <button type="button" className="btn-primary" disabled={saving || !note.trim()} onClick={() => void submit()}>
            {saving ? 'Saving...' : 'Add Note'}
          </button>
        </div>
      ) : null}

      {error ? <div className="mt-3 text-sm text-rose-700">{error}</div> : null}

      <div className="mt-5 space-y-3">
        {items.length === 0 ? <div className="text-sm text-slate-600">No LifePath feedback yet.</div> : items.map((item) => (
          <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="badge">{item.author_role}</span>
              <span>{new Date(item.created_at).toLocaleString()}</span>
            </div>
            <div className="mt-2 text-sm text-slate-800 whitespace-pre-wrap">{item.note}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
