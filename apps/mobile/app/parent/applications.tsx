import React, { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, ui, radius, shadow } from '../../src/theme'
import { getParentStudentSummary, ParentStudentSummaryResponse } from '../../src/api/edge'
import { safeBack } from '../../src/navigation/safeBack'
import { goTab } from '../../src/navigation/goTab'

type ApplicationPreview = ParentStudentSummaryResponse['previews']['applications_upcoming'][0]

const STATUS_COLORS: Record<string, string> = {
  not_started: '#94a3b8',
  in_progress: '#f59e0b',
  submitted: '#3b82f6',
  accepted: '#22c55e',
  rejected: '#ef4444',
  waitlisted: '#8b5cf6',
  deferred: '#f97316',
}

export default function ParentApplicationsScreen() {
  const { studentId } = useLocalSearchParams<{ studentId: string }>()
  const [summary, setSummary] = useState<ParentStudentSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (!studentId) {
      setError('No student selected')
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await getParentStudentSummary(studentId)
      setSummary(data)
    } catch (err) {
      console.error('Failed to fetch student applications:', err)
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [studentId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No deadline'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
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

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  }

  const renderApplication = ({ item }: { item: ApplicationPreview }) => {
    const daysUntil = getDaysUntil(item.deadline)
    const isOverdue = daysUntil !== null && daysUntil < 0
    const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 7
    const statusColor = STATUS_COLORS[item.status] || ui.textMuted

    return (
      <View style={styles.appCard}>
        <View style={styles.appHeader}>
          <View style={styles.appIcon}>
            <Ionicons name="school-outline" size={20} color={ui.primary} />
          </View>
          <View style={styles.appInfo}>
            <Text style={styles.appName} numberOfLines={1}>
              {item.college_name}
            </Text>
            <View style={styles.appMeta}>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>
                  {formatStatus(item.status)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <View style={styles.appDeadline}>
          <Ionicons
            name="calendar-outline"
            size={14}
            color={isOverdue ? colors.error : isDueSoon ? colors.warning : ui.textMuted}
          />
          <Text
            style={[
              styles.deadlineText,
              isOverdue && styles.deadlineOverdue,
              isDueSoon && styles.deadlineSoon,
            ]}
          >
            {formatDate(item.deadline)}
            {daysUntil !== null &&
              ` (${daysUntil === 0 ? 'Today' : daysUntil > 0 ? `${daysUntil} days` : `${Math.abs(daysUntil)}d overdue`})`}
          </Text>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={fetchData}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const applications = summary?.previews.applications_upcoming || []

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${summary?.student.first_name || 'Student'}'s Applications`,
          headerLeft: () => (
            <TouchableOpacity onPress={() => safeBack()} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={ui.text} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => goTab('dashboard')} style={styles.headerButton}>
              <Ionicons name="home-outline" size={24} color={ui.text} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary?.metrics.applications_total || 0}</Text>
          <Text style={styles.summaryLabel}>Total Applications</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary?.metrics.saved_scholarships_total || 0}</Text>
          <Text style={styles.summaryLabel}>Saved Scholarships</Text>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={18} color={ui.primary} />
        <Text style={styles.infoText}>
          This is a read-only view of your student's applications. Only your student can edit these entries.
        </Text>
      </View>

      {applications.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color={ui.textMuted} />
          <Text style={styles.emptyTitle}>No Upcoming Applications</Text>
          <Text style={styles.emptyDesc}>
            Your student hasn't added any applications with upcoming deadlines yet.
          </Text>
        </View>
      ) : (
        <FlatList
          data={applications}
          keyExtractor={(item) => item.id}
          renderItem={renderApplication}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ui.primary} />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>Upcoming Deadlines (Read-only)</Text>
          }
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
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
  headerButton: {
    padding: 8,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: ui.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ui.text,
  },
  summaryLabel: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: ui.border,
    marginVertical: 4,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: ui.primaryText,
    lineHeight: 18,
  },
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  listHeader: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.textMuted,
    marginBottom: 12,
    marginTop: 8,
  },
  appCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  appHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  appIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  appMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  appDeadline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  deadlineText: {
    fontSize: 13,
    color: ui.textMuted,
  },
  deadlineOverdue: {
    color: colors.error,
    fontWeight: '500',
  },
  deadlineSoon: {
    color: colors.warning,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginTop: 12,
  },
  emptyDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    maxWidth: 280,
  },
})
