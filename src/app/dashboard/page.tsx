'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, CalendarClock, ClipboardList, FileText } from 'lucide-react'

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUser(user)
      setLoading(false)
    }

    getUser()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container-prose py-14">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
          <p className="text-slate-700 mt-2">Welcome back, {user?.email}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="btn-secondary"
        >
          Sign Out
        </button>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Applications</div>
          <div className="text-2xl font-black mt-1">3 in progress</div>
          <p className="mt-2 text-sm text-slate-600">Track your college applications</p>
        </div>
        
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Scholarships</div>
          <div className="text-2xl font-black mt-1">12 matches</div>
          <p className="mt-2 text-sm text-slate-600">Filtered by your profile</p>
        </div>
        
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Timeline</div>
          <div className="text-2xl font-black mt-1">On track</div>
          <p className="mt-2 text-sm text-slate-600">Senior year milestones</p>
        </div>
        
        <div className="card p-6">
          <div className="text-sm font-semibold text-slate-600">Resources</div>
          <div className="text-2xl font-black mt-1">5 saved</div>
          <p className="mt-2 text-sm text-slate-600">Essays and documents</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link href="/applications" className="card p-6 hover:shadow-lg transition">
          <ClipboardList className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Applications</h3>
          <p className="text-slate-600 text-sm">Track college and program applications</p>
        </Link>
        
        <Link href="/scholarships" className="card p-6 hover:shadow-lg transition">
          <GraduationCap className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Scholarships</h3>
          <p className="text-slate-600 text-sm">Find funding opportunities</p>
        </Link>
        
        <Link href="/planner" className="card p-6 hover:shadow-lg transition">
          <CalendarClock className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Planner</h3>
          <p className="text-slate-600 text-sm">Senior year timeline and tasks</p>
        </Link>
        
        <Link href="/resources" className="card p-6 hover:shadow-lg transition">
          <FileText className="w-8 h-8 text-brand-600 mb-4" />
          <h3 className="text-lg font-bold mb-2">Resources</h3>
          <p className="text-slate-600 text-sm">Essays, resumes, and guides</p>
        </Link>
      </div>
    </div>
  )
}
