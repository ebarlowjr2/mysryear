'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import AdminSidebar from '../../../components/AdminSidebar'
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react'

interface CollegeApplication {
  id: string
  journey_id: string
  college_name: string
  application_deadline: string
  status: 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected'
  essay_status: 'not_started' | 'draft' | 'completed'
  recommendation_count: number
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function CollegePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [applications, setApplications] = useState<CollegeApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingApp, setEditingApp] = useState<CollegeApplication | null>(null)
  const [formData, setFormData] = useState({
    college_name: '',
    application_deadline: '',
    status: 'not_started' as 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected',
    essay_status: 'not_started' as 'not_started' | 'draft' | 'completed',
    recommendation_count: '0'
  })
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

      if (profile) {
        await loadApplications(user.id)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadApplications = async (userId: string) => {
    const { data: applications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('type', 'college_application')
      .order('created_at', { ascending: false })

    const transformedApps: CollegeApplication[] = (applications || []).map(app => {
      const appData = JSON.parse(app.message)
      return {
        id: app.id,
        journey_id: userId,
        college_name: appData.college_name || '',
        application_deadline: appData.application_deadline || '',
        status: appData.status || 'not_started',
        essay_status: appData.essay_status || 'not_started',
        recommendation_count: appData.recommendation_count || 0,
        created_at: app.created_at
      }
    })

    setApplications(transformedApps)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    const appData = {
      college_name: formData.college_name,
      application_deadline: formData.application_deadline,
      status: formData.status,
      essay_status: formData.essay_status,
      recommendation_count: parseInt(formData.recommendation_count)
    }

    if (editingApp) {
      const { error } = await supabase
        .from('notifications')
        .update({
          message: JSON.stringify(appData)
        })
        .eq('id', editingApp.id)

      if (!error) {
        await loadApplications(user.id)
        setEditingApp(null)
        setShowForm(false)
        setFormData({
          college_name: '',
          application_deadline: '',
          status: 'not_started',
          essay_status: 'not_started',
          recommendation_count: '0'
        })
      }
    } else {
      const { error } = await supabase
        .from('notifications')
        .insert([{
          user_id: user.id,
          message: JSON.stringify(appData),
          type: 'college_application',
          read: false
        }])

      if (!error) {
        await loadApplications(user.id)
        setShowForm(false)
        setFormData({
          college_name: '',
          application_deadline: '',
          status: 'not_started',
          essay_status: 'not_started',
          recommendation_count: '0'
        })
      }
    }
  }

  const handleEdit = (app: CollegeApplication) => {
    setEditingApp(app)
    setFormData({
      college_name: app.college_name,
      application_deadline: app.application_deadline,
      status: app.status,
      essay_status: app.essay_status,
      recommendation_count: app.recommendation_count.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (appId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', appId)

    if (!error) {
      await loadApplications(user.id)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'not_started': return 'text-gray-500'
      case 'in_progress': return 'text-yellow-500'
      case 'submitted': return 'text-blue-500'
      case 'accepted': return 'text-green-500'
      case 'rejected': return 'text-red-500'
      default: return 'text-gray-500'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
      case 'accepted':
        return <CheckCircle size={16} />
      default:
        return <Clock size={16} />
    }
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

  const canEdit = profile.role === 'student'

  return (
    <div className="min-h-screen flex">
      <AdminSidebar userRole={profile?.role || 'student'} />
      
      <div className="flex-1 md:ml-80">
        <nav className="glass border-b border-gray-700 sticky top-0 z-30">
          <div className="px-6 py-4">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-400 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </Link>
              <h1 className="text-2xl font-bold gradient-text">College & Career Readiness</h1>
            </div>
          </div>
        </nav>

        <main className="p-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="card p-6">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-blue-600">
                      {applications.length}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Applications
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-green-600">
                      {applications.filter(app => app.status === 'submitted').length}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Submitted
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-yellow-600">
                      {applications.filter(app => app.status === 'in_progress').length}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        In Progress
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-purple-600">
                      {applications.filter(app => app.status === 'accepted').length}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Accepted
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Application Button */}
          {canEdit && (
            <div className="mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add College Application</span>
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingApp ? 'Edit Application' : 'Add New College Application'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="college_name" className="block text-sm font-medium text-gray-700">
                    College Name
                  </label>
                  <input
                    type="text"
                    id="college_name"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={formData.college_name}
                    onChange={(e) => setFormData({ ...formData, college_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="application_deadline" className="block text-sm font-medium text-gray-700">
                    Application Deadline
                  </label>
                  <input
                    type="date"
                    id="application_deadline"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={formData.application_deadline}
                    onChange={(e) => setFormData({ ...formData, application_deadline: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Application Status
                  </label>
                  <select
                    id="status"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'not_started' | 'in_progress' | 'submitted' | 'accepted' | 'rejected' })}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="submitted">Submitted</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="essay_status" className="block text-sm font-medium text-gray-700">
                    Essay Status
                  </label>
                  <select
                    id="essay_status"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={formData.essay_status}
                    onChange={(e) => setFormData({ ...formData, essay_status: e.target.value as 'not_started' | 'draft' | 'completed' })}
                  >
                    <option value="not_started">Not Started</option>
                    <option value="draft">Draft</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="recommendation_count" className="block text-sm font-medium text-gray-700">
                    Recommendation Letters Count
                  </label>
                  <input
                    type="number"
                    id="recommendation_count"
                    min="0"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-green-500 focus:border-green-500"
                    value={formData.recommendation_count}
                    onChange={(e) => setFormData({ ...formData, recommendation_count: e.target.value })}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                  >
                    {editingApp ? 'Update Application' : 'Add Application'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingApp(null)
                      setFormData({
                        college_name: '',
                        application_deadline: '',
                        status: 'not_started',
                        essay_status: 'not_started',
                        recommendation_count: '0'
                      })
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Applications Table */}
          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-white">College Applications</h3>
            </div>
            {applications.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No college applications added yet. {canEdit && 'Click "Add College Application" to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        College
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Deadline
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Essay
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recommendations
                      </th>
                      {canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {applications.map((app) => (
                      <tr key={app.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {app.college_name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(app.application_deadline).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className={`flex items-center space-x-1 ${getStatusColor(app.status)}`}>
                            {getStatusIcon(app.status)}
                            <span className="capitalize">{app.status.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <span className="capitalize">{app.essay_status.replace('_', ' ')}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {app.recommendation_count}
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(app)}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(app.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
