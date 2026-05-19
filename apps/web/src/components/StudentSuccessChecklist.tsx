'use client'

import { useMemo, useState } from 'react'

type Task = {
  id: string
  title: string
  description: string | null
  category: string | null
  status: 'not_started' | 'in_progress' | 'done'
  upload_required: boolean | null
}

export default function StudentSuccessChecklist({
  tasks,
  onChanged,
}: {
  tasks: Task[]
  onChanged(): void
}) {
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const byCategory = useMemo(() => {
    const map = new Map<string, Task[]>()
    for (const t of tasks) {
      const key = t.category || 'General'
      map.set(key, [...(map.get(key) || []), t])
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [tasks])

  async function setStatus(taskId: string, status: Task['status']) {
    setSavingId(taskId)
    setError(null)
    try {
      const res = await fetch('/api/dashboard/tasks', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ taskId, status }),
      })
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null
      if (!res.ok || !json?.ok) {
        setError(json?.error || 'Update failed')
        return
      }
      onChanged()
    } catch {
      setError('Update failed')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <div className="card p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-black">Grade-Level Checklist</h3>
          <p className="mt-1 text-sm text-slate-700">
            Knock out a few items each month. This builds momentum long before senior year.
          </p>
        </div>
      </div>

      {error ? (
        <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          {error}
        </div>
      ) : null}

      <div className="mt-5 space-y-5">
        {byCategory.length === 0 ? (
          <div className="text-sm text-slate-600">No checklist items yet.</div>
        ) : (
          byCategory.map(([category, items]) => (
            <div key={category}>
              <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide">{category}</div>
              <div className="mt-2 space-y-2">
                {items.map((t) => (
                  <div
                    key={t.id}
                    className={`border rounded-lg p-3 flex items-start justify-between gap-3 ${
                      t.status === 'done' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900">
                        {t.title}
                        {t.upload_required ? <span className="text-slate-500"> (upload)</span> : null}
                      </div>
                      {t.description ? <div className="mt-1 text-xs text-slate-700">{t.description}</div> : null}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {t.status !== 'done' ? (
                        <button
                          type="button"
                          className="btn-primary"
                          disabled={savingId === t.id}
                          onClick={() => setStatus(t.id, 'done')}
                        >
                          {savingId === t.id ? 'Saving...' : 'Mark done'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn-secondary"
                          disabled={savingId === t.id}
                          onClick={() => setStatus(t.id, 'not_started')}
                        >
                          {savingId === t.id ? 'Saving...' : 'Undo'}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

