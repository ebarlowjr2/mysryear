'use client'

import { useEffect, useState } from 'react'
import { createClient, UserRole, VerificationStatus } from '@/lib/supabase'
import { User, Mail, Building2, GraduationCap, Users, Shield, Loader2 } from 'lucide-react'
import LinkedStudentsSection from './LinkedStudentsSection'
import ParentRequestsSection from './ParentRequestsSection'
import BusinessOrgSection from './BusinessOrgSection'
import TeacherProfileSection from './TeacherProfileSection'
import VerificationBanner from './VerificationBanner'

interface UserData {
  id: string
  email: string
  role: UserRole
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified')

  useEffect(() => {
    async function loadUser() {
      const supabase = createClient()
      
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        setLoading(false)
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('id', session.user.id)
        .single()

      if (userData) {
        setUser({
          id: userData.id,
          email: userData.email,
          role: userData.role as UserRole,
        })

        if (userData.role === 'business') {
          const { data: businessProfile } = await supabase
            .from('business_profiles')
            .select('verification_status')
            .eq('user_id', userData.id)
            .single()
          
          if (businessProfile) {
            setVerificationStatus(businessProfile.verification_status as VerificationStatus)
          }
        } else if (userData.role === 'teacher') {
          const { data: teacherProfile } = await supabase
            .from('teacher_profiles')
            .select('verification_status')
            .eq('user_id', userData.id)
            .single()
          
          if (teacherProfile) {
            setVerificationStatus(teacherProfile.verification_status as VerificationStatus)
          }
        }
      }

      setLoading(false)
    }

    loadUser()
  }, [])

  const handleVerificationStatusChange = (newStatus: VerificationStatus) => {
    setVerificationStatus(newStatus)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container-prose py-14">
        <div className="card p-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Please Sign In</h2>
          <p className="text-slate-600 mb-6">You need to be signed in to view your profile.</p>
          <a href="/login" className="btn-gradient px-6 py-3 rounded-lg inline-block">
            Sign In
          </a>
        </div>
      </div>
    )
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'student':
        return <GraduationCap className="w-5 h-5" />
      case 'parent':
        return <Users className="w-5 h-5" />
      case 'counselor':
        return <Shield className="w-5 h-5" />
      case 'business':
        return <Building2 className="w-5 h-5" />
      case 'teacher':
        return <GraduationCap className="w-5 h-5" />
      default:
        return <User className="w-5 h-5" />
    }
  }

  const getRoleLabel = (role: UserRole) => {
    return role.charAt(0).toUpperCase() + role.slice(1)
  }

  return (
    <div className="container-prose py-14">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Profile</h1>
          <p className="text-slate-700 mt-2">Manage your account and settings</p>
        </div>
      </div>

      {(user.role === 'business' || user.role === 'teacher') && (
        <VerificationBanner
          status={verificationStatus}
          role={user.role}
          userId={user.id}
          onStatusChange={handleVerificationStatusChange}
        />
      )}

      <div className="card p-6 mb-8">
        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
          <User className="w-5 h-5 text-brand-600" />
          Account Information
        </h2>
        
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            <Mail className="w-5 h-5 text-slate-500" />
            <div>
              <p className="text-sm text-slate-500">Email</p>
              <p className="font-medium">{user.email}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg">
            {getRoleIcon(user.role)}
            <div>
              <p className="text-sm text-slate-500">Role</p>
              <p className="font-medium">{getRoleLabel(user.role)}</p>
            </div>
          </div>
        </div>
      </div>

      {user.role === 'parent' && (
        <LinkedStudentsSection userId={user.id} />
      )}

      {user.role === 'student' && (
        <ParentRequestsSection userId={user.id} />
      )}

      {user.role === 'business' && (
        <BusinessOrgSection userId={user.id} />
      )}

      {user.role === 'teacher' && (
        <TeacherProfileSection userId={user.id} />
      )}
    </div>
  )
}
