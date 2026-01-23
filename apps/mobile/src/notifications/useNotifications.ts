import { useEffect, useRef, useCallback } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../contexts/AuthContext'
import { getTasks, Task } from '../data/planner'
import { listApplications, Application } from '../data/applications'
import { getProfile } from '../data/profile'
import { getTrackedJobsWithDeadlines, getTrackedOpportunitiesWithDeadlines } from '../data/tracking'
import {
  registerForPushNotificationsAsync,
  saveDeviceToken,
  updateDeviceTokenLastSeen,
  scheduleDeadlineReminders,
  cancelScheduledReminder,
  cancelAllScheduledReminders,
} from './notifications'

const NOTIFICATION_IDS_KEY = 'scheduled_notification_ids'

type ScheduledNotificationMap = {
  [itemId: string]: string[] // itemId -> array of notification identifiers
}

/**
 * Hook to manage push notification registration and local deadline scheduling
 * Call this in your root layout or main app component
 */
export function useNotifications() {
  const { user } = useAuth()
  const pushTokenRef = useRef<string | null>(null)
  const hasInitializedRef = useRef(false)

  // Register for push notifications and save token
  const registerPushToken = useCallback(async () => {
    if (!user?.id) return

    const token = await registerForPushNotificationsAsync()
    if (token) {
      pushTokenRef.current = token
      await saveDeviceToken(user.id, token)
      console.log('Push token registered:', token.substring(0, 20) + '...')
    }
  }, [user?.id])

  // Update last_seen_at when app becomes active
  const handleAppStateChange = useCallback(async (nextAppState: AppStateStatus) => {
    if (nextAppState === 'active' && user?.id && pushTokenRef.current) {
      await updateDeviceTokenLastSeen(user.id, pushTokenRef.current)
    }
  }, [user?.id])

  // Sync all deadline notifications
  const syncDeadlineNotifications = useCallback(async () => {
    if (!user?.id) return

    console.log('Syncing deadline notifications...')

    try {
      // Get user's notification preferences
      const profile = await getProfile(user.id)
      if (!profile?.notify_deadlines) {
        console.log('User has disabled deadline notifications')
        await cancelAllScheduledReminders()
        await AsyncStorage.removeItem(NOTIFICATION_IDS_KEY)
        return
      }

      const leadDays = profile.deadline_lead_days || 3

      // Get existing scheduled notification IDs
      const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY)
      const existingIds: ScheduledNotificationMap = existingIdsJson 
        ? JSON.parse(existingIdsJson) 
        : {}

      // Cancel all existing notifications first (clean slate approach)
      for (const itemId of Object.keys(existingIds)) {
        for (const notifId of existingIds[itemId]) {
          await cancelScheduledReminder(notifId)
        }
      }

      const newIds: ScheduledNotificationMap = {}

      // Fetch tasks with due dates in the next 30 days
      const tasks = await getTasks(user.id)
      const now = new Date()
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      for (const task of tasks) {
        if (task.status === 'done' || !task.dueDate) continue

        const dueDate = new Date(task.dueDate)
        if (dueDate <= now || dueDate > thirtyDaysFromNow) continue

        const identifiers = await scheduleDeadlineReminders(
          task.id,
          'task',
          task.title,
          dueDate,
          leadDays
        )

        if (identifiers.length > 0) {
          newIds[task.id] = identifiers
        }
      }

      // Fetch applications with deadlines in the next 30 days
      const applications = await listApplications(user.id)

      for (const app of applications) {
        if (['accepted', 'rejected'].includes(app.status) || !app.deadline) continue

        const deadline = new Date(app.deadline)
        if (deadline <= now || deadline > thirtyDaysFromNow) continue

        const identifiers = await scheduleDeadlineReminders(
          app.id,
          'application',
          app.college_name,
          deadline,
          leadDays
        )

        if (identifiers.length > 0) {
          newIds[app.id] = identifiers
        }
      }

      // Sprint 14: Fetch tracked jobs with deadlines
      const trackedJobs = await getTrackedJobsWithDeadlines()

      for (const job of trackedJobs) {
        const deadline = new Date(job.deadline)
        if (deadline <= now || deadline > thirtyDaysFromNow) continue

        const identifiers = await scheduleDeadlineReminders(
          `job_${job.id}`,
          'job',
          job.title,
          deadline,
          leadDays
        )

        if (identifiers.length > 0) {
          newIds[`job_${job.id}`] = identifiers
        }
      }

      // Sprint 14: Fetch tracked opportunities with deadlines
      const trackedOpportunities = await getTrackedOpportunitiesWithDeadlines()

      for (const opp of trackedOpportunities) {
        const deadline = new Date(opp.deadline)
        if (deadline <= now || deadline > thirtyDaysFromNow) continue

        const identifiers = await scheduleDeadlineReminders(
          `opp_${opp.id}`,
          'opportunity',
          opp.title,
          deadline,
          leadDays
        )

        if (identifiers.length > 0) {
          newIds[`opp_${opp.id}`] = identifiers
        }
      }

      // Save new notification IDs
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(newIds))
      
      const totalScheduled = Object.values(newIds).flat().length
      console.log(`Scheduled ${totalScheduled} deadline notifications`)
    } catch (error) {
      console.error('Error syncing deadline notifications:', error)
    }
  }, [user?.id])

  // Initialize on mount and when user changes
  useEffect(() => {
    if (!user?.id || hasInitializedRef.current) return

    hasInitializedRef.current = true

    // Register push token
    registerPushToken()

    // Sync deadline notifications
    syncDeadlineNotifications()

    // Listen for app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [user?.id, registerPushToken, syncDeadlineNotifications, handleAppStateChange])

  // Re-sync when app becomes active (in case data changed while backgrounded)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && user?.id) {
        syncDeadlineNotifications()
      }
    })

    return () => {
      subscription.remove()
    }
  }, [user?.id, syncDeadlineNotifications])

  return {
    syncDeadlineNotifications,
    registerPushToken,
  }
}

