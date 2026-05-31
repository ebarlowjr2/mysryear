'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthSession } from '@/lib/use-auth-session'

type UploadedFileRow = {
  id: string
  file_name: string
  file_type: string | null
  file_size: number | null
  upload_context: string | null
  created_at: string
}

export default function VaultUpload({
  title,
  description,
  allowedContexts,
  defaultContext,
}: {
  title: string
  description?: string
  allowedContexts: { value: string; label: string }[]
  defaultContext: string
}) {
  const pathname = usePathname()
  const { isAuthenticated } = useAuthSession()

  const redirectHref = useMemo(() => {
    const rt = pathname || '/dashboard'
    return `/login?redirectTo=${encodeURIComponent(rt)}`
  }, [pathname])

  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')
  const [files, setFiles] = useState<UploadedFileRow[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [context, setContext] = useState(defaultContext)

  async function refreshList() {
    setLoadingList(true)
    setMessage('')
    try {
      const res = await fetch('/api/upload', { method: 'GET' })
      const data = (await res.json()) as { ok?: boolean; files?: UploadedFileRow[]; error?: string }
      if (data.ok && data.files) {
        const allowed = new Set(allowedContexts.map((c) => c.value))
        setFiles(data.files.filter((f) => (f.upload_context ? allowed.has(f.upload_context) : false)))
      } else if (data.error) {
        setMessage(`Error: ${data.error}`)
      }
    } finally {
      setLoadingList(false)
    }
  }

  useEffect(() => {
    if (!isAuthenticated) {
      setFiles([])
      setLoadingList(false)
      return
    }
    refreshList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAuthenticated) return
    const form = e.currentTarget
    const formData = new FormData(form)
    formData.set('upload_context', context)

    setUploading(true)
    setMessage('')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = (await res.json()) as { ok?: boolean; error?: string; file?: { file_name: string } }

      if (data.ok) {
        setMessage(`Uploaded: ${data.file?.file_name || 'file'}`)
        form.reset()
        await refreshList()
      } else {
        setMessage(`Error: ${data.error}`)
      }
    } catch {
      setMessage('Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!isAuthenticated) return
    setMessage('')
    try {
      const res = await fetch('/api/upload', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = (await res.json()) as { ok?: boolean; error?: string }
      if (!data.ok) {
        setMessage(`Error: ${data.error || 'Delete failed'}`)
        return
      }
      await refreshList()
    } catch {
      setMessage('Delete failed')
    }
  }

  return (
    <div className="card p-6">
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? <p className="mt-2 text-sm text-slate-700">{description}</p> : null}

      {!isAuthenticated && (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold">Log in to upload files and save your progress.</div>
          <div className="mt-2">
            <Link href={redirectHref} className="btn-primary inline-flex">
              Log In
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-semibold text-slate-700 mb-2">Document type</label>
          <select
            className="input w-full px-4 py-3 rounded-lg"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            disabled={!isAuthenticated || uploading}
          >
            {allowedContexts.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <input
          type="file"
          name="file"
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          disabled={uploading || !isAuthenticated}
        />
        <button type="submit" disabled={uploading || !isAuthenticated} className="btn-primary w-full">
          {uploading ? 'Uploading...' : 'Upload'}
        </button>
      </form>

      {message ? <p className="mt-3 text-sm">{message}</p> : null}

      {isAuthenticated && loadingList ? <p className="mt-4 text-sm text-slate-600">Loading…</p> : null}

      {isAuthenticated && !loadingList && files.length === 0 ? (
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          No files uploaded yet for this vault.
        </div>
      ) : null}

      {isAuthenticated && files.length > 0 ? (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Files</h4>
          <ul className="text-sm text-slate-700 space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">📄 {f.file_name}</div>
                  <div className="text-xs text-slate-500">
                    {f.upload_context || '—'}
                    {f.file_type ? ` • ${f.file_type}` : ''}
                  </div>
                </div>
                <button type="button" onClick={() => handleDelete(f.id)} className="btn-secondary">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

