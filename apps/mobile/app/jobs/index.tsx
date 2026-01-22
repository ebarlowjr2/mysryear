import { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import {
  listJobsForUser,
  getCategoryInfo,
  formatDate,
  getDaysUntilDeadline,
  JOB_CATEGORIES,
  type JobPost,
  type JobCategory,
} from '../../src/data/jobs'
import type { Profile } from '../../src/data/profile'

export default function JobsListScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [jobs, setJobs] = useState<JobPost[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)

  // Filters
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | null>(null)
  const [remoteOnly, setRemoteOnly] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()
        setProfile(profileData)
      }

      const jobList = await listJobsForUser(profile)
      setJobs(jobList)
    } catch (error) {
      console.error('Error loading jobs:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [])

  // Apply filters
  let filteredJobs = jobs
  if (selectedCategory) {
    filteredJobs = filteredJobs.filter(j => j.category === selectedCategory)
  }
  if (remoteOnly) {
    filteredJobs = filteredJobs.filter(j => j.location_mode === 'remote')
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
          onPress={() => safeBack('dashboard')}
        >
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Jobs & Programs</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Category Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoryScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedCategory && styles.filterChipSelected,
            ]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !selectedCategory && styles.filterChipTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {JOB_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.filterChip,
                selectedCategory === cat.value && { backgroundColor: cat.color },
              ]}
              onPress={() => setSelectedCategory(cat.value)}
            >
              <Ionicons
                name={cat.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={selectedCategory === cat.value ? '#fff' : '#64748b'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCategory === cat.value && styles.filterChipTextSelected,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Toggle Filters */}
        <View style={styles.toggleFilters}>
          <TouchableOpacity
            style={[styles.toggleChip, remoteOnly && styles.toggleChipActive]}
            onPress={() => setRemoteOnly(!remoteOnly)}
          >
            <Ionicons
              name="globe-outline"
              size={14}
              color={remoteOnly ? '#3b82f6' : '#64748b'}
            />
            <Text style={[styles.toggleChipText, remoteOnly && styles.toggleChipTextActive]}>
              Remote Only
            </Text>
          </TouchableOpacity>
          {profile?.county && (
            <View style={styles.locationBadge}>
              <Ionicons name="location-outline" size={14} color="#22c55e" />
              <Text style={styles.locationBadgeText}>
                Showing jobs in {profile.county}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Job List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Location Warning */}
        {!profile?.state && !profile?.county && (
          <View style={styles.warningBanner}>
            <Ionicons name="warning-outline" size={20} color="#f59e0b" />
            <Text style={styles.warningText}>
              Add your location in Profile to see local job opportunities
            </Text>
          </View>
        )}

        {filteredJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="briefcase-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Jobs Found</Text>
            <Text style={styles.emptyText}>
              {selectedCategory || remoteOnly
                ? 'Try adjusting your filters'
                : 'Check back later for new opportunities'}
            </Text>
          </View>
        ) : (
          filteredJobs.map(job => {
            const categoryInfo = getCategoryInfo(job.category)
            const daysUntil = getDaysUntilDeadline(job.deadline)
            
            return (
              <TouchableOpacity
                key={job.id}
                style={styles.jobCard}
                onPress={() => router.push(`/jobs/${job.id}` as never)}
              >
                <View style={styles.jobHeader}>
                  <View style={styles.jobInfo}>
                    <Text style={styles.jobTitle}>{job.title}</Text>
                    <Text style={styles.jobOrg}>{job.org_name}</Text>
                  </View>
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
                </View>

                <View style={styles.jobMeta}>
                  {/* Location */}
                  <View style={styles.metaBadge}>
                    <Ionicons
                      name={job.location_mode === 'remote' ? 'globe-outline' : 'location-outline'}
                      size={14}
                      color="#64748b"
                    />
                    <Text style={styles.metaText}>
                      {job.location_mode === 'remote'
                        ? 'Remote'
                        : job.location_mode === 'hybrid'
                        ? 'Hybrid'
                        : job.state || 'Local'}
                    </Text>
                  </View>

                  {/* Deadline */}
                  {job.deadline && (
                    <View
                      style={[
                        styles.metaBadge,
                        daysUntil !== null && daysUntil <= 7 && styles.urgentBadge,
                      ]}
                    >
                      <Ionicons
                        name="calendar-outline"
                        size={14}
                        color={daysUntil !== null && daysUntil <= 7 ? '#ef4444' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.metaText,
                          daysUntil !== null && daysUntil <= 7 && styles.urgentText,
                        ]}
                      >
                        {daysUntil !== null && daysUntil <= 0
                          ? 'Due today!'
                          : daysUntil !== null && daysUntil <= 7
                          ? `${daysUntil} days left`
                          : formatDate(job.deadline)}
                      </Text>
                    </View>
                  )}
                </View>

                {job.description && (
                  <Text style={styles.jobDescription} numberOfLines={2}>
                    {job.description}
                  </Text>
                )}
              </TouchableOpacity>
            )
          })
        )}

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
  filtersContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  categoryScroll: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
    gap: 4,
  },
  filterChipSelected: {
    backgroundColor: '#3b82f6',
  },
  filterChipText: {
    fontSize: 13,
    color: '#64748b',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  toggleFilters: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  toggleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  toggleChipActive: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  toggleChipText: {
    fontSize: 12,
    color: '#64748b',
  },
  toggleChipTextActive: {
    color: '#3b82f6',
  },
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 12,
    color: '#22c55e',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  warningBanner: {
    flexDirection: 'row',
    backgroundColor: '#fef3c7',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: '#92400e',
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
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '500',
  },
  jobMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  metaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 13,
    color: '#64748b',
  },
  urgentBadge: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  urgentText: {
    color: '#ef4444',
    fontWeight: '500',
  },
  jobDescription: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  bottomPadding: {
    height: 40,
  },
})
