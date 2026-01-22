import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import {
  listMyJobs,
  deleteJob,
  getCategoryInfo,
  formatDate,
  type JobPost,
} from '../../src/data/jobs'

export default function MyJobsScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/(auth)/login')
        return
      }
      setUserId(user.id)

      const jobList = await listMyJobs(user.id)
      setJobs(jobList)
    } catch (error) {
      console.error('Error loading jobs:', error)
      Alert.alert('Error', 'Failed to load your job posts')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  async function handleDelete(jobId: string, title: string) {
    Alert.alert(
      'Delete Job Post',
      `Are you sure you want to delete "${title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJob(jobId)
              setJobs(prev => prev.filter(j => j.id !== jobId))
            } catch (error) {
              console.error('Error deleting job:', error)
              Alert.alert('Error', 'Failed to delete job post')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeBack('profile')}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Job Posts</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/recruiter/setup' as never)}
        >
          <Ionicons name="settings-outline" size={24} color="#64748b" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {jobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Job Posts Yet</Text>
            <Text style={styles.emptyText}>
              Create your first job post to connect with students
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/(modals)/job-new' as never)}
            >
              <Ionicons name="add" size={20} color="#fff" />
              <Text style={styles.createButtonText}>Create Job Post</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {jobs.map(job => {
              const categoryInfo = getCategoryInfo(job.category)
              return (
                <View key={job.id} style={styles.jobCard}>
                  <View style={styles.jobHeader}>
                    <View style={styles.jobInfo}>
                      <Text style={styles.jobTitle}>{job.title}</Text>
                      <Text style={styles.jobOrg}>{job.org_name}</Text>
                    </View>
                    <View
                      style={[
                        styles.statusBadge,
                        job.is_published ? styles.publishedBadge : styles.draftBadge,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusText,
                          job.is_published ? styles.publishedText : styles.draftText,
                        ]}
                      >
                        {job.is_published ? 'Published' : 'Draft'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.jobMeta}>
                    <View
                      style={[styles.categoryPill, { backgroundColor: categoryInfo.color + '20' }]}
                    >
                      <Ionicons
                        name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
                        size={12}
                        color={categoryInfo.color}
                      />
                      <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
                        {categoryInfo.label}
                      </Text>
                    </View>
                    {job.deadline && (
                      <View style={styles.deadlineBadge}>
                        <Ionicons name="calendar-outline" size={12} color="#64748b" />
                        <Text style={styles.deadlineText}>{formatDate(job.deadline)}</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.jobActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/(modals)/job-edit/${job.id}` as never)}
                    >
                      <Ionicons name="pencil-outline" size={18} color="#3b82f6" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleDelete(job.id, job.title)}
                    >
                      <Ionicons name="trash-outline" size={18} color="#ef4444" />
                      <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })}
          </>
        )}

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* FAB */}
      {jobs.length > 0 && (
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/(modals)/job-new' as never)}
        >
          <Ionicons name="add" size={28} color="#fff" />
        </TouchableOpacity>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  settingsButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 24,
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  jobCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  jobHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  jobInfo: {
    flex: 1,
    marginRight: 12,
  },
  jobTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  jobOrg: {
    fontSize: 14,
    color: '#64748b',
  },
  statusBadge: {
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  publishedBadge: {
    backgroundColor: '#dcfce7',
  },
  draftBadge: {
    backgroundColor: '#fef3c7',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  publishedText: {
    color: '#22c55e',
  },
  draftText: {
    color: '#f59e0b',
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500',
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deadlineText: {
    fontSize: 12,
    color: '#64748b',
  },
  jobActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 12,
    gap: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '500',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  bottomPadding: {
    height: 100,
  },
})
