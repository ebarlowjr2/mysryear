import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import {
  getMyProfile,
  updateMyProfile,
  type ProfileWithSchool,
  type ProfileUpdate,
  type UserRole,
} from '../../src/data/profile'
import { colors, ui, radius, shadow } from '../../src/theme'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

const ROLE_LABELS: Record<UserRole, string> = {
  student: 'Student',
  parent: 'Parent',
  teacher: 'Teacher / Staff',
  business: 'Business',
}

const GRADUATION_YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2)

export default function ProfileScreen() {
  const { user, signOut } = useAuth()
  const router = useRouter()
  
  const [profile, setProfile] = useState<ProfileWithSchool | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit form state
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [graduationYear, setGraduationYear] = useState<number | null>(null)
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  const [notificationsTasks, setNotificationsTasks] = useState(true)
  const [notificationsDeadlines, setNotificationsDeadlines] = useState(true)
  const [showStatePicker, setShowStatePicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setError(null)
      const data = await getMyProfile(user.id)
      setProfile(data)
      
      // Initialize form state from profile
      if (data) {
        setFirstName(data.first_name || '')
        setLastName(data.last_name || '')
        setGraduationYear(data.graduation_year)
        setState(data.state || '')
        setCounty(data.county || '')
        setNotificationsTasks(data.notifications_tasks ?? true)
        setNotificationsDeadlines(data.notifications_deadlines ?? true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load profile')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchProfile()
  }, [fetchProfile])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchProfile()
  }, [fetchProfile])

  const validateForm = (): string | null => {
    if (isEditing) {
      if (!firstName.trim() && !lastName.trim()) {
        return 'Please enter your name'
      }
      if (graduationYear && graduationYear < new Date().getFullYear() - 5) {
        return 'Graduation year seems too far in the past'
      }
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validateForm()
    if (validationError) {
      Alert.alert('Validation Error', validationError)
      return
    }

    if (!user?.id) return

    setSaving(true)
    
    const updates: ProfileUpdate = {}
    
    // Only include changed fields
    if (firstName !== (profile?.first_name || '')) {
      updates.first_name = firstName || null
    }
    if (lastName !== (profile?.last_name || '')) {
      updates.last_name = lastName || null
    }
    // Update full_name when first/last name changes
    if (updates.first_name !== undefined || updates.last_name !== undefined) {
      const newFirstName = updates.first_name !== undefined ? updates.first_name : profile?.first_name
      const newLastName = updates.last_name !== undefined ? updates.last_name : profile?.last_name
      updates.full_name = [newFirstName, newLastName].filter(Boolean).join(' ') || null
    }
    if (graduationYear !== profile?.graduation_year) {
      updates.graduation_year = graduationYear
    }
    if (state !== (profile?.state || '')) {
      updates.state = state || null
    }
    if (county !== (profile?.county || '')) {
      updates.county = county || null
    }
    if (notificationsTasks !== (profile?.notifications_tasks ?? true)) {
      updates.notifications_tasks = notificationsTasks
    }
    if (notificationsDeadlines !== (profile?.notifications_deadlines ?? true)) {
      updates.notifications_deadlines = notificationsDeadlines
    }

    // Only update if there are changes
    if (Object.keys(updates).length === 0) {
      setIsEditing(false)
      setSaving(false)
      return
    }

    const { success, error: updateError } = await updateMyProfile(user.id, updates)
    
    setSaving(false)

    if (!success) {
      Alert.alert('Error', updateError || 'Failed to save profile')
      return
    }

    // Refresh profile data
    await fetchProfile()
    setIsEditing(false)
    Alert.alert('Success', 'Profile updated successfully')
  }

  const handleCancel = () => {
    // Reset form to profile values
    if (profile) {
      setFirstName(profile.first_name || '')
      setLastName(profile.last_name || '')
      setGraduationYear(profile.graduation_year)
      setState(profile.state || '')
      setCounty(profile.county || '')
      setNotificationsTasks(profile.notifications_tasks ?? true)
      setNotificationsDeadlines(profile.notifications_deadlines ?? true)
    }
    setIsEditing(false)
  }

  const getDisplayName = () => {
    if (profile?.first_name || profile?.last_name) {
      return [profile.first_name, profile.last_name].filter(Boolean).join(' ')
    }
    return profile?.full_name || user?.email?.split('@')[0] || 'User'
  }

  const getInitials = () => {
    const name = getDisplayName()
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return name.charAt(0).toUpperCase()
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchProfile}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ui.primary}
        />
      }
    >
      {/* Header with Avatar */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials()}</Text>
        </View>
        <Text style={styles.displayName}>{getDisplayName()}</Text>
        <Text style={styles.memberBadge}>My SR Year Member</Text>
        
        {!isEditing ? (
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => setIsEditing(true)}
          >
            <Ionicons name="pencil" size={16} color={ui.primary} />
            <Text style={styles.editButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={handleCancel}
              disabled={saving}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.saveButtonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* A) Account Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        
        {isEditing ? (
          <>
            <View style={styles.inputRow}>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>First Name</Text>
                <TextInput
                  style={styles.input}
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholder="First name"
                  placeholderTextColor={ui.textMuted}
                />
              </View>
              <View style={styles.inputHalf}>
                <Text style={styles.inputLabel}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  value={lastName}
                  onChangeText={setLastName}
                  placeholder="Last name"
                  placeholderTextColor={ui.textMuted}
                />
              </View>
            </View>
          </>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name</Text>
            <Text style={styles.infoValue}>{getDisplayName()}</Text>
          </View>
        )}
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Email</Text>
          <Text style={styles.infoValue}>{user?.email}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Account Type</Text>
          <Text style={styles.infoValue}>
            {profile?.role ? ROLE_LABELS[profile.role] : 'Not set'}
          </Text>
        </View>
      </View>

      {/* B) School Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>School</Text>
        
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Current School</Text>
          <Text style={styles.infoValue}>
            {profile?.schoolMembership?.school?.name || 'Not set'}
          </Text>
        </View>
        
        {profile?.schoolMembership?.school && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>
              {[profile.schoolMembership.school.city, profile.schoolMembership.school.state]
                .filter(Boolean)
                .join(', ') || 'N/A'}
            </Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.changeButton}
          onPress={() => router.push('/(app)/school')}
        >
          <Text style={styles.changeButtonText}>
            {profile?.schoolMembership ? 'Change School' : 'Add School'}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={ui.primary} />
        </TouchableOpacity>
      </View>

      {/* C) Graduation Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Graduation</Text>
        
        {isEditing ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Graduation Year</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowYearPicker(!showYearPicker)}
            >
              <Text style={graduationYear ? styles.pickerText : styles.pickerPlaceholder}>
                {graduationYear || 'Select year'}
              </Text>
              <Ionicons
                name={showYearPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={ui.textMuted}
              />
            </TouchableOpacity>
            
            {showYearPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setGraduationYear(null)
                    setShowYearPicker(false)
                  }}
                >
                  <Text style={styles.pickerOptionText}>Not set</Text>
                </TouchableOpacity>
                {GRADUATION_YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[
                      styles.pickerOption,
                      graduationYear === year && styles.pickerOptionSelected,
                    ]}
                    onPress={() => {
                      setGraduationYear(year)
                      setShowYearPicker(false)
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        graduationYear === year && styles.pickerOptionTextSelected,
                      ]}
                    >
                      {year}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Graduation Year</Text>
            <Text style={styles.infoValue}>
              {profile?.graduation_year || 'Not set'}
            </Text>
          </View>
        )}
      </View>

      {/* D) Location Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Location</Text>
        
        {isEditing ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>State</Text>
              <TouchableOpacity
                style={styles.pickerButton}
                onPress={() => setShowStatePicker(!showStatePicker)}
              >
                <Text style={state ? styles.pickerText : styles.pickerPlaceholder}>
                  {state || 'Select state'}
                </Text>
                <Ionicons
                  name={showStatePicker ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={ui.textMuted}
                />
              </TouchableOpacity>
              
              {showStatePicker && (
                <ScrollView style={styles.pickerOptionsScroll} nestedScrollEnabled>
                  <TouchableOpacity
                    style={styles.pickerOption}
                    onPress={() => {
                      setState('')
                      setShowStatePicker(false)
                    }}
                  >
                    <Text style={styles.pickerOptionText}>Not set</Text>
                  </TouchableOpacity>
                  {US_STATES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.pickerOption,
                        state === s && styles.pickerOptionSelected,
                      ]}
                      onPress={() => {
                        setState(s)
                        setShowStatePicker(false)
                      }}
                    >
                      <Text
                        style={[
                          styles.pickerOptionText,
                          state === s && styles.pickerOptionTextSelected,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
            
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>County</Text>
              <TextInput
                style={styles.input}
                value={county}
                onChangeText={setCounty}
                placeholder="Enter county"
                placeholderTextColor={ui.textMuted}
              />
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>State</Text>
              <Text style={styles.infoValue}>{profile?.state || 'Not set'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>County</Text>
              <Text style={styles.infoValue}>{profile?.county || 'Not set'}</Text>
            </View>
          </>
        )}
      </View>

      {/* E) Preferences Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Preferences</Text>
        
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Task Reminders</Text>
            <Text style={styles.toggleDesc}>Get notified about upcoming tasks</Text>
          </View>
          <Switch
            value={notificationsTasks}
            onValueChange={setNotificationsTasks}
            disabled={!isEditing}
            trackColor={{ false: ui.backgroundSecondary, true: ui.primaryLight }}
            thumbColor={notificationsTasks ? ui.primary : ui.textMuted}
          />
        </View>
        
        <View style={styles.toggleRow}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>Deadline Reminders</Text>
            <Text style={styles.toggleDesc}>Get notified about approaching deadlines</Text>
          </View>
          <Switch
            value={notificationsDeadlines}
            onValueChange={setNotificationsDeadlines}
            disabled={!isEditing}
            trackColor={{ false: ui.backgroundSecondary, true: ui.primaryLight }}
            thumbColor={notificationsDeadlines ? ui.primary : ui.textMuted}
          />
        </View>
      </View>

      {/* F) Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: ui.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  retryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    backgroundColor: ui.card,
    borderBottomWidth: 1,
    borderBottomColor: ui.cardBorder,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
  },
  displayName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ui.text,
  },
  memberBadge: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.primary,
    gap: 6,
  },
  editButtonText: {
    color: ui.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  editActions: {
    flexDirection: 'row',
    marginTop: 16,
    gap: 12,
  },
  cancelButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  cancelButtonText: {
    color: ui.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  saveButton: {
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: ui.primary,
    minWidth: 80,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: ui.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
  },
  infoLabel: {
    fontSize: 15,
    color: ui.textSecondary,
  },
  infoValue: {
    fontSize: 15,
    color: ui.text,
    fontWeight: '500',
    textAlign: 'right',
    flex: 1,
    marginLeft: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  inputHalf: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: ui.text,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  pickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  pickerText: {
    fontSize: 16,
    color: ui.text,
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: ui.textMuted,
  },
  pickerOptions: {
    marginTop: 8,
    backgroundColor: ui.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  pickerOptionsScroll: {
    marginTop: 8,
    backgroundColor: ui.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    maxHeight: 200,
    ...shadow.card,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
  },
  pickerOptionSelected: {
    backgroundColor: ui.primaryLight,
  },
  pickerOptionText: {
    fontSize: 15,
    color: ui.text,
  },
  pickerOptionTextSelected: {
    color: ui.primary,
    fontWeight: '600',
  },
  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    marginTop: 8,
  },
  changeButtonText: {
    fontSize: 15,
    color: ui.primary,
    fontWeight: '500',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleLabel: {
    fontSize: 15,
    color: ui.text,
    fontWeight: '500',
  },
  toggleDesc: {
    fontSize: 13,
    color: ui.textSecondary,
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.error,
    gap: 8,
  },
  logoutText: {
    color: colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
})