/**
 * Cancel notifications for a specific item (call when task/application is deleted or completed)
 */
export async function cancelNotificationsForItem(itemId: string): Promise<void> {
  try {
    const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY)
    if (!existingIdsJson) return

    const existingIds: ScheduledNotificationMap = JSON.parse(existingIdsJson)
    const notifIds = existingIds[itemId]

    if (notifIds) {
      for (const notifId of notifIds) {
        await cancelScheduledReminder(notifId)
      }
      delete existingIds[itemId]
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(existingIds))
      console.log(`Canceled ${notifIds.length} notifications for item ${itemId}`)
    }
  } catch (error) {
    console.error('Error canceling notifications for item:', error)
  }
}

/**
 * Reschedule notifications for a specific item (call when due date changes)
 */
export async function rescheduleNotificationsForItem(
  itemId: string,
  itemType: 'task' | 'application',
  title: string,
  dueDate: Date | null,
  leadDays: number = 3
): Promise<void> {
  // First cancel existing notifications
  await cancelNotificationsForItem(itemId)

  // If no due date or date is in the past, don't schedule
  if (!dueDate || dueDate <= new Date()) return

  try {
    const identifiers = await scheduleDeadlineReminders(
      itemId,
      itemType,
      title,
      dueDate,
      leadDays
    )

    if (identifiers.length > 0) {
      const existingIdsJson = await AsyncStorage.getItem(NOTIFICATION_IDS_KEY)
      const existingIds: ScheduledNotificationMap = existingIdsJson 
        ? JSON.parse(existingIdsJson) 
        : {}

      existingIds[itemId] = identifiers
      await AsyncStorage.setItem(NOTIFICATION_IDS_KEY, JSON.stringify(existingIds))
      console.log(`Scheduled ${identifiers.length} notifications for item ${itemId}`)
    }
  } catch (error) {
    console.error('Error rescheduling notifications for item:', error)
  }
}
