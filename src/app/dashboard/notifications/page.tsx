'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '../../../lib/supabase'
import { useRouter } from 'next/navigation'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { ArrowLeft, Bell, CheckCircle, AlertCircle, Info, Trash2 } from 'lucide-react'

interface Notification {
  id: string
  user_id: string
  message: string
  type: string
  read: boolean
  created_at: string
}

interface UserProfile {
  id: string
  email: string
  role: 'student' | 'parent' | 'counselor'
}

export default function NotificationsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [notifications, setNotifications] = useState<Notification[]>([])
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

      if (profile) {
        await loadNotifications(user.id)
      }
      
      setLoading(false)
    }

    getUser()
  }, [router])

  const loadNotifications = async (userId: string) => {
    const { data: notifications } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .neq('type', 'college_application')
      .neq('type', 'scholarship_bookmark')
      .order('created_at', { ascending: false })

    setNotifications(notifications || [])
  }

  const markAsRead = async (notificationId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)

    if (!error) {
      await loadNotifications(user.id)
    }
  }

  const deleteNotification = async (notificationId: string) => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId)

    if (!error) {
      await loadNotifications(user.id)
    }
  }

  const markAllAsRead = async () => {
    if (!user) return

    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', user.id)
      .eq('read', false)

    if (!error) {
      await loadNotifications(user.id)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'deadline':
        return <AlertCircle className="text-red-500" size={20} />
      case 'reminder':
        return <Bell className="text-yellow-500" size={20} />
      case 'success':
        return <CheckCircle className="text-green-500" size={20} />
      default:
        return <Info className="text-blue-500" size={20} />
    }
  }

  const getNotificationBgColor = (type: string, read: boolean) => {
    const baseColor = read ? 'bg-gray-50' : 'bg-white'
    const borderColor = read ? 'border-gray-200' : 'border-blue-200'
    return `${baseColor} ${borderColor}`
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

  const unreadCount = notifications.filter(n => !n.read).length

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
                Smart Notifications & Reminders
              </h1>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header with Stats */}
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-medium text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-600">
                  {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
                </p>
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 transition-colors"
                >
                  Mark All as Read
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center">
                <Bell className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
                <p className="text-gray-600">
                  You&apos;re all caught up! Notifications will appear here when you have deadlines, reminders, or updates.
                </p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`border rounded-lg p-4 ${getNotificationBgColor(notification.type, notification.read)}`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <p className={`text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900 font-medium'}`}>
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.read && (
                            <button
                              onClick={() => markAsRead(notification.id)}
                              className="text-purple-600 hover:text-purple-700 text-xs bg-purple-100 px-2 py-1 rounded"
                            >
                              Mark as Read
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Sample Notifications Info */}
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-medium text-blue-900 mb-2">About Smart Notifications</h3>
            <div className="text-sm text-blue-800 space-y-2">
              <p>• <strong>Deadline Alerts:</strong> Get notified about upcoming college application deadlines and scholarship due dates</p>
              <p>• <strong>Progress Reminders:</strong> Receive reminders to update your academic records and service hours</p>
              <p>• <strong>Monthly Reports:</strong> Get monthly summaries of your graduation readiness progress</p>
              <p>• <strong>Role-based Alerts:</strong> Parents and counselors receive relevant notifications about student progress</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
