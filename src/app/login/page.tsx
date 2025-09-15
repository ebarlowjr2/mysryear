'use client'

import React, { useEffect } from 'react'
import { useUser } from '@auth0/nextjs-auth0'
import { useRouter } from 'next/navigation'

export default function Login() {
  const { user, isLoading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard')
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null // Will redirect to dashboard
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-black text-slate-900">
            Sign in to My Senior Year
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage your graduation journey
          </p>
        </div>
        
        <div className="card p-8">
          <div className="space-y-6">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/auth/login"
              className="btn-primary w-full py-3 px-4 rounded-lg font-semibold text-center block"
            >
              Sign in with Auth0
            </a>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                New to My Senior Year?{' '}
                {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
                <a
                  href="/auth/login?screen_hint=signup"
                  className="font-medium text-brand-600 hover:text-brand-700 transition-colors"
                >
                  Create an account
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
