import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSession } from '../../src/hooks/useSession'
import { useAuth } from '../../src/contexts/AuthContext'
import {
  createManagedStudentProfile,
  getLinkedStudentProfiles,
  getPendingFamilyLinkRequests,
  requestStudentFamilyLinkByCode,
  requestStudentFamilyLinkByEmail,
  revokeRelationshipInvite,
  setActiveStudentProfile,
  type RelationshipInvite,
  type StudentProfile,
} from '../../src/data/identity'
import { formatFamilyLinkCode, normalizeFamilyLinkCode } from '@mysryear/shared'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function StudentsScreen() {
  const { user, loading: sessionLoading } = useSession()
  const { profile } = useAuth()
  const router = useRouter()
  const relationshipRole: 'parent' | 'guardian' =
    profile?.role === 'guardian' ? 'guardian' : 'parent'
  const isFamily = profile?.role === 'parent' || profile?.role === 'guardian'
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [pendingRequests, setPendingRequests] = useState<RelationshipInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkMethod, setLinkMethod] = useState<'code' | 'email'>('code')
  const [familyLinkCode, setFamilyLinkCode] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [managedFirstName, setManagedFirstName] = useState('')
  const [managedLastName, setManagedLastName] = useState('')
  const [managedGraduationYear, setManagedGraduationYear] = useState('')
  const [managedClaimEmail, setManagedClaimEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return
    try {
      const [data, pending] = await Promise.all([
        getLinkedStudentProfiles(user.id),
        getPendingFamilyLinkRequests(user.id),
      ])
      setStudents(data)
      setPendingRequests(pending)
    } catch (err) {
      console.warn('Failed to fetch students:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    if (profile?.role && !isFamily) {
      setLoading(false)
      router.replace('/(app)/profile' as never)
      return
    }
    fetchStudents()
  }, [sessionLoading, user?.id, profile?.role, isFamily, fetchStudents, router])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStudents()
  }, [fetchStudents])

  const closeLinkModal = () => {
    setShowLinkModal(false)
    setFamilyLinkCode('')
    setStudentEmail('')
  }

  const handleLinkStudent = async () => {
    if (linkMethod === 'code' && !familyLinkCode.trim()) {
      Alert.alert(
        'Family link code required',
        'Ask your student to create a one-time family link code from their Profile.',
      )
      return
    }
    if (linkMethod === 'email' && !studentEmail.trim()) {
      Alert.alert(
        'Student email required',
        'Enter the student email address to send a connection request.',
      )
      return
    }

    if (!user?.id) return
    setLinkLoading(true)
    try {
      const result: {
        success: boolean
        error: string | null
        result?: 'requested' | 'pending' | 'already_connected' | null
      } =
        linkMethod === 'code'
          ? await requestStudentFamilyLinkByCode(familyLinkCode)
          : await requestStudentFamilyLinkByEmail(studentEmail)
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to send access request')
        return
      }
      const message =
        linkMethod === 'email'
          ? 'If that student can receive requests, they will see your connection request when they sign in.'
          : result.result === 'already_connected'
            ? 'You are already connected to this student.'
            : result.result === 'pending'
              ? 'Your connection request is already waiting for student approval.'
              : 'Request sent. The student must approve before you can view their profile.'
      Alert.alert('Connection Request', message, [
        {
          text: 'OK',
          onPress: () => {
            closeLinkModal()
            fetchStudents()
          },
        },
      ])
    } finally {
      setLinkLoading(false)
    }
  }

  const handleCreateManagedStudent = async () => {
    if (!managedFirstName.trim() || !managedLastName.trim()) {
      Alert.alert('Student name required', 'Enter the student first and last name.')
      return
    }
    setLinkLoading(true)
    try {
      const result = await createManagedStudentProfile({
        firstName: managedFirstName.trim(),
        lastName: managedLastName.trim(),
        graduationYear: managedGraduationYear ? Number(managedGraduationYear) : null,
        schoolId: null,
        relationshipRole,
        inviteStudentEmail: managedClaimEmail.trim() || null,
      })
      if (result.error) {
        Alert.alert('Error', result.error)
        return
      }
      Alert.alert(
        'Student profile created',
        'This profile is now active. The student can claim it later.',
        [
          {
            text: 'OK',
            onPress: () => {
              setShowLinkModal(false)
              setManagedFirstName('')
              setManagedLastName('')
              setManagedGraduationYear('')
              setManagedClaimEmail('')
              fetchStudents()
            },
          },
        ],
      )
    } finally {
      setLinkLoading(false)
    }
  }

  const handleSelectStudent = async (studentId: string) => {
    if (!user?.id) return
    const result = await setActiveStudentProfile(user.id, studentId)
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to switch active student')
      return
    }
    router.push('/(app)' as never)
  }

  const handleCancelPendingRequest = (inviteId: string) => {
    Alert.alert(
      'Cancel connection request?',
      'The student will no longer be able to approve this request.',
      [
        { text: 'Keep Request', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setLinkLoading(true)
            try {
              const result = await revokeRelationshipInvite(inviteId)
              if (!result.success) {
                Alert.alert('Could not cancel request', result.error || 'Please try again.')
                return
              }
              await fetchStudents()
            } finally {
              setLinkLoading(false)
            }
          },
        },
      ],
    )
  }

  const acceptedStudents = students

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ui.primary}
            colors={[ui.primary]}
          />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>My Students</Text>
              <Text style={styles.subtitle}>
                Manage the student profiles connected to your family account
              </Text>
            </View>
            <TouchableOpacity style={styles.addIconButton} onPress={() => setShowLinkModal(true)}>
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {pendingRequests.length > 0 ? (
          <View style={styles.pendingRequestsCard}>
            <View style={styles.pendingRequestsHeading}>
              <Ionicons name="time-outline" size={20} color={ui.primary} />
              <Text style={styles.pendingRequestsTitle}>Awaiting student approval</Text>
            </View>
            <Text style={styles.pendingRequestsDescription}>
              A connection is not active until the student approves it.
            </Text>
            {pendingRequests.map((request) => (
              <View key={request.id} style={styles.pendingRequestRow}>
                <View style={styles.pendingRequestCopy}>
                  <Text style={styles.pendingRequestLabel}>Connection request pending</Text>
                  {request.expires_at ? (
                    <Text style={styles.pendingRequestMeta}>
                      Expires {new Date(request.expires_at).toLocaleDateString()}
                    </Text>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={styles.pendingRequestCancelButton}
                  onPress={() => handleCancelPendingRequest(request.id)}
                  disabled={linkLoading}
                >
                  <Text style={styles.pendingRequestCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ) : null}

        {students.length === 0 ? (
          <>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="people-outline" size={48} color={ui.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No students linked yet</Text>
              <Text style={styles.emptyDescription}>
                Link your student's account to view their tasks, scholarships, and progress.
              </Text>
              <TouchableOpacity style={styles.addButton} onPress={() => setShowLinkModal(true)}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Manage Students</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
              <Text style={styles.infoText}>
                Once linked, you can review your student’s progress, documents, scholarships, and
                family action items.
              </Text>
            </View>
          </>
        ) : (
          <>
            {acceptedStudents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Connected Students</Text>
                {acceptedStudents.map((student) => (
                  <TouchableOpacity
                    key={student.id}
                    style={styles.studentCard}
                    onPress={() => handleSelectStudent(student.id)}
                  >
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {([student.first_name, student.last_name].filter(Boolean).join(' ') || 'S')
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>
                        {[student.first_name, student.last_name].filter(Boolean).join(' ') ||
                          'Student'}
                      </Text>
                      <Text style={styles.studentDetails}>
                        {student.schools?.name || 'No school'}{' '}
                        {student.graduation_year ? `• Class of ${student.graduation_year}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showLinkModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeLinkModal}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={closeLinkModal}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Link a Student</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Connect with a one-time family link code shared by your student, or request access by
              email. Your student must approve before you can view their profile.
            </Text>

            <Text style={styles.sectionTitle}>Connect to an existing student</Text>
            <View style={styles.linkMethodRow}>
              <TouchableOpacity
                style={[
                  styles.linkMethodButton,
                  linkMethod === 'code' && styles.linkMethodButtonActive,
                ]}
                onPress={() => setLinkMethod('code')}
              >
                <Text
                  style={[
                    styles.linkMethodText,
                    linkMethod === 'code' && styles.linkMethodTextActive,
                  ]}
                >
                  Enter Code
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.linkMethodButton,
                  linkMethod === 'email' && styles.linkMethodButtonActive,
                ]}
                onPress={() => setLinkMethod('email')}
              >
                <Text
                  style={[
                    styles.linkMethodText,
                    linkMethod === 'email' && styles.linkMethodTextActive,
                  ]}
                >
                  Request by Email
                </Text>
              </TouchableOpacity>
            </View>

            {linkMethod === 'code' ? (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Family Link Code</Text>
                <TextInput
                  style={[styles.input, styles.codeInput]}
                  placeholder="ABCD-EFGH-IJKL-MNOP"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={formatFamilyLinkCode(familyLinkCode)}
                  onChangeText={(value) => setFamilyLinkCode(normalizeFamilyLinkCode(value))}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  autoComplete="one-time-code"
                />
                <Text style={styles.helperText}>
                  The student creates this one-time code from their Profile. It expires after 15
                  minutes.
                </Text>
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.label}>Student Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="student@example.com"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={studentEmail}
                  onChangeText={setStudentEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Text style={styles.helperText}>
                  We will not confirm whether this email has a MySRYear account.
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, linkLoading && styles.buttonDisabled]}
              onPress={handleLinkStudent}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>
                  {linkMethod === 'code' ? 'Request Connection' : 'Send Connection Request'}
                </Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider} />
            <Text style={styles.sectionTitle}>Create managed student profile</Text>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Student First Name</Text>
              <TextInput
                style={styles.input}
                placeholder="First name"
                placeholderTextColor={ui.inputPlaceholder}
                value={managedFirstName}
                onChangeText={setManagedFirstName}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Student Last Name</Text>
              <TextInput
                style={styles.input}
                placeholder="Last name"
                placeholderTextColor={ui.inputPlaceholder}
                value={managedLastName}
                onChangeText={setManagedLastName}
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Expected Graduation Year</Text>
              <TextInput
                style={styles.input}
                placeholder="2030"
                placeholderTextColor={ui.inputPlaceholder}
                value={managedGraduationYear}
                onChangeText={setManagedGraduationYear}
                keyboardType="number-pad"
              />
            </View>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Student Claim Email optional</Text>
              <TextInput
                style={styles.input}
                placeholder="student@example.com"
                placeholderTextColor={ui.inputPlaceholder}
                value={managedClaimEmail}
                onChangeText={setManagedClaimEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <TouchableOpacity
              style={[styles.secondarySubmitButton, linkLoading && styles.buttonDisabled]}
              onPress={handleCreateManagedStudent}
              disabled={linkLoading}
            >
              <Text style={styles.secondarySubmitButtonText}>Create Managed Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 4,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 12,
  },
  studentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginBottom: 12,
    ...shadow.card,
  },
  studentAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  studentAvatarText: {
    fontSize: 20,
    fontWeight: '600',
    color: ui.primary,
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  studentDetails: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 24,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: radius.md,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: ui.primaryText,
    lineHeight: 20,
  },
  pendingRequestsCard: {
    backgroundColor: ui.primaryLight,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginHorizontal: 24,
    marginBottom: 24,
    padding: 16,
  },
  pendingRequestsHeading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  pendingRequestsTitle: {
    color: ui.text,
    fontSize: 16,
    fontWeight: '700',
  },
  pendingRequestsDescription: {
    color: ui.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  pendingRequestRow: {
    alignItems: 'center',
    borderTopColor: ui.cardBorder,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
  },
  pendingRequestCopy: {
    flex: 1,
  },
  pendingRequestLabel: {
    color: ui.text,
    fontSize: 14,
    fontWeight: '600',
  },
  pendingRequestMeta: {
    color: ui.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  pendingRequestCancelButton: {
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  pendingRequestCancelText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: ui.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  modalCancel: {
    fontSize: 16,
    color: ui.primary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ui.text,
  },
  modalContent: {
    padding: 24,
  },
  modalDescription: {
    fontSize: 15,
    color: ui.textSecondary,
    lineHeight: 22,
    marginBottom: 24,
  },
  linkMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  linkMethodButton: {
    flex: 1,
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  linkMethodButtonActive: {
    backgroundColor: ui.primary,
    borderColor: ui.primary,
  },
  linkMethodText: {
    color: ui.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  linkMethodTextActive: {
    color: colors.white,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  codeInput: {
    fontFamily: 'monospace',
    letterSpacing: 1.4,
  },
  helperText: {
    color: ui.textSecondary,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
  },
  submitButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  divider: {
    height: 1,
    backgroundColor: ui.border,
    marginVertical: 24,
  },
  secondarySubmitButton: {
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: ui.border,
  },
  secondarySubmitButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})
