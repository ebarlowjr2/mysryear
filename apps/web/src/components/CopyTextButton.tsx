'use client'

import { useState } from 'react'

export default function CopyTextButton({
  text,
  label = 'Copy',
}: {
  text: string
  label?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignore
    }
  }

  return (
    <button type="button" className="btn-secondary" onClick={copy} disabled={!text}>
      {copied ? 'Copied' : label}
    </button>
  )
}

