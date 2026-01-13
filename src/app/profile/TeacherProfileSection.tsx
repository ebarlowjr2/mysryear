'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Loader2, Save, School } from 'lucide-react'
import { getTeacherProfile, ensureTeacherProfile, updateTeacherProfile, listSchools, TeacherProfileData, SchoolData, TEACHER_TITLES } from '@/lib/teacher'

interface TeacherProfileSectionProps {
  userId: string
}

export default function TeacherProfileSection({ userId }: TeacherProfileSectionProps) {
  const [profile, setProfile] = useState<TeacherProfileData | null>(null)
  const [schools, setSchools] = useState<SchoolData[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [title, setTitle] = useState('')
  const [schoolId, setSchoolId] = useState('')

  useEffect(() => {
    loadData()
  }, [userId])

  async function loadData() {
    setLoading(true)
    
    const [profileData, schoolsData] = await Promise.all([
      getTeacherProfile(userId),
      listSchools(),
    ])

    let data = profileData
    if (!data) {
      data = await ensureTeacherProfile(userId)
    }

    setProfile(data)
    setSchools(schoolsData)
    setTitle(data.title || '')
    setSchoolId(data.schoolId || '')
    setLoading(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    const result = await updateTeacherProfile(userId, {
      title: title || null,
      schoolId: schoolId || null,
    })

    if (result.success) {
      setSuccess('Teacher profile updated successfully!')
      if (result.data) {
        setProfile(result.data)
      }
    } else {
      setError(result.error || 'Failed to update profile')
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
          <GraduationCap className="w-5 h-5 text-brand-600" />
          Teacher Profile
        </h2>
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 mb-8">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-6">
        <GraduationCap className="w-5 h-5 text-brand-600" />
        Teacher Profile
      </h2>

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

      <form onSubmit={handleSave} className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Title / Role
            </label>
            <select
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
            >
              <option value="">Select title</option>
              {TEACHER_TITLES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              School
            </label>
            <select
              value={schoolId}
              onChange={(e) => setSchoolId(e.target.value)}
              className="input w-full px-4 py-3 rounded-lg"
            >
              <option value="">Select school</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name} {school.city && school.state ? `(${school.city}, ${school.state})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {profile?.schoolName && (
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <School className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">Current School</p>
              <p className="font-medium">{profile.schoolName}</p>
            </div>
          </div>
        )}

        <div className="pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-gradient px-6 py-3 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            Save Changes
          </button>
        </div>
      </form>

      <p className="text-sm text-slate-500 mt-4">
        Note: If your school is not listed, please contact support to have it added.
      </p>
    </div>
  )
}
