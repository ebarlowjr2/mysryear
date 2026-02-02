'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Bell, CheckCheck, ExternalLink } from 'lucide-react'
import { createClient } from '@/lib/supabase'
import { listNotifications, markAsRead, markAllAsRead, type Notification } from '@mysryear/shared'

export default function NotificationsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [markingAllRead, setMarkingAllRead] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('onboarding_complete')
          .eq('user_id', user.id)
          .single()

        if (!profile?.onboarding_complete) {
          router.push('/onboarding')
          return
        }

        const notifs = await listNotifications(supabase, { limit: 50 })
        setNotifications(notifs)
        setLoading(false)
      } catch (err) {
        console.error('Error loading notifications:', err)
        setLoading(false)
      }
    }

    loadData()
  }, [router, supabase])

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read_at) {
      await markAsRead(supabase, notification.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
    }

    if (notification.deep_link) {
      router.push(notification.deep_link)
    } else {
      router.push('/dashboard')
    }
  }

  const handleMarkAllRead = async () => {
    setMarkingAllRead(true)
    const success = await markAllAsRead(supabase)
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    }
    setMarkingAllRead(false)
  }

  const unreadCount = notifications.filter(n => !n.read_at).length

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
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
    <div className="container-prose py-14">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-slate-600 hover:text-brand-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-4xl font-black tracking-tight">Notifications</h1>
            <p className="text-slate-700 mt-2">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAllRead}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition disabled:opacity-50"
          >
            <CheckCheck className="w-4 h-4" />
            {markingAllRead ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="card p-12 text-center">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No notifications yet</h3>
          <p className="text-slate-500 max-w-md mx-auto">
            When your student links, deadlines come up, or opportunities update, you&apos;ll see it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(notification => (
            <button
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`w-full text-left card p-4 hover:shadow-md transition ${
                !notification.read_at ? 'bg-brand-50 border-brand-200' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                  !notification.read_at ? 'bg-brand-600' : 'bg-transparent'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-semibold truncate ${
                      !notification.read_at ? 'text-slate-900' : 'text-slate-700'
                    }`}>
                      {notification.title}
                    </h3>
                    <span className="text-xs text-slate-500 flex-shrink-0">
                      {formatDate(notification.created_at)}
                    </span>
                  </div>
                  {notification.body && (
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                      {notification.body}
                    </p>
                  )}
                  {notification.deep_link && (
                    <div className="flex items-center gap-1 text-xs text-brand-600 mt-2">
                      <ExternalLink className="w-3 h-3" />
                      <span>View details</span>
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
