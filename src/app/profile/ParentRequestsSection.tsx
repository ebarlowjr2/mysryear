'use client'

import { useEffect, useState } from 'react'
import { Users, Check, X, Loader2 } from 'lucide-react'
import { listParentRequests, respondToLinkRequest, ParentRequest } from '@/lib/links'

interface ParentRequestsSectionProps {
  userId: string
}

export default function ParentRequestsSection({ userId }: ParentRequestsSectionProps) {
  const [requests, setRequests] = useState<ParentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadRequests()
  }, [userId])

  async function loadRequests() {
    setLoading(true)
    const data = await listParentRequests(userId)
    setRequests(data)
    setLoading(false)
  }

  async function handleResponse(linkId: string, response: 'accepted' | 'declined') {
    setProcessingId(linkId)
    setError('')
    setSuccess('')

    const result = await respondToLinkRequest(linkId, response)
    
    if (result.success) {
      setSuccess(response === 'accepted' ? 'Link request accepted!' : 'Link request declined.')
      loadRequests()
    } else {
      setError(result.error || 'Failed to respond to request')
    }

    setProcessingId(null)
  }

  if (loading) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-brand-600" />
          Parent Requests
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      </div>
    )
  }

  if (requests.length === 0) {
    return null
  }

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <Users className="w-5 h-5 text-brand-600" />
        Parent Requests
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      <div className="space-y-3">
        {requests.map((request) => (
          <div
            key={request.linkId}
            className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
                <Users className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="font-medium">{request.parentEmail}</p>
                <p className="text-sm text-slate-500">
                  Wants to link with your account
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleResponse(request.linkId, 'accepted')}
                disabled={processingId === request.linkId}
                className="p-2 bg-green-100 text-green-600 hover:bg-green-200 rounded-lg transition disabled:opacity-50"
                title="Accept"
              >
                {processingId === request.linkId ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Check className="w-5 h-5" />
                )}
              </button>
              <button
                onClick={() => handleResponse(request.linkId, 'declined')}
                disabled={processingId === request.linkId}
                className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition disabled:opacity-50"
                title="Decline"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <p className="text-sm text-slate-500 mt-4">
        Accepting a request allows the parent to view your academic progress and journey.
      </p>
    </div>
  )
}
