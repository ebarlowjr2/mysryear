import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import Constants from 'expo-constants'
import { Platform } from 'react-native'
import { supabase } from '../lib/supabase'

// Configure notification behavior when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async (): Promise<Notifications.NotificationBehavior> => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
})

export type NotificationData = {
  type: string
  deepLink?: string
  [key: string]: unknown
}

/**
 * Register for push notifications and return the Expo push token
 * Returns null if registration fails or device doesn't support push
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device')
    return null
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync()
  let finalStatus = existingStatus

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync()
    finalStatus = status
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted')
    return null
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId
    
    if (!projectId) {
      console.log('No project ID found for push notifications')
      return null
    }

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    })

    // Configure Android notification channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0f172a',
      })
    }

    return tokenData.data
  } catch (error) {
    console.error('Error getting push token:', error)
    return null
  }
}

/**
 * Save device token to Supabase for push notifications
 */
export async function saveDeviceToken(userId: string, token: string): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        device_name: Device.deviceName || 'Unknown Device',
        last_seen_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,expo_push_token',
      }
    )

  return { error: error as Error | null }
}

/**
 * Update last_seen_at for device token (call on app open)
 */
export async function updateDeviceTokenLastSeen(userId: string, token: string): Promise<void> {
  await supabase
    .from('device_tokens')
    .update({ last_seen_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('expo_push_token', token)
}

/**
 * Remove device token (call on logout)
 */
export async function removeDeviceToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('device_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_push_token', token)
}

/**
 * Schedule a local notification reminder
 * Returns the notification identifier for cancellation
 */
export async function scheduleLocalReminder(
  title: string,
  body: string,
  triggerDate: Date,
  data?: NotificationData
): Promise<string | null> {
  try {
    // Don't schedule if date is in the past
    if (triggerDate <= new Date()) {
      console.log('Cannot schedule notification in the past')
      return null
    }

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data: data || {},
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    })

    return identifier
  } catch (error) {
    console.error('Error scheduling notification:', error)
    return null
  }
}

/**
 * Cancel a scheduled notification by identifier
 */
export async function cancelScheduledReminder(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier)
  } catch (error) {
    console.error('Error canceling notification:', error)
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllScheduledReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync()
  } catch (error) {
    console.error('Error canceling all notifications:', error)
  }
}

/**
 * Get all scheduled notifications
 */
export async function getScheduledReminders(): Promise<Notifications.NotificationRequest[]> {
  try {
    return await Notifications.getAllScheduledNotificationsAsync()
  } catch (error) {
    console.error('Error getting scheduled notifications:', error)
    return []
  }
}

/**
 * Calculate reminder dates based on due date and lead days
 * Returns array of dates for "X days before", "1 day before", and "day of"
 */
export function calculateReminderDates(
  dueDate: Date,
  leadDays: number = 3
): { label: string; date: Date }[] {
  const reminders: { label: string; date: Date }[] = []
  const now = new Date()

  // Set reminder time to 9 AM
  const setReminderTime = (date: Date): Date => {
    const reminder = new Date(date)
    reminder.setHours(9, 0, 0, 0)
    return reminder
  }

  // X days before (if leadDays > 1)
  if (leadDays > 1) {
    const leadDate = new Date(dueDate)
    leadDate.setDate(leadDate.getDate() - leadDays)
    const leadReminder = setReminderTime(leadDate)
    if (leadReminder > now) {
      reminders.push({ label: `${leadDays} days before`, date: leadReminder })
    }
  }

  // 1 day before
  const dayBefore = new Date(dueDate)
  dayBefore.setDate(dayBefore.getDate() - 1)
  const dayBeforeReminder = setReminderTime(dayBefore)
  if (dayBeforeReminder > now) {
    reminders.push({ label: '1 day before', date: dayBeforeReminder })
  }

  // Day of
  const dayOfReminder = setReminderTime(dueDate)
  if (dayOfReminder > now) {
    reminders.push({ label: 'day of', date: dayOfReminder })
  }

  return reminders
}

/**
 * Schedule deadline reminders for a task/application/opportunity
 * Returns array of notification identifiers
 */
export async function scheduleDeadlineReminders(
  itemId: string,
  itemType: 'task' | 'application' | 'opportunity',
  title: string,
  dueDate: Date,
  leadDays: number = 3
): Promise<string[]> {
  const identifiers: string[] = []
  const reminderDates = calculateReminderDates(dueDate, leadDays)

  for (const reminder of reminderDates) {
    let body: string
    if (reminder.label === 'day of') {
      body = `"${title}" is due today!`
    } else {
      body = `"${title}" is due in ${reminder.label.replace(' before', '')}`
    }

    const deepLink = getDeepLinkForItem(itemId, itemType)
    
    const identifier = await scheduleLocalReminder(
      getNotificationTitle(itemType),
      body,
      reminder.date,
      {
        type: `${itemType}_deadline`,
        deepLink,
        itemId,
        itemType,
      }
    )

    if (identifier) {
      identifiers.push(identifier)
    }
  }

  return identifiers
}

/**
 * Get notification title based on item type
 */
function getNotificationTitle(itemType: 'task' | 'application' | 'opportunity'): string {
  switch (itemType) {
    case 'task':
      return 'Task Reminder'
    case 'application':
      return 'Application Deadline'
    case 'opportunity':
      return 'Opportunity Deadline'
    default:
      return 'Reminder'
  }
}

/**
 * Get deep link for item based on type
 */
function getDeepLinkForItem(itemId: string, itemType: 'task' | 'application' | 'opportunity'): string {
  switch (itemType) {
    case 'task':
      return `/planner?task=${itemId}`
    case 'application':
      return `/applications/${itemId}`
    case 'opportunity':
      return `/opportunities/${itemId}`
    default:
      return '/'
  }
}

// Export types for external use
export type { NotificationRequest } from 'expo-notifications'
