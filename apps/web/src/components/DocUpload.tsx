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

export default function DocUpload() {
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

  async function refreshList() {
    setLoadingList(true)
    setMessage('')
    try {
      const res = await fetch('/api/upload', { method: 'GET' })
      const data = (await res.json()) as { ok?: boolean; files?: UploadedFileRow[]; error?: string }
      if (data.ok && data.files) setFiles(data.files)
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
  }, [isAuthenticated])

  const handleUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isAuthenticated) return
    const form = e.currentTarget
    const formData = new FormData(form)

    setUploading(true)
    setMessage('')

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data.ok) {
        setMessage(`Uploaded: ${data.file.file_name}`)
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
      <h3 className="text-lg font-bold mb-4">Document Upload</h3>

      <div className="mb-4">
        <button className="btn-secondary mb-2">Connect Google Drive</button>
        <p className="text-xs text-slate-500">
          Sync transcripts, essays, and recommendation letters.
        </p>
      </div>

      {!isAuthenticated && (
        <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
          <div className="font-semibold">Log in to upload files and save your progress.</div>
          <div className="mt-2">
            <Link href={redirectHref} className="btn-primary inline-flex">
              Log In
            </Link>
          </div>
        </div>
      )}

      <form onSubmit={handleUpload} className="space-y-4">
        <input
          type="file"
          name="file"
          className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100"
          disabled={uploading || !isAuthenticated}
        />
        <button
          type="submit"
          disabled={uploading || !isAuthenticated}
          className="btn-primary w-full"
        >
          {uploading ? 'Uploading...' : 'Upload File'}
        </button>
      </form>

      {message && <p className="mt-3 text-sm">{message}</p>}

      {isAuthenticated && loadingList && <p className="mt-4 text-sm text-slate-600">Loading…</p>}

      {isAuthenticated && files.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-semibold mb-2">Uploaded Files:</h4>
          <ul className="text-sm text-slate-700 space-y-2">
            {files.map((f) => (
              <li key={f.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate font-medium">📄 {f.file_name}</div>
                  <div className="text-xs text-slate-500">
                    {f.file_type || 'unknown type'}
                    {typeof f.file_size === 'number' ? ` • ${f.file_size} bytes` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(f.id)}
                  className="btn-secondary"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
