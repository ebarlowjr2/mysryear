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
  Modal,
} from 'react-native'
import { useRouter, router } from 'expo-router'
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
import {
  getLinkedStudents,
  getPendingLinkRequests,
  sendLinkRequest,
  respondToLinkRequest,
  removeLinkRequest,
  type LinkedStudent,
  type ParentStudentLink,
} from '../../src/data/parent-student'
import {
  getVerificationStatus,
  requestVerification,
  getVerificationBannerConfig,
  type VerificationStatus,
  type VerificationBannerConfig,
} from '../../src/data/verification'
import {
  getBusinessProfile,
  ensureBusinessProfile,
  updateBusinessProfile,
  INDUSTRIES,
  type BusinessProfile,
} from '../../src/data/business'
import {
  getTeacherProfile,
  ensureTeacherProfile,
  updateTeacherProfile,
  TEACHER_TITLES,
  type TeacherProfileWithSchool,
} from '../../src/data/teacher'
import { searchSchools, type School } from '../../src/data/schools'

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
  const [waitlistAiAura, setWaitlistAiAura] = useState(false)
  const [waitlistDrive, setWaitlistDrive] = useState(false)
  const [waitlistOnedrive, setWaitlistOnedrive] = useState(false)
  const [showStatePicker, setShowStatePicker] = useState(false)
  const [showYearPicker, setShowYearPicker] = useState(false)

  // Sprint 4: Parent linking state
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [parentRequests, setParentRequests] = useState<ParentStudentLink[]>([])
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [linkingStudent, setLinkingStudent] = useState(false)

  // Sprint 4: Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified')
  const [requestingVerification, setRequestingVerification] = useState(false)

  // Sprint 4: Business profile state
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null)
  const [businessOrgName, setBusinessOrgName] = useState('')
  const [businessWebsite, setBusinessWebsite] = useState('')
  const [businessEmail, setBusinessEmail] = useState('')
  const [businessPhone, setBusinessPhone] = useState('')
  const [businessIndustry, setBusinessIndustry] = useState('')
  const [businessHqState, setBusinessHqState] = useState('')
  const [businessHqCounty, setBusinessHqCounty] = useState('')
  const [showIndustryPicker, setShowIndustryPicker] = useState(false)
  const [showBusinessStatePicker, setShowBusinessStatePicker] = useState(false)
  const [savingBusiness, setSavingBusiness] = useState(false)

  // Sprint 4: Teacher profile state
  const [teacherProfile, setTeacherProfile] = useState<TeacherProfileWithSchool | null>(null)
  const [teacherTitle, setTeacherTitle] = useState('')
  const [showTitlePicker, setShowTitlePicker] = useState(false)
  const [schoolSearchQuery, setSchoolSearchQuery] = useState('')
  const [schoolSearchResults, setSchoolSearchResults] = useState<School[]>([])
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  const [savingTeacher, setSavingTeacher] = useState(false)

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
        setWaitlistAiAura(data.waitlist_ai_aura ?? false)
        setWaitlistDrive(data.waitlist_drive ?? false)
        setWaitlistOnedrive(data.waitlist_onedrive ?? false)

        // Sprint 4: Load role-specific data
        if (data.role === 'parent') {
          const students = await getLinkedStudents(user.id)
          setLinkedStudents(students)
        }
        
        if (data.role === 'student') {
          const requests = await getPendingLinkRequests(user.id)
          setParentRequests(requests)
        }
        
        if (data.role === 'business') {
          const { profile: bp } = await ensureBusinessProfile(user.id)
          if (bp) {
            setBusinessProfile(bp)
            setBusinessOrgName(bp.org_name || '')
            setBusinessWebsite(bp.org_website || '')
            setBusinessEmail(bp.org_email || '')
            setBusinessPhone(bp.phone || '')
            setBusinessIndustry(bp.industry || '')
            setBusinessHqState(bp.hq_state || '')
            setBusinessHqCounty(bp.hq_county || '')
          }
          // Sprint 10: Get verification status from profiles table
          const verificationInfo = await getVerificationStatus(user.id)
          setVerificationStatus(verificationInfo.status)
        }
        
        if (data.role === 'teacher') {
          const { profile: tp } = await ensureTeacherProfile(user.id)
          if (tp) {
            const teacherData = await getTeacherProfile(user.id)
            setTeacherProfile(teacherData)
            setTeacherTitle(tp.title || '')
            setSelectedSchool(teacherData?.school || null)
          }
          // Sprint 10: Get verification status from profiles table
          const verificationInfo = await getVerificationStatus(user.id)
          setVerificationStatus(verificationInfo.status)
        }
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
    if (waitlistAiAura !== (profile?.waitlist_ai_aura ?? false)) {
      updates.waitlist_ai_aura = waitlistAiAura
    }
    if (waitlistDrive !== (profile?.waitlist_drive ?? false)) {
      updates.waitlist_drive = waitlistDrive
    }
    if (waitlistOnedrive !== (profile?.waitlist_onedrive ?? false)) {
      updates.waitlist_onedrive = waitlistOnedrive
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
      setWaitlistAiAura(profile.waitlist_ai_aura ?? false)
      setWaitlistDrive(profile.waitlist_drive ?? false)
      setWaitlistOnedrive(profile.waitlist_onedrive ?? false)
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

  // Sprint 4: Parent linking handlers
  const handleSendLinkRequest = async () => {
    if (!user?.id || !studentEmail.trim()) return
    
    setLinkingStudent(true)
    const { success, error: linkError } = await sendLinkRequest(user.id, studentEmail.trim())
    setLinkingStudent(false)
    
    if (!success) {
      Alert.alert('Error', linkError || 'Failed to send link request')
      return
    }
    
    Alert.alert('Success', 'Link request sent successfully')
    setStudentEmail('')
    setShowAddStudentModal(false)
    
    // Refresh linked students
    const students = await getLinkedStudents(user.id)
    setLinkedStudents(students)
  }

  const handleRespondToRequest = async (linkId: string, accept: boolean) => {
    const { success, error: respondError } = await respondToLinkRequest(linkId, accept)
    
    if (!success) {
      Alert.alert('Error', respondError || 'Failed to respond to request')
      return
    }
    
    Alert.alert('Success', accept ? 'Link request accepted' : 'Link request declined')
    
    // Refresh parent requests
    if (user?.id) {
      const requests = await getPendingLinkRequests(user.id)
      setParentRequests(requests)
    }
  }

  const handleRemoveLink = async (linkId: string) => {
    Alert.alert(
      'Remove Link',
      'Are you sure you want to remove this student link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const { success, error: removeError } = await removeLinkRequest(linkId)
            
            if (!success) {
              Alert.alert('Error', removeError || 'Failed to remove link')
              return
            }
            
            // Refresh linked students
            if (user?.id) {
              const students = await getLinkedStudents(user.id)
              setLinkedStudents(students)
            }
          },
        },
      ]
    )
  }

  // Sprint 10: Verification handler - uses profiles table
  const handleRequestVerification = async () => {
    if (!user?.id || !profile?.role) return
    
    setRequestingVerification(true)
    const { success, error: verifyError } = await requestVerification(user.id)
    setRequestingVerification(false)
    
    if (!success) {
      Alert.alert('Error', verifyError || 'Failed to request verification')
      return
    }
    
    setVerificationStatus('pending')
    Alert.alert('Success', 'Verification request submitted. We\'ll notify you once reviewed.')
  }

  // Sprint 4: Business profile handler
  const handleSaveBusinessProfile = async () => {
    if (!user?.id) return
    
    setSavingBusiness(true)
    const { success, error: saveError } = await updateBusinessProfile(user.id, {
      org_name: businessOrgName || null,
      org_website: businessWebsite || null,
      org_email: businessEmail || null,
      phone: businessPhone || null,
      industry: businessIndustry || null,
      hq_state: businessHqState || null,
      hq_county: businessHqCounty || null,
    })
    setSavingBusiness(false)
    
    if (!success) {
      Alert.alert('Error', saveError || 'Failed to save business profile')
      return
    }
    
    Alert.alert('Success', 'Business profile updated')
    
    // Refresh business profile
    const bp = await getBusinessProfile(user.id)
    if (bp) setBusinessProfile(bp)
  }

  // Sprint 4: Teacher profile handler
  const handleSaveTeacherProfile = async () => {
    if (!user?.id) return
    
    setSavingTeacher(true)
    const { success, error: saveError } = await updateTeacherProfile(user.id, {
      title: teacherTitle || null,
      school_id: selectedSchool?.id || null,
    })
    setSavingTeacher(false)
    
    if (!success) {
      Alert.alert('Error', saveError || 'Failed to save teacher profile')
      return
    }
    
    Alert.alert('Success', 'Teacher profile updated')
    
    // Refresh teacher profile
    const tp = await getTeacherProfile(user.id)
    if (tp) setTeacherProfile(tp)
  }

    // Sprint 4: School search handler
    const handleSchoolSearch = async (query: string) => {
      setSchoolSearchQuery(query)
      if (query.length < 2) {
        setSchoolSearchResults([])
        return
      }
      const results = await searchSchools(query)
      setSchoolSearchResults(results)
    }

    // Logout handler with navigation trap prevention
    const handleLogout = async () => {
      await signOut()
      // Use replace to prevent back-navigation into authenticated screens
      router.replace('/(auth)/login')
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

      {/* Sprint 10: Verification Banner for Business/Teacher */}
      {(profile?.role === 'business' || profile?.role === 'teacher') && (() => {
        const bannerConfig = getVerificationBannerConfig(verificationStatus, profile.role as 'business' | 'teacher')
        return (
          <View style={[styles.verificationBanner, { backgroundColor: bannerConfig.backgroundColor }]}>
            <View style={styles.verificationBannerHeader}>
              <Ionicons name={bannerConfig.icon} size={20} color={bannerConfig.textColor} />
              <Text style={[styles.verificationBannerText, { color: bannerConfig.textColor }]}>
                {bannerConfig.message}
              </Text>
            </View>
            {bannerConfig.helperText ? (
              <Text style={[styles.verificationHelperText, { color: bannerConfig.textColor }]}>
                {bannerConfig.helperText}
              </Text>
            ) : null}
            {bannerConfig.showRequestButton && (
              <TouchableOpacity
                style={[styles.verificationButton, { backgroundColor: bannerConfig.textColor }]}
                onPress={handleRequestVerification}
                disabled={requestingVerification}
              >
                {requestingVerification ? (
                  <ActivityIndicator size="small" color={bannerConfig.backgroundColor} />
                ) : (
                  <Text style={[styles.verificationButtonText, { color: bannerConfig.backgroundColor }]}>Request Verification</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )
      })()}

      {/* Sprint 4: Linked Students Section for Parents */}
      {profile?.role === 'parent' && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Linked Students</Text>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: ui.backgroundSecondary }]}
                onPress={() => router.push('/profile/linked-students')}
              >
                <Text style={[styles.addButtonText, { color: ui.text }]}>View All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddStudentModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {linkedStudents.length === 0 ? (
            <Text style={styles.emptyText}>No linked students yet. Add a student to get started.</Text>
          ) : (
            linkedStudents.map((student) => (
              <View key={student.id} style={styles.linkedStudentRow}>
                <View style={styles.linkedStudentInfo}>
                  <Text style={styles.linkedStudentName}>{student.full_name || 'Unknown'}</Text>
                  <Text style={styles.linkedStudentDetails}>
                    {student.school || 'No school'} {student.graduation_year ? `• Class of ${student.graduation_year}` : ''}
                  </Text>
                  <View style={[styles.statusBadge, student.status === 'accepted' ? styles.statusAccepted : student.status === 'pending' ? styles.statusPending : styles.statusDeclined]}>
                    <Text style={styles.statusBadgeText}>{student.status}</Text>
                  </View>
                </View>
                {student.status === 'accepted' && (
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => handleRemoveLink(student.link_id)}
                  >
                    <Ionicons name="close-circle" size={24} color={colors.error} />
                  </TouchableOpacity>
                )}
              </View>
            ))
          )}
        </View>
      )}

      {/* Sprint 4: Parent Requests Section for Students */}
      {profile?.role === 'student' && parentRequests.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Parent Link Requests</Text>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: ui.backgroundSecondary }]}
              onPress={() => router.push('/profile/parent-requests')}
            >
              <Text style={[styles.addButtonText, { color: ui.text }]}>View All</Text>
            </TouchableOpacity>
          </View>
          
          {parentRequests.map((request) => (
            <View key={request.id} style={styles.parentRequestRow}>
              <Text style={styles.parentRequestText}>
                A parent has requested to link with your account
              </Text>
              <View style={styles.parentRequestActions}>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => handleRespondToRequest(request.id, true)}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => handleRespondToRequest(request.id, false)}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Sprint 4: Business Organization Section */}
      {profile?.role === 'business' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Organization</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Organization Name</Text>
            <TextInput
              style={styles.input}
              value={businessOrgName}
              onChangeText={setBusinessOrgName}
              placeholder="Enter organization name"
              placeholderTextColor={ui.textMuted}
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Website</Text>
            <TextInput
              style={styles.input}
              value={businessWebsite}
              onChangeText={setBusinessWebsite}
              placeholder="https://example.com"
              placeholderTextColor={ui.textMuted}
              keyboardType="url"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Contact Email</Text>
            <TextInput
              style={styles.input}
              value={businessEmail}
              onChangeText={setBusinessEmail}
              placeholder="contact@example.com"
              placeholderTextColor={ui.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone</Text>
            <TextInput
              style={styles.input}
              value={businessPhone}
              onChangeText={setBusinessPhone}
              placeholder="(555) 123-4567"
              placeholderTextColor={ui.textMuted}
              keyboardType="phone-pad"
            />
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Industry</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowIndustryPicker(!showIndustryPicker)}
            >
              <Text style={businessIndustry ? styles.pickerText : styles.pickerPlaceholder}>
                {businessIndustry || 'Select industry'}
              </Text>
              <Ionicons
                name={showIndustryPicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={ui.textMuted}
              />
            </TouchableOpacity>
            
            {showIndustryPicker && (
              <ScrollView style={styles.pickerOptionsScroll} nestedScrollEnabled>
                {INDUSTRIES.map((ind) => (
                  <TouchableOpacity
                    key={ind}
                    style={[styles.pickerOption, businessIndustry === ind && styles.pickerOptionSelected]}
                    onPress={() => {
                      setBusinessIndustry(ind)
                      setShowIndustryPicker(false)
                    }}
                  >
                    <Text style={[styles.pickerOptionText, businessIndustry === ind && styles.pickerOptionTextSelected]}>
                      {ind}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HQ State</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowBusinessStatePicker(!showBusinessStatePicker)}
            >
              <Text style={businessHqState ? styles.pickerText : styles.pickerPlaceholder}>
                {businessHqState || 'Select state'}
              </Text>
              <Ionicons
                name={showBusinessStatePicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={ui.textMuted}
              />
            </TouchableOpacity>
            
            {showBusinessStatePicker && (
              <ScrollView style={styles.pickerOptionsScroll} nestedScrollEnabled>
                {US_STATES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[styles.pickerOption, businessHqState === s && styles.pickerOptionSelected]}
                    onPress={() => {
                      setBusinessHqState(s)
                      setShowBusinessStatePicker(false)
                    }}
                  >
                    <Text style={[styles.pickerOptionText, businessHqState === s && styles.pickerOptionTextSelected]}>
                      {s}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>HQ County</Text>
            <TextInput
              style={styles.input}
              value={businessHqCounty}
              onChangeText={setBusinessHqCounty}
              placeholder="Enter county"
              placeholderTextColor={ui.textMuted}
            />
          </View>
          
          <TouchableOpacity
            style={[styles.saveButton, savingBusiness && styles.saveButtonDisabled]}
            onPress={handleSaveBusinessProfile}
            disabled={savingBusiness}
          >
            {savingBusiness ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Organization</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Sprint 4: Teacher Profile Section */}
      {profile?.role === 'teacher' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teacher Profile</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Title</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowTitlePicker(!showTitlePicker)}
            >
              <Text style={teacherTitle ? styles.pickerText : styles.pickerPlaceholder}>
                {teacherTitle || 'Select title'}
              </Text>
              <Ionicons
                name={showTitlePicker ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={ui.textMuted}
              />
            </TouchableOpacity>
            
            {showTitlePicker && (
              <View style={styles.pickerOptions}>
                {TEACHER_TITLES.map((title) => (
                  <TouchableOpacity
                    key={title}
                    style={[styles.pickerOption, teacherTitle === title && styles.pickerOptionSelected]}
                    onPress={() => {
                      setTeacherTitle(title)
                      setShowTitlePicker(false)
                    }}
                  >
                    <Text style={[styles.pickerOptionText, teacherTitle === title && styles.pickerOptionTextSelected]}>
                      {title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>School</Text>
            <TextInput
              style={styles.input}
              value={schoolSearchQuery}
              onChangeText={handleSchoolSearch}
              placeholder="Search for your school..."
              placeholderTextColor={ui.textMuted}
            />
            
            {selectedSchool && (
              <View style={styles.selectedSchool}>
                <Text style={styles.selectedSchoolText}>{selectedSchool.name}</Text>
                <TouchableOpacity onPress={() => setSelectedSchool(null)}>
                  <Ionicons name="close-circle" size={20} color={ui.textMuted} />
                </TouchableOpacity>
              </View>
            )}
            
            {schoolSearchResults.length > 0 && !selectedSchool && (
              <View style={styles.pickerOptions}>
                {schoolSearchResults.map((school) => (
                  <TouchableOpacity
                    key={school.id}
                    style={styles.pickerOption}
                    onPress={() => {
                      setSelectedSchool(school)
                      setSchoolSearchQuery('')
                      setSchoolSearchResults([])
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{school.name}</Text>
                    <Text style={styles.schoolLocation}>
                      {[school.city, school.state].filter(Boolean).join(', ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          
          <TouchableOpacity
            style={[styles.saveButton, savingTeacher && styles.saveButtonDisabled]}
            onPress={handleSaveTeacherProfile}
            disabled={savingTeacher}
          >
            {savingTeacher ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Save Teacher Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      )}

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
          onPress={() => router.push('/(tabs)/school')}
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

      {/* F) Future Features Section (Teasers) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Future Features</Text>
        <Text style={styles.sectionSubtitle}>Get early access to upcoming features</Text>
        
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureIcon}>
              <Ionicons name="sparkles" size={24} color={ui.primary} />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>A.U.R.A. AI Guidance Counselor</Text>
              <Text style={styles.featureDesc}>
                Your personal AI assistant for college and career planning
              </Text>
            </View>
          </View>
          <View style={styles.featureToggle}>
            <Text style={styles.featureToggleLabel}>Join AI Beta</Text>
            <Switch
              value={waitlistAiAura}
              onValueChange={setWaitlistAiAura}
              disabled={!isEditing}
              trackColor={{ false: ui.backgroundSecondary, true: ui.primaryLight }}
              thumbColor={waitlistAiAura ? ui.primary : ui.textMuted}
            />
          </View>
        </View>
        
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureIcon}>
              <Ionicons name="cloud-upload-outline" size={24} color="#4285F4" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>Google Drive</Text>
              <Text style={styles.featureDesc}>
                Store and access your documents from anywhere
              </Text>
            </View>
          </View>
          <View style={styles.featureToggle}>
            <Text style={styles.featureToggleLabel}>Notify me when available</Text>
            <Switch
              value={waitlistDrive}
              onValueChange={setWaitlistDrive}
              disabled={!isEditing}
              trackColor={{ false: ui.backgroundSecondary, true: '#4285F4' + '40' }}
              thumbColor={waitlistDrive ? '#4285F4' : ui.textMuted}
            />
          </View>
        </View>
        
        <View style={styles.featureCard}>
          <View style={styles.featureHeader}>
            <View style={styles.featureIcon}>
              <Ionicons name="cloud-outline" size={24} color="#0078D4" />
            </View>
            <View style={styles.featureInfo}>
              <Text style={styles.featureTitle}>OneDrive</Text>
              <Text style={styles.featureDesc}>
                Connect your Microsoft cloud storage
              </Text>
            </View>
          </View>
          <View style={styles.featureToggle}>
            <Text style={styles.featureToggleLabel}>Notify me when available</Text>
            <Switch
              value={waitlistOnedrive}
              onValueChange={setWaitlistOnedrive}
              disabled={!isEditing}
              trackColor={{ false: ui.backgroundSecondary, true: '#0078D4' + '40' }}
              thumbColor={waitlistOnedrive ? '#0078D4' : ui.textMuted}
            />
          </View>
        </View>
      </View>

      {/* G) Actions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions</Text>
        
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color={colors.error} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomSpacer} />

      {/* Sprint 4: Add Student Modal */}
      <Modal
        visible={showAddStudentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Student</Text>
              <TouchableOpacity onPress={() => setShowAddStudentModal(false)}>
                <Ionicons name="close" size={24} color={ui.text} />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalDescription}>
              Enter the student&apos;s email address to send them a link request.
            </Text>
            
            <TextInput
              style={styles.input}
              value={studentEmail}
              onChangeText={setStudentEmail}
              placeholder="student@example.com"
              placeholderTextColor={ui.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setStudentEmail('')
                  setShowAddStudentModal(false)
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, linkingStudent && styles.saveButtonDisabled]}
                onPress={handleSendLinkRequest}
                disabled={linkingStudent || !studentEmail.trim()}
              >
                {linkingStudent ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.saveButtonText}>Send Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  // Sprint 10: Verification Banner styles
  verificationBanner: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: radius.md,
    gap: 8,
  },
  verificationBannerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  verificationBannerText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    lineHeight: 20,
  },
  verificationHelperText: {
    fontSize: 13,
    opacity: 0.9,
    lineHeight: 18,
    marginLeft: 28,
  },
  verificationButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignSelf: 'flex-start',
    marginTop: 8,
    marginLeft: 28,
  },
  verificationButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Sprint 4: Section header with action button
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.md,
    gap: 4,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  // Sprint 4: Linked students styles
  linkedStudentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
  },
  linkedStudentInfo: {
    flex: 1,
  },
  linkedStudentName: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  linkedStudentDetails: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  statusAccepted: {
    backgroundColor: '#10B98120',
  },
  statusPending: {
    backgroundColor: '#F59E0B20',
  },
  statusDeclined: {
    backgroundColor: '#EF444420',
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 4,
  },
  emptyText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  // Sprint 4: Parent request styles
  parentRequestRow: {
    backgroundColor: '#F59E0B10',
    padding: 16,
    borderRadius: radius.md,
    marginBottom: 12,
  },
  parentRequestText: {
    fontSize: 14,
    color: ui.text,
    marginBottom: 12,
  },
  parentRequestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    paddingVertical: 10,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  declineButtonText: {
    color: ui.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  // Sprint 4: Teacher profile styles
  selectedSchool: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.primaryLight,
    padding: 12,
    borderRadius: radius.md,
    marginTop: 8,
  },
  selectedSchoolText: {
    fontSize: 14,
    color: ui.primary,
    fontWeight: '500',
    flex: 1,
  },
  schoolLocation: {
    fontSize: 12,
    color: ui.textSecondary,
    marginTop: 2,
  },
  // Sprint 4: Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  modalDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  // Sprint 9A: Future Features section styles
  sectionSubtitle: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 16,
  },
  featureCard: {
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 12,
  },
  featureHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  featureIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.card,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureInfo: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  featureDesc: {
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 18,
  },
  featureToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  featureToggleLabel: {
    fontSize: 14,
    color: ui.text,
  },
})
