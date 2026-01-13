'use client'

import { useEffect, useState } from 'react'
import { Users, Plus, Trash2, Loader2, Clock, CheckCircle, XCircle } from 'lucide-react'
import { listLinkedStudents, createLinkRequest, removeLink, LinkedStudent } from '@/lib/links'

interface LinkedStudentsSectionProps {
  userId: string
}

export default function LinkedStudentsSection({ userId }: LinkedStudentsSectionProps) {
  const [students, setStudents] = useState<LinkedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadStudents()
  }, [userId])

  async function loadStudents() {
    setLoading(true)
    const data = await listLinkedStudents(userId)
    setStudents(data)
    setLoading(false)
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    setSuccess('')

    const result = await createLinkRequest(userId, studentEmail)
    
    if (result.success) {
      setSuccess('Link request sent successfully!')
      setStudentEmail('')
      setShowAddModal(false)
      loadStudents()
    } else {
      setError(result.error || 'Failed to send link request')
    }

    setSubmitting(false)
  }

  async function handleRemoveLink(linkId: string) {
    if (!confirm('Are you sure you want to remove this link?')) return

    const result = await removeLink(linkId)
    if (result.success) {
      loadStudents()
    } else {
      setError(result.error || 'Failed to remove link')
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return null
    }
  }

  const getStatusLabel = (status: string) => {
    return status.charAt(0).toUpperCase() + status.slice(1)
  }

  return (
    <div className="card p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-brand-600" />
          Linked Students
        </h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-gradient px-4 py-2 rounded-lg text-sm flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Student
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No linked students yet</p>
          <p className="text-sm mt-1">Click &quot;Add Student&quot; to send a link request</p>
        </div>
      ) : (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.linkId}
              className="flex items-center justify-between p-4 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center">
                  <Users className="w-5 h-5 text-brand-600" />
                </div>
                <div>
                  <p className="font-medium">{student.email}</p>
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    {getStatusIcon(student.status)}
                    <span>{getStatusLabel(student.status)}</span>
                  </div>
                </div>
              </div>
              {student.status === 'accepted' && (
                <button
                  onClick={() => handleRemoveLink(student.linkId)}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition"
                  title="Remove link"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-xl font-bold mb-4">Link a Student</h3>
            <form onSubmit={handleAddStudent}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Student Email
                </label>
                <input
                  type="email"
                  value={studentEmail}
                  onChange={(e) => setStudentEmail(e.target.value)}
                  className="input w-full px-4 py-3 rounded-lg"
                  placeholder="Enter student's email"
                  required
                />
              </div>
              <p className="text-sm text-slate-500 mb-4">
                The student will receive a request to accept the link. Once accepted, you&apos;ll be able to view their progress.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false)
                    setStudentEmail('')
                    setError('')
                  }}
                  className="flex-1 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 btn-gradient px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    'Send Request'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
