'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GraduationCap, CalendarClock, ClipboardList, FileText, User } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import StatTile from '@/components/StatTile'

type DashboardMetrics = {
  scholarshipsCount: number
  upcomingDeadlines: number
  pendingTasks: number
  completedTasks: number
  applicationsCount: number
}

type UpcomingDeadline = {
  title: string
  dueDate: string
  type: 'task' | 'application'
  category?: string
}

type Profile = {
  role: string | null
  onboarding_complete: boolean
  full_name: string | null
}

export default function Dashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    scholarshipsCount: 0,
    upcomingDeadlines: 0,
    pendingTasks: 0,
    completedTasks: 0,
    applicationsCount: 0
  })
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<UpcomingDeadline[]>([])

  const supabase = createClient()

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('role, onboarding_complete, full_name')
          .eq('user_id', user.id)
          .single()

        if (profileError || !profileData) {
          router.push('/login')
          return
        }

        // Check onboarding
        if (!profileData.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        setProfile(profileData)

        // If parent, redirect to parent dashboard
        if (profileData.role === 'parent') {
          router.push('/parent')
          return
        }

        // Load metrics
        const [scholarshipsResult, tasksResult, applicationsResult] = await Promise.all([
          supabase
            .from('scraped_scholarships')
            .select('id', { count: 'exact', head: true })
            .eq('is_active', true),
          supabase
            .from('user_tasks')
            .select('id, status, due_date, title, category')
            .eq('user_id', user.id),
          supabase
            .from('applications')
            .select('id, college_name, deadline, status')
            .eq('user_id', user.id)
        ])

        const scholarshipsCount = scholarshipsResult.count ?? 0
        const applicationsCount = applicationsResult.count ?? 0

        const tasks = tasksResult.data ?? []
        const apps = applicationsResult.data ?? []
        const now = new Date()
        const today = now.toISOString().split('T')[0]
        
        const pendingTasks = tasks.filter(t => t.status !== 'done').length
        const completedTasks = tasks.filter(t => t.status === 'done').length
        const upcomingDeadlinesCount = tasks.filter(t => {
          if (!t.due_date) return false
          const dueDate = new Date(t.due_date)
          return dueDate >= now && t.status !== 'done'
        }).length

        setMetrics({
          scholarshipsCount,
          upcomingDeadlines: upcomingDeadlinesCount,
          pendingTasks,
          completedTasks,
          applicationsCount
        })

        // Build upcoming deadlines list
        const deadlines: UpcomingDeadline[] = []
        
        tasks.forEach(t => {
          if (t.due_date && t.due_date >= today && t.status !== 'done') {
            deadlines.push({
              title: t.title,
              dueDate: t.due_date,
              type: 'task',
              category: t.category
            })
          }
        })

        apps.forEach(a => {
          if (a.deadline && a.deadline >= today && !['accepted', 'rejected'].includes(a.status)) {
            deadlines.push({
              title: a.college_name,
              dueDate: a.deadline,
              type: 'application',
              category: 'Application'
            })
          }
        })

        // Sort by date and take top 5
        deadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
        setUpcomingDeadlines(deadlines.slice(0, 5))

        setLoading(false)
      } catch (err) {
        console.error('Error loading dashboard:', err)
        setLoading(false)
      }
    }

    loadDashboard()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="container-prose py-14">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Dashboard</h1>
          <p className="text-slate-700 mt-2">
            {profile?.full_name ? `Welcome back, ${profile.full_name.split(' ')[0]}` : 'Your senior year, organized and stress-less'}
          </p>
        </div>
        <Link href="/profile" className="flex items-center gap-2 text-slate-600 hover:text-brand-600">
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatTile 
          label="Pending Tasks" 
          value={metrics.pendingTasks.toString()} 
          desc="Tasks to complete" 
        />
        <StatTile 
          label="Completed Tasks" 
          value={metrics.completedTasks.toString()} 
          desc="Tasks finished" 
        />
        <StatTile 
          label="Applications" 
          value={metrics.applicationsCount.toString()} 
          desc="College applications tracked" 
        />
        <StatTile 
          label="Scholarships" 
          value={metrics.scholarshipsCount.toString()} 
          desc="Available opportunities" 
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-8 mb-8">
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Upcoming Deadlines</h3>
          {upcomingDeadlines.length === 0 ? (
            <p className="text-slate-500 text-center py-4">No upcoming deadlines</p>
          ) : (
            <div className="space-y-3">
              {upcomingDeadlines.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                  <div>
                    <span className="font-medium">{item.title}</span>
                    <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {item.type === 'task' ? item.category || 'Task' : 'Application'}
                    </span>
                  </div>
                  <span className="text-sm text-slate-600">{formatDate(item.dueDate)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="card p-6">
          <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link href="/planner" className="block p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition">
              <span className="font-medium">Add a new task</span>
              <span className="text-sm text-slate-500 block">Plan your next milestone</span>
            </Link>
            <Link href="/applications" className="block p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50 transition">
              <span className="font-medium">Track an application</span>
              <span className="text-sm text-slate-500 block">Add a college or program</span>
            </Link>
          </div>
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
