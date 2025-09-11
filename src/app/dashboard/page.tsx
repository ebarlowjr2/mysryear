'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import AdminSidebar from '../../components/AdminSidebar'
import { 
  GraduationCap, 
  School, 
  DollarSign, 
  Heart, 
  Bell,
  LogOut 
} from 'lucide-react'

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function Dashboard() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
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

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      setProfile(profile)
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
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-gray-400">Loading your dashboard...</p>
        </div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400">Error loading profile. Please try again.</p>
        </div>
      </div>
    )
  }

  const modules = [
    {
      title: 'Academic Progress Tracker',
      description: 'Track courses, grades, and graduation requirements',
      icon: GraduationCap,
      href: '/dashboard/academics',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      title: 'College & Career Readiness',
      description: 'Manage applications, essays, and recommendations',
      icon: School,
      href: '/dashboard/college',
      gradient: 'from-green-500 to-teal-500'
    },
    {
      title: 'Scholarship Finder',
      description: 'Discover and track scholarship opportunities',
      icon: DollarSign,
      href: '/dashboard/scholarships',
      gradient: 'from-yellow-500 to-orange-500'
    },
    {
      title: 'Community Service Log',
      description: 'Log community service and extracurriculars',
      icon: Heart,
      href: '/dashboard/service',
      gradient: 'from-red-500 to-pink-500'
    },
    {
      title: 'Notifications',
      description: 'View alerts and reminders',
      icon: Bell,
      href: '/dashboard/notifications',
      gradient: 'from-purple-500 to-indigo-500'
    }
  ]

  return (
    <div className="min-h-screen flex">
      <AdminSidebar userRole={profile.role} />
      
      <div className="flex-1 md:ml-80">
        <nav className="glass border-b border-gray-700 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold gradient-text">My Senior Year</h1>
                <p className="text-sm text-gray-400 capitalize">Welcome back, {profile.role}!</p>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-700"
              >
                <LogOut size={20} className="mr-2" />
                Sign Out
              </button>
            </div>
          </div>
        </nav>

        <main className="p-6">
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
            <p className="text-gray-400">Manage your graduation journey with these tools</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module, index) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="card p-6 group animate-fade-in"
                  style={{animationDelay: `${index * 0.1}s`}}
                >
                  <div className="flex items-start">
                    <div className={`flex-shrink-0 p-3 rounded-lg bg-gradient-to-br ${module.gradient} group-hover:scale-110 transition-transform duration-200`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="ml-4 flex-1">
                      <h3 className="text-lg font-semibold text-white group-hover:gradient-text transition-all duration-200">{module.title}</h3>
                      <p className="text-sm text-gray-400 mb-2">{module.description}</p>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>

          <div className="mt-12 card p-6">
            <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center p-3 rounded-lg bg-gray-700/50">
                <div className="w-2 h-2 bg-green-400 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm text-white">Welcome to My Senior Year!</p>
                  <p className="text-xs text-gray-400">Get started by exploring the modules above</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
