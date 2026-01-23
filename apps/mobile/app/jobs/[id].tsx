import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import { goTab } from '../../src/navigation/goTab'
import {
  getJob,
  getCategoryInfo,
  formatDate,
  getDaysUntilDeadline,
  formatCounties,
  type JobPost,
} from '../../src/data/jobs'
import { createTask } from '../../src/data/planner'
import { isJobTracked, trackJob, untrackJob } from '../../src/data/tracking'

export default function JobDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [job, setJob] = useState<JobPost | null>(null)
  const [addingToPlanner, setAddingToPlanner] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  // Sprint 14: Tracking state
  const [isTracked, setIsTracked] = useState(false)
  const [trackingLoading, setTrackingLoading] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }

      const jobData = await getJob(id!)
      setJob(jobData)
      
      // Sprint 14: Check if job is tracked
      const tracked = await isJobTracked(id!)
      setIsTracked(tracked)
    } catch (error) {
      console.error('Error loading job:', error)
      Alert.alert('Error', 'Failed to load job details')
    } finally {
      setLoading(false)
    }
  }

  // Sprint 14: Toggle tracking
  async function handleToggleTracking() {
    if (!id) return
    
    setTrackingLoading(true)
    try {
      if (isTracked) {
        const success = await untrackJob(id)
        if (success) {
          setIsTracked(false)
        }
      } else {
        const success = await trackJob(id)
        if (success) {
          setIsTracked(true)
        }
      }
    } catch (error) {
      console.error('Error toggling tracking:', error)
      Alert.alert('Error', 'Failed to update tracking')
    } finally {
      setTrackingLoading(false)
    }
  }

  function handleApply() {
    if (!job?.apply_url) {
      Alert.alert('No Application Link', 'This job does not have an application link.')
      return
    }
    Linking.openURL(job.apply_url)
  }

  async function handleAddToPlanner() {
    if (!userId || !job) return

    setAddingToPlanner(true)
    try {
      await createTask(userId, {
        title: `Apply for ${job.title}`,
        category: 'Admin/Other',
        dueDate: job.deadline || undefined,
        notes: `Organization: ${job.org_name}\nSource: Jobs & Programs`,
      })

      Alert.alert(
        'Added to Planner',
        `"Apply for ${job.title}" has been added to your planner.`,
        [
          { text: 'View Planner', onPress: () => goTab('planner') },
          { text: 'OK' },
        ]
      )
    } catch (error) {
      console.error('Error adding to planner:', error)
      Alert.alert('Error', 'Failed to add to planner')
    } finally {
      setAddingToPlanner(false)
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    )
  }

  if (!job) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeBack('dashboard')}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Job</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="briefcase-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Job Not Found</Text>
          <Text style={styles.emptyText}>This job may no longer be available.</Text>
        </View>
      </View>
    )
  }

  const categoryInfo = getCategoryInfo(job.category)
  const daysUntil = getDaysUntilDeadline(job.deadline)

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeBack('dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Job Details</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Job Header */}
        <View style={styles.jobHeader}>
          <View
            style={[styles.categoryPill, { backgroundColor: categoryInfo.color + '20' }]}
          >
            <Ionicons
              name={categoryInfo.icon as keyof typeof Ionicons.glyphMap}
              size={14}
              color={categoryInfo.color}
            />
            <Text style={[styles.categoryText, { color: categoryInfo.color }]}>
              {categoryInfo.label}
            </Text>
          </View>
          <Text style={styles.jobTitle}>{job.title}</Text>
          <Text style={styles.jobOrg}>{job.org_name}</Text>
        </View>

        {/* Meta Info */}
        <View style={styles.metaSection}>
          {/* Location */}
          <View style={styles.metaRow}>
            <Ionicons
              name={job.location_mode === 'remote' ? 'globe-outline' : 'location-outline'}
              size={20}
              color="#64748b"
            />
            <View style={styles.metaContent}>
              <Text style={styles.metaLabel}>Location</Text>
              <Text style={styles.metaValue}>
                {job.location_mode === 'remote'
                  ? 'Remote'
                  : job.location_mode === 'hybrid'
                  ? `Hybrid${job.state ? ` - ${job.state}` : ''}`
                  : job.state || 'Local'}
                {job.counties && job.counties.length > 0 && (
                  ` (${formatCounties(job.counties)})`
                )}
              </Text>
            </View>
          </View>

          {/* Deadline */}
          {job.deadline && (
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={20} color="#64748b" />
              <View style={styles.metaContent}>
                <Text style={styles.metaLabel}>Application Deadline</Text>
                <Text
                  style={[
                    styles.metaValue,
                    daysUntil !== null && daysUntil <= 7 && styles.urgentValue,
                  ]}
                >
                  {formatDate(job.deadline)}
                  {daysUntil !== null && daysUntil <= 7 && (
                    daysUntil <= 0 ? ' (Due today!)' : ` (${daysUntil} days left)`
                  )}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Description */}
        {job.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.descriptionText}>{job.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          {job.apply_url && (
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Ionicons name="open-outline" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Now</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.plannerButton, addingToPlanner && styles.buttonDisabled]}
            onPress={handleAddToPlanner}
            disabled={addingToPlanner}
          >
            {addingToPlanner ? (
              <ActivityIndicator color="#3b82f6" size="small" />
            ) : (
              <>
                <Ionicons name="add-circle-outline" size={20} color="#3b82f6" />
                <Text style={styles.plannerButtonText}>Add to Planner</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Sprint 14: Track/Untrack Button */}
          <TouchableOpacity
            style={[
              styles.trackButton,
              isTracked && styles.trackButtonActive,
              trackingLoading && styles.buttonDisabled,
            ]}
            onPress={handleToggleTracking}
            disabled={trackingLoading}
          >
            {trackingLoading ? (
              <ActivityIndicator color={isTracked ? '#fff' : '#f59e0b'} size="small" />
            ) : (
              <>
                <Ionicons
                  name={isTracked ? 'bookmark' : 'bookmark-outline'}
                  size={20}
                  color={isTracked ? '#fff' : '#f59e0b'}
                />
                <Text style={[styles.trackButtonText, isTracked && styles.trackButtonTextActive]}>
                  {isTracked ? 'Tracked' : 'Track Job'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPadding} />
      </ScrollView>
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
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
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
  },
  jobHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
    marginBottom: 12,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '500',
  },
  jobTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  jobOrg: {
    fontSize: 16,
    color: '#64748b',
  },
  metaSection: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
    gap: 16,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  metaContent: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 15,
    color: '#0f172a',
    fontWeight: '500',
  },
  urgentValue: {
    color: '#ef4444',
  },
  section: {
    backgroundColor: '#fff',
    padding: 16,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 12,
  },
  descriptionText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 24,
  },
  actions: {
    padding: 16,
    gap: 12,
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  applyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  plannerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  plannerButtonText: {
    color: '#3b82f6',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  bottomPadding: {
    height: 40,
  },
  // Sprint 14: Track button styles
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: '#fcd34d',
  },
  trackButtonActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#f59e0b',
  },
  trackButtonText: {
    color: '#f59e0b',
    fontSize: 16,
    fontWeight: '600',
  },
  trackButtonTextActive: {
    color: '#fff',
  },
})
