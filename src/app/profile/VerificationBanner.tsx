'use client'

import { useState } from 'react'
import { Shield, Loader2, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { VerificationStatus, UserRole } from '@/lib/supabase'
import { requestVerification, getVerificationBannerConfig } from '@/lib/verification'

interface VerificationBannerProps {
  status: VerificationStatus
  role: UserRole
  userId: string
  onStatusChange: (newStatus: VerificationStatus) => void
}

export default function VerificationBanner({ status, role, userId, onStatusChange }: VerificationBannerProps) {
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState('')

  const config = getVerificationBannerConfig(status)
  const canRequest = status === 'unverified' || status === 'rejected'

  async function handleRequestVerification() {
    setRequesting(true)
    setError('')

    const result = await requestVerification(userId, role)

    if (result.success) {
      onStatusChange('pending')
    } else {
      setError(result.error || 'Failed to request verification')
    }

    setRequesting(false)
  }

  const getStatusIcon = () => {
    switch (status) {
      case 'unverified':
        return <AlertCircle className="w-5 h-5" />
      case 'pending':
        return <Clock className="w-5 h-5" />
      case 'verified':
        return <CheckCircle className="w-5 h-5" />
      case 'rejected':
        return <XCircle className="w-5 h-5" />
    }
  }

  return (
    <div className={`mb-8 p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={config.textColor}>
            {getStatusIcon()}
          </div>
          <div>
            <p className={`font-medium ${config.textColor}`}>
              {config.message}
            </p>
            {status === 'pending' && (
              <p className="text-sm text-slate-600 mt-1">
                We&apos;ll contact you for verification. This usually takes 1-3 business days.
              </p>
            )}
            {status === 'verified' && (
              <p className="text-sm text-slate-600 mt-1">
                Your account has been verified. You have full access to all features.
              </p>
            )}
          </div>
        </div>

        {canRequest && (
          <button
            onClick={handleRequestVerification}
            disabled={requesting}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
          >
            {requesting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
            Request Verification
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
