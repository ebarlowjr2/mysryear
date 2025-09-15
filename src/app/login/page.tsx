'use client'

import React from 'react'
import { useRouter } from 'next/navigation'

export default function Login() {
  const router = useRouter()

  const handleLogin = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-black text-slate-900">
            Welcome to My Senior Year
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Manage your graduation journey
          </p>
        </div>
        
        <div className="card p-8">
          <div className="space-y-6">
            <button
              onClick={handleLogin}
              className="btn-primary w-full py-3 px-4 rounded-lg font-semibold text-center block"
            >
              Open Dashboard
            </button>

            <div className="text-center">
              <p className="text-sm text-slate-600">
                No account required to explore. Start organizing your senior year today!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
