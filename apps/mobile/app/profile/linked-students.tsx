import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius } from '../../src/theme'
import {
  getLinkedStudents,
  sendLinkRequest,
  removeLinkRequest,
  LinkedStudent,
} from '../../src/data/parent-student'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'

export default function LinkedStudentsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [linkingStudent, setLinkingStudent] = useState(false)
  
  // Tap guards to prevent rapid double-taps on navigation buttons
  const guardedBack = useTapGuard(() => safeBack('profile'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchLinkedStudents = useCallback(async () => {
    if (!user?.id) return
    try {
      const students = await getLinkedStudents(user.id)
      setLinkedStudents(students)
    } catch (error) {
      console.error('Failed to fetch linked students:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchLinkedStudents()
  }, [fetchLinkedStudents])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchLinkedStudents()
    setRefreshing(false)
  }

  const handleSendLinkRequest = async () => {
    if (!user?.id || !studentEmail.trim()) return

    setLinkingStudent(true)
    try {
      const result = await sendLinkRequest(user.id, studentEmail.trim())
      if (result.success) {
        Alert.alert('Success', 'Link request sent successfully')
        setStudentEmail('')
        await fetchLinkedStudents()
      } else {
        Alert.alert('Error', result.error || 'Failed to send link request')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to send link request')
    } finally {
      setLinkingStudent(false)
    }
  }

  const handleRemoveLink = async (linkId: string, status: LinkedStudent['status']) => {
    Alert.alert(
      'Remove Link',
      status === 'pending'
        ? 'Are you sure you want to cancel this link request?'
        : 'Are you sure you want to remove this student link?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const result = await removeLinkRequest(linkId, status)
            if (result.success) {
              await fetchLinkedStudents()
            } else {
              Alert.alert('Error', result.error || 'Failed to remove link')
            }
          },
        },
      ]
    )
  }

  const getStatusColor = (status: LinkedStudent['status']) => {
    switch (status) {
      case 'accepted':
        return '#10B981'
      case 'pending':
        return '#F59E0B'
      case 'declined':
        return '#EF4444'
      default:
        return ui.textSecondary
    }
  }


  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading linked students...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Add Student Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add Student</Text>
        <Text style={styles.sectionDescription}>
          Enter the student&apos;s email address to send them a link request.
        </Text>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={studentEmail}
            onChangeText={setStudentEmail}
            placeholder="student@example.com"
            placeholderTextColor={ui.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!studentEmail.trim() || linkingStudent) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendLinkRequest}
            disabled={!studentEmail.trim() || linkingStudent}
          >
            {linkingStudent ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons name="send" size={20} color={colors.white} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Linked Students List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Linked Students</Text>
        {linkedStudents.length === 0 ? (
          <Text style={styles.emptyText}>
            No linked students yet. Send a link request to get started.
          </Text>
        ) : (
          linkedStudents.map((student) => (
            <View key={student.id} style={styles.studentRow}>
              <View style={styles.studentInfo}>
                <Text style={styles.studentName}>
                  {student.full_name || 'Unknown Student'}
                </Text>
                {student.school && (
                  <Text style={styles.studentDetails}>{student.school}</Text>
                )}
                {student.graduation_year && (
                  <Text style={styles.studentDetails}>
                    Class of {student.graduation_year}
                  </Text>
                )}
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(student.status)}20` },
                  ]}
                >
                  <Text
                    style={[
                      styles.statusBadgeText,
                      { color: getStatusColor(student.status) },
                    ]}
                  >
                    {student.status}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveLink(student.link_id, student.status)}
              >
                <Ionicons name="close-circle" size={24} color={colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

            {/* Home Button (escape hatch) */}
            <TouchableOpacity
              style={styles.homeButton}
              onPress={guardedHome}
            >
              <Ionicons name="home" size={20} color={ui.primary} />
              <Text style={styles.homeButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  contentContainer: {
    padding: 20,
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
  section: {
    marginBottom: 24,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 16,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  input: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: ui.text,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  sendButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    paddingVertical: 20,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
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
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    marginTop: 6,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  removeButton: {
    padding: 4,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: ui.primary,
  },
  homeButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
})
