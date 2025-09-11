'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
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
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (!user || !profile) {
    return null
  }

  const modules = [
    {
      title: 'Academic Progress Tracker',
      description: 'Track courses, grades, and graduation requirements',
      icon: GraduationCap,
      href: '/dashboard/academics',
      color: 'bg-blue-500'
    },
    {
      title: 'College & Career Readiness',
      description: 'Manage applications, essays, and recommendations',
      icon: School,
      href: '/dashboard/college',
      color: 'bg-green-500'
    },
    {
      title: 'Scholarship Finder',
      description: 'Discover and track scholarship opportunities',
      icon: DollarSign,
      href: '/dashboard/scholarships',
      color: 'bg-yellow-500'
    },
    {
      title: 'Community Service Log',
      description: 'Log community service and extracurriculars',
      icon: Heart,
      href: '/dashboard/service',
      color: 'bg-red-500'
    },
    {
      title: 'Notifications',
      description: 'View alerts and reminders',
      icon: Bell,
      href: '/dashboard/notifications',
      color: 'bg-purple-500'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                My Senior Year
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                {profile.email} ({profile.role})
              </span>
              <button
                onClick={handleSignOut}
                className="flex items-center space-x-1 text-gray-600 hover:text-gray-900"
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Welcome back, {profile.role}!
            </h2>
            <p className="text-gray-600">
              Manage your graduation journey with these tools
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {modules.map((module) => {
              const Icon = module.icon
              return (
                <Link
                  key={module.href}
                  href={module.href}
                  className="bg-white overflow-hidden shadow rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="p-6">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 ${module.color} rounded-md p-3`}>
                        <Icon className="h-6 w-6 text-white" />
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">
                          {module.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {module.description}
                        </p>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </div>
  )
}
