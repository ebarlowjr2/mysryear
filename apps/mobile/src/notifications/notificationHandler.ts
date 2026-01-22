import * as Notifications from 'expo-notifications'
import { router } from 'expo-router'
import type { Href } from 'expo-router'

/**
 * Set up notification response handler for deep linking
 * Call this in your root layout component
 */
export function setupNotificationHandler() {
  // Handle notification taps when app is in foreground or background
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    handleNotificationTap(response.notification.request.content.data)
  })

  return () => {
    subscription.remove()
  }
}

/**
 * Handle notification tap and navigate to the appropriate screen
 */
export function handleNotificationTap(data: Record<string, unknown>) {
  const deepLink = data?.deepLink as string | undefined
  
  if (!deepLink) {
    console.log('No deep link in notification data')
    return
  }

  console.log('Handling notification tap, deep link:', deepLink)

  // Small delay to ensure app is ready for navigation
  setTimeout(() => {
    try {
      // Parse the deep link and navigate
      if (deepLink.startsWith('/')) {
        router.push(deepLink as Href)
      } else {
        console.warn('Invalid deep link format:', deepLink)
      }
    } catch (error) {
      console.error('Error navigating from notification:', error)
    }
  }, 100)
}

/**
 * Get the initial notification that launched the app (cold start)
 * Call this in your root layout useEffect
 */
export async function getInitialNotification(): Promise<Record<string, unknown> | null> {
  try {
    const response = await Notifications.getLastNotificationResponseAsync()
    if (response) {
      return response.notification.request.content.data as Record<string, unknown>
    }
  } catch (error) {
    console.error('Error getting initial notification:', error)
  }
  return null
}

/**
 * Handle initial notification on cold start
 * Call this in your root layout after auth is ready
 */
export async function handleInitialNotification() {
  const data = await getInitialNotification()
  if (data) {
    handleNotificationTap(data)
  }
}
