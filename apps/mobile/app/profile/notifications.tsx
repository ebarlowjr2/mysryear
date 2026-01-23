import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Switch,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { getProfile, updateProfile } from '../../src/data/profile'
import { 
  getNotificationPermissionStatus, 
  openSystemNotificationSettings,
} from '../../src/notifications'
import { safeBack } from '../../src/navigation/safeBack'
import { colors, ui, radius, shadow } from '../../src/theme'

const LEAD_TIME_OPTIONS = [
  { value: 1, label: '1 day before' },
  { value: 3, label: '3 days before' },
  { value: 5, label: '5 days before' },
  { value: 7, label: '7 days before' },
]

export default function NotificationSettingsScreen() {
  const { user, profile: authProfile } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [permissionStatus, setPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined')
  
  // Notification preferences
  const [notifyLinkRequests, setNotifyLinkRequests] = useState(true)
  const [notifyDeadlines, setNotifyDeadlines] = useState(true)
  const [notifyParentUpdates, setNotifyParentUpdates] = useState(true)
  const [deadlineLeadDays, setDeadlineLeadDays] = useState(3)

  useEffect(() => {
    loadSettings()
  }, [user?.id])

  const loadSettings = async () => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      // Check device permission status
      const status = await getNotificationPermissionStatus()
      setPermissionStatus(status)
      
      // Load user preferences from profile
      const profile = await getProfile(user.id)
      if (profile) {
        setNotifyLinkRequests(profile.notify_link_requests ?? true)
        setNotifyDeadlines(profile.notify_deadlines ?? true)
        setNotifyParentUpdates(profile.notify_parent_updates ?? true)
        setDeadlineLeadDays(profile.deadline_lead_days ?? 3)
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (
    key: 'notify_link_requests' | 'notify_deadlines' | 'notify_parent_updates',
    value: boolean
  ) => {
    if (!user?.id) return
    
    // Update local state immediately
    if (key === 'notify_link_requests') setNotifyLinkRequests(value)
    if (key === 'notify_deadlines') setNotifyDeadlines(value)
    if (key === 'notify_parent_updates') setNotifyParentUpdates(value)
    
    // Save to database
    try {
      await updateProfile(user.id, { [key]: value })
    } catch (error) {
      console.error('Failed to update notification setting:', error)
      // Revert on error
      if (key === 'notify_link_requests') setNotifyLinkRequests(!value)
      if (key === 'notify_deadlines') setNotifyDeadlines(!value)
      if (key === 'notify_parent_updates') setNotifyParentUpdates(!value)
    }
  }

  const handleLeadTimeChange = async (days: number) => {
    if (!user?.id) return
    
    const previousValue = deadlineLeadDays
    setDeadlineLeadDays(days)
    
    try {
      await updateProfile(user.id, { deadline_lead_days: days })
    } catch (error) {
      console.error('Failed to update lead time:', error)
      setDeadlineLeadDays(previousValue)
    }
  }

  const handleOpenSettings = async () => {
    await openSystemNotificationSettings()
    // Refresh permission status when user returns
    setTimeout(async () => {
      const status = await getNotificationPermissionStatus()
      setPermissionStatus(status)
    }, 1000)
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ui.primary} />
        </View>
      </SafeAreaView>
    )
  }

  const isParent = authProfile?.role === 'parent'

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack('profile')} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={ui.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notification Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Device Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Device Permissions</Text>
          <View style={styles.permissionCard}>
            <View style={styles.permissionInfo}>
              <View style={[
                styles.permissionIcon,
                permissionStatus === 'granted' ? styles.permissionIconGranted : styles.permissionIconDenied
              ]}>
                <Ionicons 
                  name={permissionStatus === 'granted' ? 'notifications' : 'notifications-off'} 
                  size={24} 
                  color={permissionStatus === 'granted' ? colors.success : colors.error} 
                />
              </View>
              <View style={styles.permissionText}>
                <Text style={styles.permissionStatus}>
                  {permissionStatus === 'granted' ? 'Notifications Allowed' : 
                   permissionStatus === 'denied' ? 'Notifications Blocked' : 
                   'Notifications Not Set'}
                </Text>
                <Text style={styles.permissionDesc}>
                  {permissionStatus === 'granted' 
                    ? 'You will receive push notifications for important updates.'
                    : 'Enable notifications in your device settings to receive alerts.'}
                </Text>
              </View>
            </View>
            {permissionStatus !== 'granted' && (
              <TouchableOpacity style={styles.openSettingsButton} onPress={handleOpenSettings}>
                <Text style={styles.openSettingsText}>Open Settings</Text>
                <Ionicons name="open-outline" size={16} color={ui.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notification Types */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notification Types</Text>
          <View style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Link Requests</Text>
                <Text style={styles.settingDesc}>
                  {isParent 
                    ? 'When a student accepts or declines your link request'
                    : 'When a parent sends you a link request'}
                </Text>
              </View>
              <Switch
                value={notifyLinkRequests}
                onValueChange={(value) => handleToggle('notify_link_requests', value)}
                trackColor={{ false: ui.border, true: ui.primaryLight }}
                thumbColor={notifyLinkRequests ? ui.primary : ui.textMuted}
              />
            </View>

            <View style={styles.settingDivider} />

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Deadline Reminders</Text>
                <Text style={styles.settingDesc}>
                  Reminders for upcoming task and application deadlines
                </Text>
              </View>
              <Switch
                value={notifyDeadlines}
                onValueChange={(value) => handleToggle('notify_deadlines', value)}
                trackColor={{ false: ui.border, true: ui.primaryLight }}
                thumbColor={notifyDeadlines ? ui.primary : ui.textMuted}
              />
            </View>

            {isParent && (
              <>
                <View style={styles.settingDivider} />
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Student Updates</Text>
                    <Text style={styles.settingDesc}>
                      Updates about your linked student's progress
                    </Text>
                  </View>
                  <Switch
                    value={notifyParentUpdates}
                    onValueChange={(value) => handleToggle('notify_parent_updates', value)}
                    trackColor={{ false: ui.border, true: ui.primaryLight }}
                    thumbColor={notifyParentUpdates ? ui.primary : ui.textMuted}
                  />
                </View>
              </>
            )}
          </View>
        </View>

        {/* Reminder Lead Time */}
        {notifyDeadlines && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reminder Lead Time</Text>
            <Text style={styles.sectionDesc}>
              How early should we remind you about upcoming deadlines?
            </Text>
            <View style={styles.leadTimeOptions}>
              {LEAD_TIME_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.leadTimeOption,
                    deadlineLeadDays === option.value && styles.leadTimeOptionActive
                  ]}
                  onPress={() => handleLeadTimeChange(option.value)}
                >
                  <Text style={[
                    styles.leadTimeText,
                    deadlineLeadDays === option.value && styles.leadTimeTextActive
                  ]}>
                    {option.label}
                  </Text>
                  {deadlineLeadDays === option.value && (
                    <Ionicons name="checkmark" size={18} color={ui.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={20} color={ui.textMuted} />
          <Text style={styles.infoNoteText}>
            Push notifications require a TestFlight or App Store build. 
            Notifications may not work in development mode.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  sectionDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 12,
  },
  permissionCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  permissionInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  permissionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionIconGranted: {
    backgroundColor: `${colors.success}20`,
  },
  permissionIconDenied: {
    backgroundColor: `${colors.error}20`,
  },
  permissionText: {
    flex: 1,
  },
  permissionStatus: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  permissionDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    lineHeight: 20,
  },
  openSettingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  openSettingsText: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.primary,
  },
  settingsCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
    marginBottom: 4,
  },
  settingDesc: {
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 18,
  },
  settingDivider: {
    height: 1,
    backgroundColor: ui.border,
    marginHorizontal: 16,
  },
  leadTimeOptions: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  leadTimeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  leadTimeOptionActive: {
    backgroundColor: ui.primaryLight,
  },
  leadTimeText: {
    fontSize: 16,
    color: ui.text,
  },
  leadTimeTextActive: {
    fontWeight: '600',
    color: ui.primary,
  },
  infoNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 16,
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    marginTop: 8,
  },
  infoNoteText: {
    flex: 1,
    fontSize: 13,
    color: ui.textMuted,
    lineHeight: 18,
  },
})
