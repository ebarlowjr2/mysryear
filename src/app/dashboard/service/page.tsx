'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft, Plus, Edit, Trash2, CheckCircle, Clock } from 'lucide-react'

interface ServiceHour {
  id: string
  journey_id: string
  organization: string
  hours: number
  verified: boolean
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function ServicePage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [serviceHours, setServiceHours] = useState<ServiceHour[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingService, setEditingService] = useState<ServiceHour | null>(null)
  const [formData, setFormData] = useState({
    organization: '',
    hours: ''
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
        await loadServiceHours(user.id)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadServiceHours = async (userId: string) => {
    const { data: serviceHours } = await supabase
      .from('service_hours')
      .select('*')
      .eq('journey_id', userId)
      .order('created_at', { ascending: false })

    setServiceHours(serviceHours || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!user) return

    const serviceData = {
      journey_id: user.id,
      organization: formData.organization,
      hours: parseFloat(formData.hours),
      verified: false
    }

    if (editingService) {
      const { error } = await supabase
        .from('service_hours')
        .update(serviceData)
        .eq('id', editingService.id)

      if (!error) {
        await loadServiceHours(user.id)
        setEditingService(null)
        setShowForm(false)
        setFormData({ organization: '', hours: '' })
      }
    } else {
      const { error } = await supabase
        .from('service_hours')
        .insert([serviceData])

      if (!error) {
        await loadServiceHours(user.id)
        setShowForm(false)
        setFormData({ organization: '', hours: '' })
      }
    }
  }

  const handleEdit = (service: ServiceHour) => {
    setEditingService(service)
    setFormData({
      organization: service.organization,
      hours: service.hours.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (serviceId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('service_hours')
      .delete()
      .eq('id', serviceId)

    if (!error) {
      await loadServiceHours(user.id)
    }
  }

  const handleVerify = async (serviceId: string, verified: boolean) => {
    if (!user || profile?.role !== 'parent') return

    const { error } = await supabase
      .from('service_hours')
      .update({ verified })
      .eq('id', serviceId)

    if (!error) {
      await loadServiceHours(user.id)
    }
  }

  const getTotalHours = () => {
    return serviceHours.reduce((total, service) => total + service.hours, 0)
  }

  const getVerifiedHours = () => {
    return serviceHours
      .filter(service => service.verified)
      .reduce((total, service) => total + service.hours, 0)
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
  const canVerify = profile.role === 'parent'

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/dashboard"
                className="flex items-center space-x-2 text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft size={20} />
                <span>Back to Dashboard</span>
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">
                Community Service & Extracurricular Log
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-red-600">
                      {getTotalHours()}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Total Hours Logged
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-green-600">
                      {getVerifiedHours()}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Verified Hours
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl font-bold text-purple-600">
                      {serviceHours.length}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        Organizations Served
                      </dt>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Add Service Button */}
          {canEdit && (
            <div className="mb-6">
              <button
                onClick={() => setShowForm(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center space-x-2"
              >
                <Plus size={20} />
                <span>Log Service Hours</span>
              </button>
            </div>
          )}

          {/* Add/Edit Form */}
          {showForm && (
            <div className="bg-white shadow rounded-lg p-6 mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                {editingService ? 'Edit Service Hours' : 'Log New Service Hours'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="organization" className="block text-sm font-medium text-gray-700">
                    Organization
                  </label>
                  <input
                    type="text"
                    id="organization"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    value={formData.organization}
                    onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="hours" className="block text-sm font-medium text-gray-700">
                    Hours
                  </label>
                  <input
                    type="number"
                    id="hours"
                    step="0.5"
                    min="0"
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-red-500 focus:border-red-500"
                    value={formData.hours}
                    onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  />
                </div>
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                  >
                    {editingService ? 'Update Hours' : 'Log Hours'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowForm(false)
                      setEditingService(null)
                      setFormData({ organization: '', hours: '' })
                    }}
                    className="bg-gray-300 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-400 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Service Hours Table */}
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Service Hours Log</h3>
            </div>
            {serviceHours.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No service hours logged yet. {canEdit && 'Click "Log Service Hours" to get started.'}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Organization
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Hours
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date Logged
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {serviceHours.map((service) => (
                      <tr key={service.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {service.organization}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {service.hours}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <div className={`flex items-center space-x-1 ${
                            service.verified ? 'text-green-600' : 'text-yellow-600'
                          }`}>
                            {service.verified ? <CheckCircle size={16} /> : <Clock size={16} />}
                            <span>{service.verified ? 'Verified' : 'Pending'}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(service.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {canEdit && (
                              <>
                                <button
                                  onClick={() => handleEdit(service)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Edit size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(service.id)}
                                  className="text-red-600 hover:text-red-900"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </>
                            )}
                            {canVerify && !service.verified && (
                              <button
                                onClick={() => handleVerify(service.id, true)}
                                className="text-green-600 hover:text-green-900 text-xs bg-green-100 px-2 py-1 rounded"
                              >
                                Verify
                              </button>
                            )}
                            {canVerify && service.verified && (
                              <button
                                onClick={() => handleVerify(service.id, false)}
                                className="text-yellow-600 hover:text-yellow-900 text-xs bg-yellow-100 px-2 py-1 rounded"
                              >
                                Unverify
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
