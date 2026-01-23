import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  SectionList,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Href } from 'expo-router'
import { useFocusEffect } from '@react-navigation/native'
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  groupNotificationsByDate,
  formatNotificationTime,
  type Notification,
} from '../../src/data/notifications'
import { safeBack } from '../../src/navigation/safeBack'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function NotificationsScreen() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const loadNotifications = async () => {
    try {
      const data = await getNotifications()
      setNotifications(data)
    } catch (error) {
      console.error('Failed to load notifications:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadNotifications()
  }, [])

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadNotifications()
    }, [])
  )

  const handleRefresh = () => {
    setRefreshing(true)
    loadNotifications()
  }

  const handleNotificationPress = async (notification: Notification) => {
    // Mark as read if not already
    if (!notification.read_at) {
      await markNotificationAsRead(notification.id)
      setNotifications(prev =>
        prev.map(n =>
          n.id === notification.id
            ? { ...n, read_at: new Date().toISOString() }
            : n
        )
      )
    }

    // Navigate to deep link if available
    if (notification.deep_link) {
      router.push(notification.deep_link as Href)
    } else {
      router.push('/(tabs)' as never)
    }
  }

  const handleMarkAllAsRead = async () => {
    const success = await markAllNotificationsAsRead()
    if (success) {
      setNotifications(prev =>
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      )
    }
  }

  const unreadCount = notifications.filter(n => !n.read_at).length
  const groupedNotifications = groupNotificationsByDate(notifications)

  const renderNotificationItem = ({ item }: { item: Notification }) => {
    const isUnread = !item.read_at

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.notificationItemUnread]}
        onPress={() => handleNotificationPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationContent}>
          {isUnread && <View style={styles.unreadDot} />}
          <View style={styles.notificationIcon}>
            <Ionicons
              name={getIconForType(item.type)}
              size={24}
              color={isUnread ? ui.primary : ui.textMuted}
            />
          </View>
          <View style={styles.notificationText}>
            <Text style={[styles.notificationTitle, isUnread && styles.notificationTitleUnread]}>
              {item.title}
            </Text>
            {item.body && (
              <Text style={styles.notificationBody} numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text style={styles.notificationTime}>
              {formatNotificationTime(item.created_at)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
        </View>
      </TouchableOpacity>
    )
  }

  const renderSectionHeader = ({ section }: { section: { title: string } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  )

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => safeBack('index')} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={ui.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ui.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack('index')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ui.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAllAsRead} style={styles.markAllButton}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {notifications.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIcon}>
            <Ionicons name="notifications-outline" size={64} color={ui.textMuted} />
          </View>
          <Text style={styles.emptyTitle}>No Notifications</Text>
          <Text style={styles.emptyText}>
            You're all caught up! New notifications will appear here.
          </Text>
        </View>
      ) : (
        <SectionList
          sections={groupedNotifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotificationItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={ui.primary}
            />
          }
          stickySectionHeadersEnabled={false}
        />
      )}
    </SafeAreaView>
  )
}

function getIconForType(type: string): keyof typeof Ionicons.glyphMap {
  if (type.includes('link')) return 'people'
  if (type.includes('deadline')) return 'calendar'
  if (type.includes('verification')) return 'checkmark-circle'
  if (type.includes('task')) return 'checkbox'
  if (type.includes('application')) return 'document-text'
  if (type.includes('opportunity')) return 'briefcase'
  if (type.includes('job')) return 'business'
  if (type.includes('mentor')) return 'school'
  return 'notifications'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  headerSpacer: {
    width: 80,
  },
  markAllButton: {
    padding: 8,
  },
  markAllText: {
    fontSize: 14,
    color: ui.primary,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  sectionHeader: {
    backgroundColor: ui.background,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  notificationItem: {
    backgroundColor: ui.card,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  notificationItemUnread: {
    backgroundColor: `${ui.primary}08`,
    borderColor: `${ui.primary}30`,
  },
  notificationContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  unreadDot: {
    position: 'absolute',
    left: 8,
    top: '50%',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.primary,
    marginTop: -4,
  },
  notificationIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationText: {
    flex: 1,
    marginRight: 8,
  },
  notificationTitle: {
    fontSize: 15,
    color: ui.text,
    marginBottom: 4,
  },
  notificationTitleUnread: {
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: 12,
    color: ui.textMuted,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
})
