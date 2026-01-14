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
import { getLinkedStudents, type LinkedStudent } from '../../src/data/parent-student'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function StudentsScreen() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [students, setStudents] = useState<LinkedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [linkEmail, setLinkEmail] = useState('')
  const [linkLoading, setLinkLoading] = useState(false)

  const fetchStudents = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getLinkedStudents(user.id)
      setStudents(data)
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
    fetchStudents()
  }, [sessionLoading, user?.id, fetchStudents])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchStudents()
  }, [fetchStudents])

  const handleLinkStudent = async () => {
    if (!linkEmail.trim()) {
      Alert.alert('Error', 'Please enter a student email address')
      return
    }

    setLinkLoading(true)
    try {
      Alert.alert(
        'Link Request Sent',
        'A link request has been sent to the student. They will need to accept it before you can view their data.',
        [{ text: 'OK', onPress: () => {
          setShowLinkModal(false)
          setLinkEmail('')
          fetchStudents()
        }}]
      )
    } catch (err) {
      Alert.alert('Error', 'Failed to send link request. Please try again.')
    } finally {
      setLinkLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return { label: 'Connected', color: colors.success, bg: '#E8F5E9' }
      case 'pending':
        return { label: 'Pending', color: '#FF9800', bg: '#FFF3E0' }
      case 'declined':
        return { label: 'Declined', color: colors.error, bg: '#FFEBEE' }
      default:
        return { label: status, color: ui.textMuted, bg: ui.backgroundSecondary }
    }
  }

  const acceptedStudents = students.filter(s => s.status === 'accepted')
  const pendingStudents = students.filter(s => s.status === 'pending')

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
              <Text style={styles.subtitle}>Monitor and support your student's journey</Text>
            </View>
            <TouchableOpacity 
              style={styles.addIconButton}
              onPress={() => setShowLinkModal(true)}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

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
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowLinkModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Link a Student</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.infoCard}>
              <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
              <Text style={styles.infoText}>
                Once linked, you'll be able to view your student's tasks, saved scholarships, and assign new tasks to help them stay on track.
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
                    onPress={() => router.push(`/student/${student.user_id}` as never)}
                  >
                    <View style={styles.studentAvatar}>
                      <Text style={styles.studentAvatarText}>
                        {(student.full_name || 'S').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    <View style={styles.studentInfo}>
                      <Text style={styles.studentName}>{student.full_name || 'Student'}</Text>
                      <Text style={styles.studentDetails}>
                        {student.school || 'No school'} {student.graduation_year ? `• Class of ${student.graduation_year}` : ''}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {pendingStudents.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Pending Requests</Text>
                {pendingStudents.map((student) => {
                  const badge = getStatusBadge(student.status)
                  return (
                    <View key={student.id} style={styles.studentCard}>
                      <View style={styles.studentAvatar}>
                        <Ionicons name="time-outline" size={24} color={ui.textMuted} />
                      </View>
                      <View style={styles.studentInfo}>
                        <Text style={styles.studentName}>Awaiting Response</Text>
                        <Text style={styles.studentDetails}>Request sent to student</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                        <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Modal
        visible={showLinkModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowLinkModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLinkModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Link a Student</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              Enter your student's email address to send them a link request. They will need to accept it before you can view their data.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Student Email</Text>
              <TextInput
                style={styles.input}
                placeholder="student@email.com"
                placeholderTextColor={ui.inputPlaceholder}
                value={linkEmail}
                onChangeText={setLinkEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, linkLoading && styles.buttonDisabled]}
              onPress={handleLinkStudent}
              disabled={linkLoading}
            >
              {linkLoading ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Send Link Request</Text>
              )}
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
  submitButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
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
