import { supabase } from '../lib/supabase'

export type Notification = {
  id: string
  user_id: string
  type: string
  title: string
  body: string | null
  deep_link: string | null
  read_at: string | null
  created_at: string
}

/**
 * Get all notifications for the current user, ordered by created_at desc
 */
export async function getNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) {
    console.error('Failed to get notifications:', error)
    return []
  }

  return data as Notification[]
}

/**
 * Get unread notification count for the current user
 */
export async function getUnreadNotificationCount(): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    console.error('Failed to get unread count:', error)
    return 0
  }

  return count || 0
}

/**
 * Mark a notification as read
 */
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('Failed to mark notification as read:', error)
    return false
  }

  return true
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) {
    console.error('Failed to mark all notifications as read:', error)
    return false
  }

  return true
}

/**
 * Group notifications by date for display
 */
export function groupNotificationsByDate(notifications: Notification[]): { title: string; data: Notification[] }[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  const groups: { [key: string]: Notification[] } = {}
  
  for (const notification of notifications) {
    const date = new Date(notification.created_at)
    date.setHours(0, 0, 0, 0)
    
    let groupKey: string
    if (date.getTime() === today.getTime()) {
      groupKey = 'Today'
    } else if (date.getTime() === yesterday.getTime()) {
      groupKey = 'Yesterday'
    } else {
      groupKey = date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      })
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = []
    }
    groups[groupKey].push(notification)
  }
  
  // Convert to array format for SectionList
  return Object.entries(groups).map(([title, data]) => ({ title, data }))
}

/**
 * Format notification time for display
 */
export function formatNotificationTime(createdAt: string): string {
  const date = new Date(createdAt)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  
  if (diffMins < 1) {
    return 'Just now'
  } else if (diffMins < 60) {
    return `${diffMins}m ago`
  } else if (diffHours < 24) {
    return `${diffHours}h ago`
  } else {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }
}
