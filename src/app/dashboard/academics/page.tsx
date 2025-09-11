'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import AdminSidebar from '../../../components/AdminSidebar'
import { ArrowLeft, Plus, Edit, Trash2 } from 'lucide-react'

interface AcademicRecord {
  id: string
  journey_id: string
  subject: string
  credits: number
  grade: string
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function AcademicsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [records, setRecords] = useState<AcademicRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<AcademicRecord | null>(null)
  const [formData, setFormData] = useState({
    subject: '',
    credits: '',
    grade: ''
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
        await loadRecords(user.id)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadRecords = async (userId: string) => {
    const { data: records } = await supabase
      .from('academic_records')
      .select('*')
      .eq('journey_id', userId)
      .order('created_at', { ascending: false })

    setRecords(records || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    const recordData = {
      journey_id: user.id,
      subject: formData.subject,
      credits: parseFloat(formData.credits),
      grade: formData.grade
    }

    if (editingRecord) {
      const { error } = await supabase
        .from('academic_records')
        .update(recordData)
        .eq('id', editingRecord.id)

      if (!error) {
        await loadRecords(user.id)
        setEditingRecord(null)
        setShowForm(false)
        setFormData({ subject: '', credits: '', grade: '' })
      }
    } else {
      const { error } = await supabase
        .from('academic_records')
        .insert([recordData])

      if (!error) {
        await loadRecords(user.id)
        setShowForm(false)
        setFormData({ subject: '', credits: '', grade: '' })
      }
    }
  }

  const handleEdit = (record: AcademicRecord) => {
    setEditingRecord(record)
    setFormData({
      subject: record.subject,
      credits: record.credits.toString(),
      grade: record.grade
    })
    setShowForm(true)
  }

  const handleDelete = async (recordId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('academic_records')
      .delete()
      .eq('id', recordId)

    if (!error) {
      await loadRecords(user.id)
    }
  }

  const calculateGPA = () => {
    if (records.length === 0) return 0

    const gradePoints: { [key: string]: number } = {
      'A+': 4.0, 'A': 4.0, 'A-': 3.7,
      'B+': 3.3, 'B': 3.0, 'B-': 2.7,
      'C+': 2.3, 'C': 2.0, 'C-': 1.7,
      'D+': 1.3, 'D': 1.0, 'F': 0.0
    }

    let totalPoints = 0
    let totalCredits = 0

    records.forEach(record => {
      const points = gradePoints[record.grade] || 0
      totalPoints += points * record.credits
      totalCredits += record.credits
    })

    return totalCredits > 0 ? (totalPoints / totalCredits).toFixed(2) : '0.00'
  }

  const getTotalCredits = () => {
    return records.reduce((total, record) => total + record.credits, 0)
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
              <h1 className="text-2xl font-bold gradient-text">Academic Progress Tracker</h1>
            </div>
          </div>
        </nav>

        <main className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
                  <span className="text-white font-semibold">GPA</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Current GPA</dt>
                  <dd className="text-2xl font-bold text-white">{calculateGPA()}</dd>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-green-500 to-teal-500">
                  <span className="text-white font-semibold">CR</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Total Credits</dt>
                  <dd className="text-2xl font-bold text-white">{getTotalCredits()}</dd>
                </div>
              </div>
            </div>

            <div className="card p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 p-3 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500">
                  <span className="text-white font-semibold">CO</span>
                </div>
                <div className="ml-4">
                  <dt className="text-sm font-medium text-gray-400">Courses Completed</dt>
                  <dd className="text-2xl font-bold text-white">{records.length}</dd>
                </div>
              </div>
            </div>
          </div>

          {canEdit && (
            <div className="mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="btn-gradient px-4 py-2 rounded-lg font-medium flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Add Course</span>
              </button>
            </div>
          )}

          {showForm && (
            <div className="card p-6 mb-6">
              <h3 className="text-lg font-medium text-white mb-4">
                {editingRecord ? 'Edit Course' : 'Add New Course'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-gray-300 mb-2">
                    Subject
                  </label>
                  <input
                    type="text"
                    id="subject"
                    required
                    className="input w-full px-4 py-3 rounded-lg"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="credits" className="block text-sm font-medium text-gray-300 mb-2">
                    Credits
                  </label>
                  <input
                    type="number"
                    id="credits"
                    step="0.5"
                    min="0"
                    required
                    className="input w-full px-4 py-3 rounded-lg"
                    value={formData.credits}
                    onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="grade" className="block text-sm font-medium text-gray-300 mb-2">
                    Grade
                  </label>
                  <select
                    id="grade"
                    required
                    className="input w-full px-4 py-3 rounded-lg"
                    value={formData.grade}
                    onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  >
                    <option value="">Select Grade</option>
                    <option value="A+">A+</option>
                    <option value="A">A</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B">B</option>
                    <option value="B-">B-</option>
                    <option value="C+">C+</option>
                    <option value="C">C</option>
                    <option value="C-">C-</option>
                    <option value="D+">D+</option>
                    <option value="D">D</option>
                    <option value="F">F</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="btn-gradient px-4 py-2 rounded-lg"
                  >
                    {editingRecord ? 'Update Course' : 'Add Course'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingRecord(null)
                      setFormData({ subject: '', credits: '', grade: '' })
                    }}
                    className="glass px-4 py-2 rounded-lg text-white hover:bg-white/10 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-700">
              <h3 className="text-lg font-medium text-white">Course Records</h3>
            </div>
            {records.length === 0 ? (
              <div className="p-6 text-center text-gray-400">
                No courses added yet. {canEdit && 'Click "Add Course" to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Subject
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Credits
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Grade
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                        Date Added
                      </th>
                      {canEdit && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                          Actions
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {records.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-700/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                          {record.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {record.credits}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {record.grade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(record.created_at).toLocaleDateString()}
                        </td>
                        {canEdit && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(record)}
                                className="text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                <Edit size={16} />
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="text-red-400 hover:text-red-300 transition-colors"
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
