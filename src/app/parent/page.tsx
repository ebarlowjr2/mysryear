'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'
import { Users, Calendar, ClipboardList, CheckCircle, Clock, ArrowLeft } from 'lucide-react'

type LinkedStudent = {
  id: string
  student_user_id: string
  student_name: string
  status: string
}

type StudentSummary = {
  metrics: {
    pendingTasks: number
    completedTasks: number
    applicationsCount: number
  }
  upcomingDeadlines: Array<{
    title: string
    dueDate: string
    type: 'task' | 'application'
  }>
  recentTasks: Array<{
    id: string
    title: string
    status: string
    dueDate: string | null
  }>
}

export default function ParentDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null)
  const [summary, setSummary] = useState<StudentSummary | null>(null)
  const [loadingSummary, setLoadingSummary] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    checkAccessAndLoadStudents()
  }, [])

  useEffect(() => {
    if (selectedStudent) {
      loadStudentSummary(selectedStudent.student_user_id)
    }
  }, [selectedStudent])

  const checkAccessAndLoadStudents = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      // Check if user is a parent
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role, onboarding_complete')
        .eq('user_id', user.id)
        .single()

      if (profileError || !profile) {
        router.push('/login')
        return
      }

      if (profile.role !== 'parent') {
        router.push('/dashboard')
        return
      }

      if (!profile.onboarding_complete) {
        router.push('/onboarding')
        return
      }

      // Load linked students
      const { data: links, error: linksError } = await supabase
        .from('parent_student_links')
        .select(`
          id,
          student_user_id,
          status,
          profiles!parent_student_links_student_user_id_fkey (
            full_name,
            first_name,
            last_name
          )
        `)
        .eq('parent_user_id', user.id)
        .eq('status', 'accepted')

      if (linksError) {
        console.error('Error loading linked students:', linksError)
        setLoading(false)
        return
      }

      type LinkWithProfile = {
        id: string
        student_user_id: string
        status: string
        profiles: {
          full_name: string | null
          first_name: string | null
          last_name: string | null
        } | null
      }

      const students: LinkedStudent[] = (links || []).map((link: LinkWithProfile) => ({
        id: link.id,
        student_user_id: link.student_user_id,
        student_name: link.profiles?.full_name || 
          `${link.profiles?.first_name || ''} ${link.profiles?.last_name || ''}`.trim() || 
          'Student',
        status: link.status
      }))

      setLinkedStudents(students)
      
      // Auto-select first student if available
      if (students.length > 0) {
        setSelectedStudent(students[0])
      }

      setLoading(false)
    } catch (err) {
      console.error('Error:', err)
      setLoading(false)
    }
  }

  const loadStudentSummary = async (studentUserId: string) => {
    setLoadingSummary(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Verify access
      const { data: link } = await supabase
        .from('parent_student_links')
        .select('id')
        .eq('parent_user_id', user.id)
        .eq('student_user_id', studentUserId)
        .eq('status', 'accepted')
        .single()

      if (!link) {
        console.error('No access to this student')
        setLoadingSummary(false)
        return
      }

      // Fetch student data
      const [tasksResult, applicationsResult] = await Promise.all([
        supabase
          .from('user_tasks')
          .select('id, title, status, due_date')
          .eq('user_id', studentUserId)
          .order('due_date', { ascending: true, nullsFirst: false }),
        supabase
          .from('applications')
          .select('id, college_name, status, deadline')
          .eq('user_id', studentUserId)
          .order('deadline', { ascending: true, nullsFirst: false })
      ])

      const tasks = tasksResult.data || []
      const applications = applicationsResult.data || []

      const pendingTasks = tasks.filter(t => t.status !== 'done').length
      const completedTasks = tasks.filter(t => t.status === 'done').length

      const today = new Date().toISOString().split('T')[0]
      
      // Get upcoming deadlines
      const upcomingDeadlines: Array<{ title: string; dueDate: string; type: 'task' | 'application' }> = []
      
      tasks
        .filter(t => t.due_date && t.due_date >= today && t.status !== 'done')
        .slice(0, 3)
        .forEach(t => {
          upcomingDeadlines.push({
            title: t.title,
            dueDate: t.due_date!,
            type: 'task'
          })
        })

      applications
        .filter(a => a.deadline && a.deadline >= today && !['accepted', 'rejected'].includes(a.status))
        .slice(0, 3)
        .forEach(a => {
          upcomingDeadlines.push({
            title: a.college_name,
            dueDate: a.deadline!,
            type: 'application'
          })
        })

      // Sort by date
      upcomingDeadlines.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())

      setSummary({
        metrics: {
          pendingTasks,
          completedTasks,
          applicationsCount: applications.length
        },
        upcomingDeadlines: upcomingDeadlines.slice(0, 5),
        recentTasks: tasks.slice(0, 5).map(t => ({
          id: t.id,
          title: t.title,
          status: t.status,
          dueDate: t.due_date
        }))
      })

      setLoadingSummary(false)
    } catch (err) {
      console.error('Error loading summary:', err)
      setLoadingSummary(false)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex items-center gap-4 mb-6">
          <Link href="/profile" className="text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-3xl font-black text-slate-900">Parent Dashboard</h1>
        </div>

        {linkedStudents.length === 0 ? (
          <div className="card p-8 text-center">
            <Users className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-slate-900 mb-2">No Linked Students</h2>
            <p className="text-slate-600 mb-4">
              You haven&apos;t linked any students yet. Link a student to view their progress.
            </p>
            <Link href="/onboarding/parent" className="btn-primary py-2 px-4 rounded-lg inline-block">
              Link a Student
            </Link>
          </div>
        ) : (
          <>
            {/* Student Selector */}
            {linkedStudents.length > 1 && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">Select Student</label>
                <select
                  value={selectedStudent?.student_user_id || ''}
                  onChange={(e) => {
                    const student = linkedStudents.find(s => s.student_user_id === e.target.value)
                    setSelectedStudent(student || null)
                  }}
                  className="input w-full max-w-xs px-4 py-2 rounded-lg"
                >
                  {linkedStudents.map(student => (
                    <option key={student.id} value={student.student_user_id}>
                      {student.student_name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {selectedStudent && (
              <div className="mb-4">
                <h2 className="text-xl font-semibold text-slate-900">
                  {selectedStudent.student_name}&apos;s Progress
                </h2>
              </div>
            )}

            {loadingSummary ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
              </div>
            ) : summary ? (
              <>
                {/* Metrics Cards */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="card p-4 text-center">
                    <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{summary.metrics.pendingTasks}</div>
                    <div className="text-sm text-slate-600">Pending Tasks</div>
                  </div>
                  <div className="card p-4 text-center">
                    <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{summary.metrics.completedTasks}</div>
                    <div className="text-sm text-slate-600">Completed</div>
                  </div>
                  <div className="card p-4 text-center">
                    <ClipboardList className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-slate-900">{summary.metrics.applicationsCount}</div>
                    <div className="text-sm text-slate-600">Applications</div>
                  </div>
                </div>

                {/* Upcoming Deadlines */}
                <div className="card p-6 mb-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-brand-600" />
                    Upcoming Deadlines
                  </h3>
                  {summary.upcomingDeadlines.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No upcoming deadlines</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.upcomingDeadlines.map((deadline, i) => (
                        <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                          <div>
                            <span className="font-medium text-slate-900">{deadline.title}</span>
                            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {deadline.type === 'task' ? 'Task' : 'Application'}
                            </span>
                          </div>
                          <span className="text-sm text-slate-600">{formatDate(deadline.dueDate)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Recent Tasks */}
                <div className="card p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4">Recent Tasks</h3>
                  {summary.recentTasks.length === 0 ? (
                    <p className="text-slate-500 text-center py-4">No tasks yet</p>
                  ) : (
                    <div className="space-y-3">
                      {summary.recentTasks.map(task => (
                        <div key={task.id} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            task.status === 'done' 
                              ? 'bg-green-500 border-green-500 text-white' 
                              : 'border-slate-300'
                          }`}>
                            {task.status === 'done' && <CheckCircle className="w-3 h-3" />}
                          </div>
                          <div className="flex-1">
                            <span className={`${task.status === 'done' ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {task.title}
                            </span>
                          </div>
                          {task.dueDate && (
                            <span className="text-sm text-slate-500">{formatDate(task.dueDate)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="card p-8 text-center">
                <p className="text-slate-500">Unable to load student data</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
