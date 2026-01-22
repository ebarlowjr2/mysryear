export {
  registerForPushNotificationsAsync,
  saveDeviceToken,
  updateDeviceTokenLastSeen,
  removeDeviceToken,
  scheduleLocalReminder,
  cancelScheduledReminder,
  cancelAllScheduledReminders,
  getScheduledReminders,
  calculateReminderDates,
  scheduleDeadlineReminders,
} from './notifications'

export {
  useNotifications,
  cancelNotificationsForItem,
  rescheduleNotificationsForItem,
} from './useNotifications'

export {
  setupNotificationHandler,
  handleNotificationTap,
  getInitialNotification,
  handleInitialNotification,
} from './notificationHandler'

export type { NotificationData, NotificationRequest } from './notifications'
