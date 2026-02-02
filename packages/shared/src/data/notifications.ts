import type { SupabaseClient } from '@supabase/supabase-js'

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

export type ListNotificationsOptions = {
  limit?: number
  before?: string
}

export async function listNotifications(
  supabase: SupabaseClient,
  options: ListNotificationsOptions = {}
): Promise<Notification[]> {
  const { limit = 50, before } = options

  let query = supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) {
    query = query.lt('created_at', before)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching notifications:', error)
    return []
  }

  return data as Notification[]
}

export async function getUnreadCount(supabase: SupabaseClient): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)

  if (error) {
    console.error('Error fetching unread count:', error)
    return 0
  }

  return count || 0
}

export async function markAsRead(
  supabase: SupabaseClient,
  notificationId: string
): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId)

  if (error) {
    console.error('Error marking notification as read:', error)
    return false
  }

  return true
}

export async function markAllAsRead(supabase: SupabaseClient): Promise<boolean> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null)

  if (error) {
    console.error('Error marking all notifications as read:', error)
    return false
  }

  return true
}
