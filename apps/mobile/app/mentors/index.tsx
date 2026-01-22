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
  listMentors,
  getMentorAvailability,
  hasAvailabilityToday,
  type MentorWithProfile,
  type MentorAvailability,
} from '../../src/data/mentors'
import { CAREER_PATHS, getCareerPathNames } from '../../src/content/careerPaths'
import type { Profile } from '../../src/data/profile'

export default function MentorsListScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [mentors, setMentors] = useState<MentorWithProfile[]>([])
  const [mentorAvailability, setMentorAvailability] = useState<Map<string, MentorAvailability[]>>(new Map())
  const [profile, setProfile] = useState<Profile | null>(null)

  // Filters
  const [selectedCareerPath, setSelectedCareerPath] = useState<string | null>(null)
  const [remoteOnly, setRemoteOnly] = useState(false)
  const [availableToday, setAvailableToday] = useState(false)

  useEffect(() => {
    loadData()
  }, [selectedCareerPath, remoteOnly])

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

      const mentorList = await listMentors({
        careerPath: selectedCareerPath || undefined,
        remoteOnly,
        state: profile?.state || undefined,
        county: profile?.county || undefined,
      })
      setMentors(mentorList)

      // Load availability for each mentor
      const availabilityMap = new Map<string, MentorAvailability[]>()
      for (const mentor of mentorList) {
        try {
          const availability = await getMentorAvailability(mentor.user_id)
          availabilityMap.set(mentor.user_id, availability)
        } catch {
          availabilityMap.set(mentor.user_id, [])
        }
      }
      setMentorAvailability(availabilityMap)
    } catch (error) {
      console.error('Error loading mentors:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    loadData()
  }, [selectedCareerPath, remoteOnly])

  // Filter by available today
  const filteredMentors = availableToday
    ? mentors.filter(m => hasAvailabilityToday(mentorAvailability.get(m.user_id) || []))
    : mentors

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
        <Text style={styles.headerTitle}>Find a Mentor</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        {/* Career Path Filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.careerPathScroll}
        >
          <TouchableOpacity
            style={[
              styles.filterChip,
              !selectedCareerPath && styles.filterChipSelected,
            ]}
            onPress={() => setSelectedCareerPath(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                !selectedCareerPath && styles.filterChipTextSelected,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {CAREER_PATHS.map(path => (
            <TouchableOpacity
              key={path.id}
              style={[
                styles.filterChip,
                selectedCareerPath === path.id && styles.filterChipSelected,
              ]}
              onPress={() => setSelectedCareerPath(path.id)}
            >
              <Ionicons
                name={path.icon as keyof typeof Ionicons.glyphMap}
                size={14}
                color={selectedCareerPath === path.id ? '#fff' : '#64748b'}
              />
              <Text
                style={[
                  styles.filterChipText,
                  selectedCareerPath === path.id && styles.filterChipTextSelected,
                ]}
              >
                {path.name}
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
          <TouchableOpacity
            style={[styles.toggleChip, availableToday && styles.toggleChipActive]}
            onPress={() => setAvailableToday(!availableToday)}
          >
            <Ionicons
              name="today-outline"
              size={14}
              color={availableToday ? '#3b82f6' : '#64748b'}
            />
            <Text style={[styles.toggleChipText, availableToday && styles.toggleChipTextActive]}>
              Available Today
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mentor List */}
      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredMentors.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color="#cbd5e1" />
            <Text style={styles.emptyTitle}>No Mentors Found</Text>
            <Text style={styles.emptyText}>
              {selectedCareerPath || remoteOnly || availableToday
                ? 'Try adjusting your filters'
                : 'Check back later for new mentors'}
            </Text>
          </View>
        ) : (
          filteredMentors.map(mentor => (
            <TouchableOpacity
              key={mentor.user_id}
              style={styles.mentorCard}
              onPress={() => router.push(`/mentors/${mentor.user_id}` as never)}
            >
              <View style={styles.mentorHeader}>
                <View style={styles.mentorAvatar}>
                  <Ionicons name="person" size={24} color="#64748b" />
                </View>
                <View style={styles.mentorInfo}>
                  <Text style={styles.mentorName}>
                    {mentor.full_name || 'Anonymous Mentor'}
                  </Text>
                  <Text style={styles.mentorHeadline} numberOfLines={1}>
                    {mentor.headline || 'Mentor'}
                  </Text>
                </View>
                {mentor.is_remote && (
                  <View style={styles.remoteBadge}>
                    <Ionicons name="globe-outline" size={12} color="#3b82f6" />
                    <Text style={styles.remoteBadgeText}>Remote</Text>
                  </View>
                )}
              </View>

              {/* Career Paths */}
              <View style={styles.careerPathsRow}>
                {getCareerPathNames(mentor.career_paths).slice(0, 3).map((name, i) => (
                  <View key={i} style={styles.careerPathTag}>
                    <Text style={styles.careerPathTagText}>{name}</Text>
                  </View>
                ))}
                {mentor.career_paths.length > 3 && (
                  <Text style={styles.moreText}>+{mentor.career_paths.length - 3} more</Text>
                )}
              </View>

              {/* Availability Preview */}
              {hasAvailabilityToday(mentorAvailability.get(mentor.user_id) || []) && (
                <View style={styles.availableTodayBadge}>
                  <Ionicons name="checkmark-circle" size={14} color="#22c55e" />
                  <Text style={styles.availableTodayText}>Available today</Text>
                </View>
              )}
            </TouchableOpacity>
          ))
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
  careerPathScroll: {
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
  },
  mentorCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  mentorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mentorAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mentorInfo: {
    flex: 1,
    marginLeft: 12,
  },
  mentorName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
  },
  mentorHeadline: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  remoteBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
    gap: 4,
  },
  remoteBadgeText: {
    fontSize: 11,
    color: '#3b82f6',
    fontWeight: '500',
  },
  careerPathsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 6,
  },
  careerPathTag: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  careerPathTagText: {
    fontSize: 12,
    color: '#64748b',
  },
  moreText: {
    fontSize: 12,
    color: '#94a3b8',
    alignSelf: 'center',
  },
  availableTodayBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 4,
  },
  availableTodayText: {
    fontSize: 12,
    color: '#22c55e',
    fontWeight: '500',
  },
  bottomPadding: {
    height: 40,
  },
})
