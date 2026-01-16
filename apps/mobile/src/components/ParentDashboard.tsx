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
  FlatList,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, ui, radius, shadow } from '../theme'
import { getLinkedStudents, LinkedStudent } from '../data/parent-student'
import {
  getParentStudentSummary,
  ParentStudentSummaryResponse,
} from '../api/edge'

interface ParentDashboardProps {
  userId: string
}

export default function ParentDashboard({ userId }: ParentDashboardProps) {
  const router = useRouter()
  const [linkedStudents, setLinkedStudents] = useState<LinkedStudent[]>([])
  const [selectedStudent, setSelectedStudent] = useState<LinkedStudent | null>(null)
  const [summary, setSummary] = useState<ParentStudentSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [studentSelectorVisible, setStudentSelectorVisible] = useState(false)

  // Fetch linked students on mount
  const fetchLinkedStudents = useCallback(async () => {
    try {
      setError(null)
      const students = await getLinkedStudents(userId)
      // Only show accepted links
      const acceptedStudents = students.filter((s) => s.status === 'accepted')
      setLinkedStudents(acceptedStudents)

      // Auto-select first student if none selected
      if (acceptedStudents.length > 0 && !selectedStudent) {
        setSelectedStudent(acceptedStudents[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load linked students')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [userId, selectedStudent])

  // Fetch summary for selected student
  const fetchSummary = useCallback(async (studentId: string) => {
    try {
      setSummaryLoading(true)
      setError(null)
      const data = await getParentStudentSummary(studentId)
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch student summary:', err)
      setError(err instanceof Error ? err.message : 'Failed to load student data')
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchLinkedStudents()
  }, [fetchLinkedStudents])

  useEffect(() => {
    if (selectedStudent) {
      fetchSummary(selectedStudent.user_id)
    }
  }, [selectedStudent, fetchSummary])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchLinkedStudents()
    if (selectedStudent) {
      fetchSummary(selectedStudent.user_id)
    }
  }, [fetchLinkedStudents, fetchSummary, selectedStudent])

  const handleSelectStudent = (student: LinkedStudent) => {
    setSelectedStudent(student)
    setStudentSelectorVisible(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getDaysUntil = (dateString: string | null) => {
    if (!dateString) return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const target = new Date(dateString)
    target.setHours(0, 0, 0, 0)
    const diff = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading parent dashboard...</Text>
      </View>
    )
  }

  if (error && linkedStudents.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // No linked students
  if (linkedStudents.length === 0) {
    return (
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.emptyContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ui.primary} />
        }
      >
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={64} color={ui.textMuted} />
          <Text style={styles.emptyTitle}>No Linked Students</Text>
          <Text style={styles.emptyDesc}>
            Link a student account to view their progress and assign tasks.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/profile/linked-students')}
          >
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={styles.primaryButtonText}>Link a Student</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ui.primary} />
      }
    >
      {/* Hero Section */}
      <View style={styles.hero}>
        <Text style={styles.badge}>Parent Dashboard</Text>
        <Text style={styles.heroTitle}>Supporting your student's journey</Text>
        <Text style={styles.heroSubtitle}>
          View progress, assign tasks, and stay connected.
        </Text>
      </View>

      {/* Student Selector */}
      <TouchableOpacity
        style={styles.studentSelector}
        onPress={() => setStudentSelectorVisible(true)}
      >
        <View style={styles.studentSelectorLeft}>
          <View style={styles.studentAvatar}>
            <Ionicons name="person" size={24} color={ui.primary} />
          </View>
          <View>
            <Text style={styles.studentSelectorLabel}>Viewing</Text>
            <Text style={styles.studentSelectorName}>
              {selectedStudent?.full_name || 'Select a student'}
            </Text>
          </View>
        </View>
        <Ionicons name="chevron-down" size={20} color={ui.textMuted} />
      </TouchableOpacity>

      {/* Student Selector Modal */}
      <Modal
        visible={studentSelectorVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setStudentSelectorVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Student</Text>
              <TouchableOpacity onPress={() => setStudentSelectorVisible(false)}>
                <Ionicons name="close" size={24} color={ui.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={linkedStudents}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.studentOption,
                    selectedStudent?.id === item.id && styles.studentOptionSelected,
                  ]}
                  onPress={() => handleSelectStudent(item)}
                >
                  <View style={styles.studentAvatar}>
                    <Ionicons name="person" size={20} color={ui.primary} />
                  </View>
                  <View style={styles.studentOptionInfo}>
                    <Text style={styles.studentOptionName}>{item.full_name || 'Student'}</Text>
                    <Text style={styles.studentOptionMeta}>
                      {item.school || 'No school'} {item.graduation_year ? `• Class of ${item.graduation_year}` : ''}
                    </Text>
                  </View>
                  {selectedStudent?.id === item.id && (
                    <Ionicons name="checkmark-circle" size={24} color={ui.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListFooterComponent={
                <TouchableOpacity
                  style={styles.addStudentButton}
                  onPress={() => {
                    setStudentSelectorVisible(false)
                    router.push('/profile/linked-students')
                  }}
                >
                  <Ionicons name="add-circle-outline" size={20} color={ui.primary} />
                  <Text style={styles.addStudentText}>Link Another Student</Text>
                </TouchableOpacity>
              }
            />
          </View>
        </View>
      </Modal>

      {/* Summary Loading State */}
      {summaryLoading && (
        <View style={styles.summaryLoading}>
          <ActivityIndicator size="small" color={ui.primary} />
          <Text style={styles.summaryLoadingText}>Loading student data...</Text>
        </View>
      )}

      {/* Summary Content */}
      {summary && !summaryLoading && (
        <>
          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActionsRow}>
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  router.push({
                    pathname: '/(modals)/parent-assign-task',
                    params: { studentId: selectedStudent?.user_id },
                  })
                }
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
                  <Ionicons name="add-circle-outline" size={24} color="#10B981" />
                </View>
                <Text style={styles.quickActionLabel}>Assign Task</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  router.push({
                    pathname: '/parent/tasks',
                    params: { studentId: selectedStudent?.user_id },
                  })
                }
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
                  <Ionicons name="list-outline" size={24} color="#3B82F6" />
                </View>
                <Text style={styles.quickActionLabel}>View Tasks</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() =>
                  router.push({
                    pathname: '/parent/applications',
                    params: { studentId: selectedStudent?.user_id },
                  })
                }
              >
                <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B20' }]}>
                  <Ionicons name="document-text-outline" size={24} color="#F59E0B" />
                </View>
                <Text style={styles.quickActionLabel}>Applications</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => router.push('/profile/linked-students')}
              >
                <View style={[styles.quickActionIcon, { backgroundColor: ui.primaryLight }]}>
                  <Ionicons name="people-outline" size={24} color={ui.primary} />
                </View>
                <Text style={styles.quickActionLabel}>Students</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Metrics Grid */}
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Tasks</Text>
              <Text style={styles.statValue}>{summary.metrics.tasks_pending} pending</Text>
              <Text style={styles.statDesc}>{summary.metrics.tasks_completed} completed</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Applications</Text>
              <Text style={styles.statValue}>{summary.metrics.applications_total} total</Text>
              <Text style={styles.statDesc}>Tracked</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Scholarships</Text>
              <Text style={styles.statValue}>{summary.metrics.saved_scholarships_total} saved</Text>
              <Text style={styles.statDesc}>Bookmarked</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Total Tasks</Text>
              <Text style={styles.statValue}>{summary.metrics.tasks_total}</Text>
              <Text style={styles.statDesc}>All time</Text>
            </View>
          </View>

          {/* Next Deadlines Section */}
          {(summary.metrics.next_task_due || summary.metrics.next_application_deadline) && (
            <View style={styles.deadlinesSection}>
              <Text style={styles.sectionTitle}>Upcoming Deadlines</Text>

              {summary.metrics.next_task_due && (
                <View style={styles.deadlineCard}>
                  <View style={styles.deadlineIcon}>
                    <Ionicons name="checkbox-outline" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.deadlineInfo}>
                    <Text style={styles.deadlineLabel}>Next Task Due</Text>
                    <Text style={styles.deadlineTitle} numberOfLines={1}>
                      {summary.metrics.next_task_due.title}
                    </Text>
                    <Text style={styles.deadlineDate}>
                      {formatDate(summary.metrics.next_task_due.due_date)}
                      {getDaysUntil(summary.metrics.next_task_due.due_date) !== null &&
                        ` (${getDaysUntil(summary.metrics.next_task_due.due_date)} days)`}
                    </Text>
                  </View>
                </View>
              )}

              {summary.metrics.next_application_deadline && (
                <View style={styles.deadlineCard}>
                  <View style={styles.deadlineIcon}>
                    <Ionicons name="document-text-outline" size={24} color={colors.warning} />
                  </View>
                  <View style={styles.deadlineInfo}>
                    <Text style={styles.deadlineLabel}>Next Application Deadline</Text>
                    <Text style={styles.deadlineTitle} numberOfLines={1}>
                      {summary.metrics.next_application_deadline.college_name}
                    </Text>
                    <Text style={styles.deadlineDate}>
                      {formatDate(summary.metrics.next_application_deadline.deadline)}
                      {getDaysUntil(summary.metrics.next_application_deadline.deadline) !== null &&
                        ` (${getDaysUntil(summary.metrics.next_application_deadline.deadline)} days)`}
                    </Text>
                  </View>
                </View>
              )}
            </View>
          )}

          {/* Tasks Due Soon Preview */}
          {summary.previews.tasks_due_soon.length > 0 && (
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Tasks Due Soon</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/parent/tasks',
                      params: { studentId: selectedStudent?.user_id },
                    })
                  }
                >
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              </View>
              {summary.previews.tasks_due_soon.map((task) => (
                <View key={task.id} style={styles.previewItem}>
                  <View style={styles.previewItemIcon}>
                    <Ionicons name="checkbox-outline" size={18} color={ui.textMuted} />
                  </View>
                  <View style={styles.previewItemInfo}>
                    <Text style={styles.previewItemTitle} numberOfLines={1}>
                      {task.title}
                    </Text>
                    <Text style={styles.previewItemMeta}>
                      {formatDate(task.due_date)} • {task.category}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Applications Upcoming Preview */}
          {summary.previews.applications_upcoming.length > 0 && (
            <View style={styles.previewSection}>
              <View style={styles.previewHeader}>
                <Text style={styles.sectionTitle}>Upcoming Applications</Text>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/parent/applications',
                      params: { studentId: selectedStudent?.user_id },
                    })
                  }
                >
                  <Text style={styles.viewAllLink}>View All</Text>
                </TouchableOpacity>
              </View>
              {summary.previews.applications_upcoming.map((app) => (
                <View key={app.id} style={styles.previewItem}>
                  <View style={styles.previewItemIcon}>
                    <Ionicons name="document-text-outline" size={18} color={ui.textMuted} />
                  </View>
                  <View style={styles.previewItemInfo}>
                    <Text style={styles.previewItemTitle} numberOfLines={1}>
                      {app.college_name}
                    </Text>
                    <Text style={styles.previewItemMeta}>
                      {formatDate(app.deadline)} • {app.status.replace('_', ' ')}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </>
      )}
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
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
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
  },
  retryText: {
    color: ui.primary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ui.text,
    marginTop: 8,
  },
  emptyDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    maxWidth: 280,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    padding: 24,
    paddingTop: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.primaryText,
    backgroundColor: ui.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 8,
    lineHeight: 24,
  },
  studentSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.card,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  studentSelectorLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  studentAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  studentSelectorLabel: {
    fontSize: 12,
    color: ui.textMuted,
  },
  studentSelectorName: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: ui.background,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    maxHeight: '70%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  studentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  studentOptionSelected: {
    backgroundColor: ui.primaryLight,
  },
  studentOptionInfo: {
    flex: 1,
  },
  studentOptionName: {
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
  },
  studentOptionMeta: {
    fontSize: 13,
    color: ui.textMuted,
    marginTop: 2,
  },
  addStudentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    gap: 8,
  },
  addStudentText: {
    fontSize: 15,
    fontWeight: '500',
    color: ui.primary,
  },
  summaryLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  summaryLoadingText: {
    fontSize: 14,
    color: ui.textMuted,
  },
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ui.text,
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
    marginTop: 24,
  },
  statCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ui.text,
  },
  statDesc: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 2,
  },
  deadlinesSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  deadlineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.warning}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  deadlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginTop: 2,
  },
  deadlineDate: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
    marginTop: 2,
  },
  previewSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllLink: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.primary,
  },
  previewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 12,
    marginBottom: 8,
    gap: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  previewItemIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewItemInfo: {
    flex: 1,
  },
  previewItemTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.text,
  },
  previewItemMeta: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 2,
  },
})
