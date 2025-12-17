import React, { useEffect, useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator,
  TouchableOpacity,
  Alert
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSession } from '../../src/hooks/useSession'
import { 
  getTasks, 
  toggleTaskComplete, 
  deleteTask,
  Task 
} from '../../src/data/planner'

export default function PlannerScreen() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchTasks = useCallback(async (userId: string) => {
    try {
      setError(null)
      const data = await getTasks(userId)
      setTasks(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load tasks')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    fetchTasks(user.id)
  }, [sessionLoading, user?.id, fetchTasks])

  const onRefresh = useCallback(() => {
    if (!user?.id) return
    setRefreshing(true)
    fetchTasks(user.id)
  }, [fetchTasks, user?.id])

  const handleToggleComplete = async (task: Task) => {
    try {
      const updated = await toggleTaskComplete(task.id, task.status)
      setTasks(prev => prev.map(t => t.id === task.id ? updated : t))
    } catch (err) {
      Alert.alert('Error', 'Failed to update task')
    }
  }

  const handleDelete = (task: Task) => {
    Alert.alert(
      'Delete Task',
      `Are you sure you want to delete "${task.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteTask(task.id)
              setTasks(prev => prev.filter(t => t.id !== task.id))
            } catch (err) {
              Alert.alert('Error', 'Failed to delete task')
            }
          }
        }
      ]
    )
  }

  const pendingTasks = tasks.filter(t => t.status !== 'done')
  const completedTasks = tasks.filter(t => t.status === 'done')

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading tasks...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={onRefresh}>Tap to retry</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>Senior Year Planner</Text>
          <Text style={styles.subtitle}>{tasks.length} tasks total</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Pending ({pendingTasks.length})</Text>
          </View>
          {pendingTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No pending tasks</Text>
              <Text style={styles.emptySubtext}>Tap + to add a new task</Text>
            </View>
          ) : (
            pendingTasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onToggle={() => handleToggleComplete(task)}
                onEdit={() => router.push(`/edit-task?id=${task.id}`)}
                onDelete={() => handleDelete(task)}
                formatDate={formatDate}
              />
            ))
          )}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Completed ({completedTasks.length})</Text>
          </View>
          {completedTasks.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No completed tasks yet</Text>
            </View>
          ) : (
            completedTasks.map(task => (
              <TaskRow 
                key={task.id} 
                task={task} 
                onToggle={() => handleToggleComplete(task)}
                onEdit={() => router.push(`/edit-task?id=${task.id}`)}
                onDelete={() => handleDelete(task)}
                formatDate={formatDate}
              />
            ))
          )}
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>

      <TouchableOpacity 
        style={styles.fab} 
        onPress={() => router.push('/new-task')}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

type TaskRowProps = {
  task: Task
  onToggle: () => void
  onEdit: () => void
  onDelete: () => void
  formatDate: (date?: string) => string | null
}

function TaskRow({ task, onToggle, onEdit, onDelete, formatDate }: TaskRowProps) {
  const isCompleted = task.status === 'done'
  
  return (
    <TouchableOpacity 
      style={styles.taskCard} 
      onPress={onEdit}
      onLongPress={onDelete}
    >
      <TouchableOpacity style={styles.checkbox} onPress={onToggle}>
        <View style={[styles.checkboxInner, isCompleted && styles.checkboxChecked]}>
          {isCompleted && <Text style={styles.checkmark}>✓</Text>}
        </View>
      </TouchableOpacity>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, isCompleted && styles.taskTitleCompleted]}>
          {task.title}
        </Text>
        <View style={styles.taskMeta}>
          <Text style={styles.taskCategory}>{task.category}</Text>
          {task.dueDate && (
            <Text style={styles.taskDue}>Due: {formatDate(task.dueDate)}</Text>
          )}
        </View>
        {task.notes && (
          <Text style={styles.taskNotes} numberOfLines={1}>{task.notes}</Text>
        )}
      </View>
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollView: {
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  section: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  taskCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkbox: {
    marginRight: 12,
    marginTop: 2,
  },
  checkboxInner: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#3b82f6',
  },
  checkmark: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: '#64748b',
  },
  taskMeta: {
    flexDirection: 'row',
    marginTop: 4,
    gap: 12,
  },
  taskCategory: {
    fontSize: 12,
    color: '#3b82f6',
  },
  taskDue: {
    fontSize: 12,
    color: '#94a3b8',
  },
  taskNotes: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  bottomPadding: {
    height: 100,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 32,
    color: '#fff',
    lineHeight: 32,
  },
})
