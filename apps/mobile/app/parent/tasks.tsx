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
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, ui, radius, shadow } from '../../src/theme'
import { getParentStudentSummary, ParentStudentSummaryResponse } from '../../src/api/edge'
import { safeBack } from '../../src/navigation/safeBack'
import { goTab } from '../../src/navigation/goTab'

type TaskPreview = ParentStudentSummaryResponse['previews']['tasks_due_soon'][0]

export default function ParentTasksScreen() {
  const router = useRouter()
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
      console.error('Failed to fetch student tasks:', err)
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
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
    if (!dateString) return 'No due date'
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

  const renderTask = ({ item }: { item: TaskPreview }) => {
    const daysUntil = getDaysUntil(item.due_date)
    const isOverdue = daysUntil !== null && daysUntil < 0
    const isDueSoon = daysUntil !== null && daysUntil >= 0 && daysUntil <= 3

    return (
      <View style={styles.taskCard}>
        <View style={styles.taskIcon}>
          <Ionicons
            name="checkbox-outline"
            size={20}
            color={isOverdue ? colors.error : isDueSoon ? colors.warning : ui.textMuted}
          />
        </View>
        <View style={styles.taskInfo}>
          <Text style={styles.taskTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.taskMeta}>
            <Text style={[styles.taskCategory, { backgroundColor: ui.primaryLight }]}>
              {item.category}
            </Text>
            <Text
              style={[
                styles.taskDueDate,
                isOverdue && styles.taskOverdue,
                isDueSoon && styles.taskDueSoon,
              ]}
            >
              {formatDate(item.due_date)}
              {daysUntil !== null && ` (${daysUntil === 0 ? 'Today' : daysUntil > 0 ? `${daysUntil}d` : `${Math.abs(daysUntil)}d overdue`})`}
            </Text>
          </View>
        </View>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading tasks...</Text>
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

  const tasks = summary?.previews.tasks_due_soon || []

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: `${summary?.student.first_name || 'Student'}'s Tasks`,
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
          <Text style={styles.summaryValue}>{summary?.metrics.tasks_pending || 0}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary?.metrics.tasks_completed || 0}</Text>
          <Text style={styles.summaryLabel}>Completed</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{summary?.metrics.tasks_total || 0}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.assignButton}
        onPress={() =>
          router.push({
            pathname: '/(modals)/parent-assign-task',
            params: { studentId },
          })
        }
      >
        <Ionicons name="add-circle-outline" size={20} color="#fff" />
        <Text style={styles.assignButtonText}>Assign New Task</Text>
      </TouchableOpacity>

      {tasks.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkbox-outline" size={48} color={ui.textMuted} />
          <Text style={styles.emptyTitle}>No Upcoming Tasks</Text>
          <Text style={styles.emptyDesc}>
            Your student has no tasks due soon. You can assign a new task using the button above.
          </Text>
        </View>
      ) : (
        <FlatList
          data={tasks}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={ui.primary} />
          }
          ListHeaderComponent={
            <Text style={styles.listHeader}>Tasks Due Soon (Read-only)</Text>
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
  },
  summaryDivider: {
    width: 1,
    backgroundColor: ui.border,
    marginVertical: 4,
  },
  assignButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.primary,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: radius.md,
    gap: 8,
  },
  assignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  taskCard: {
    flexDirection: 'row',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    gap: 12,
  },
  taskIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: ui.text,
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  taskCategory: {
    fontSize: 11,
    fontWeight: '500',
    color: ui.primaryText,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  taskDueDate: {
    fontSize: 12,
    color: ui.textMuted,
  },
  taskOverdue: {
    color: colors.error,
    fontWeight: '500',
  },
  taskDueSoon: {
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
