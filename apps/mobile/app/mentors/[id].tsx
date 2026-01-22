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
import { safeBack } from '../../src/navigation/safeBack'
import {
  getMentor,
  getMentorAvailability,
  getUpcomingAvailability,
  formatTime,
  type MentorWithProfile,
  type MentorAvailability,
} from '../../src/data/mentors'
import { getCareerPathsByIds } from '../../src/content/careerPaths'

export default function MentorDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [mentor, setMentor] = useState<MentorWithProfile | null>(null)
  const [availability, setAvailability] = useState<MentorAvailability[]>([])

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  async function loadData() {
    try {
      const mentorData = await getMentor(id!)
      setMentor(mentorData)

      if (mentorData) {
        const availabilityData = await getMentorAvailability(id!)
        setAvailability(availabilityData)
      }
    } catch (error) {
      console.error('Error loading mentor:', error)
      Alert.alert('Error', 'Failed to load mentor details')
    } finally {
      setLoading(false)
    }
  }

  function handleContact() {
    if (!mentor) return

    if (mentor.contact_email) {
      Linking.openURL(`mailto:${mentor.contact_email}`)
    } else if (mentor.contact_url) {
      Linking.openURL(mentor.contact_url)
    } else {
      Alert.alert('No Contact Info', 'This mentor has not provided contact information.')
    }
  }

  const upcomingAvailability = getUpcomingAvailability(availability, 7)
  const careerPaths = mentor ? getCareerPathsByIds(mentor.career_paths) : []

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0f172a" />
      </View>
    )
  }

  if (!mentor) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => safeBack('dashboard')}
          >
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mentor</Text>
          <View style={styles.headerRight} />
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="person-outline" size={48} color="#cbd5e1" />
          <Text style={styles.emptyTitle}>Mentor Not Found</Text>
          <Text style={styles.emptyText}>This mentor may no longer be available.</Text>
        </View>
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
        <Text style={styles.headerTitle}>Mentor</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={40} color="#64748b" />
          </View>
          <Text style={styles.name}>{mentor.full_name || 'Anonymous Mentor'}</Text>
          <Text style={styles.headline}>{mentor.headline || 'Mentor'}</Text>
          
          {/* Badges */}
          <View style={styles.badges}>
            {mentor.is_remote && (
              <View style={styles.badge}>
                <Ionicons name="globe-outline" size={14} color="#3b82f6" />
                <Text style={styles.badgeText}>Remote</Text>
              </View>
            )}
            {mentor.state && (
              <View style={styles.badge}>
                <Ionicons name="location-outline" size={14} color="#64748b" />
                <Text style={styles.badgeText}>
                  {mentor.county ? `${mentor.county}, ${mentor.state}` : mentor.state}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Bio */}
        {mentor.bio && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>About</Text>
            <Text style={styles.bioText}>{mentor.bio}</Text>
          </View>
        )}

        {/* Career Paths */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Career Expertise</Text>
          <View style={styles.careerPathsGrid}>
            {careerPaths.map(path => (
              <View key={path.id} style={styles.careerPathCard}>
                <Ionicons
                  name={path.icon as keyof typeof Ionicons.glyphMap}
                  size={20}
                  color="#3b82f6"
                />
                <Text style={styles.careerPathName}>{path.name}</Text>
                <Text style={styles.careerPathDesc} numberOfLines={2}>
                  {path.description}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Availability */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Availability (Next 7 Days)</Text>
          {upcomingAvailability.length === 0 ? (
            <Text style={styles.noAvailability}>No availability set for the next 7 days</Text>
          ) : (
            upcomingAvailability.map((day, index) => (
              <View key={index} style={styles.availabilityDay}>
                <Text style={styles.availabilityDayLabel}>
                  {day.dayLabel} ({day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})
                </Text>
                {day.slots.map(slot => (
                  <View key={slot.id} style={styles.availabilitySlot}>
                    <Ionicons name="time-outline" size={14} color="#64748b" />
                    <Text style={styles.availabilityTime}>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </Text>
                  </View>
                ))}
              </View>
            ))
          )}
        </View>

        {/* Contact Button */}
        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
          <Ionicons
            name={mentor.contact_email ? 'mail-outline' : 'link-outline'}
            size={20}
            color="#fff"
          />
          <Text style={styles.contactButtonText}>Contact Mentor</Text>
        </TouchableOpacity>

        {/* Coming Soon Placeholder */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="chatbubbles-outline" size={24} color="#94a3b8" />
          <Text style={styles.comingSoonTitle}>Request Intro</Text>
          <Text style={styles.comingSoonText}>Coming soon - request an introduction through the app</Text>
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
  profileHeader: {
    backgroundColor: '#fff',
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 4,
  },
  headline: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 12,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 10,
    gap: 4,
  },
  badgeText: {
    fontSize: 13,
    color: '#64748b',
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
  bioText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
  },
  careerPathsGrid: {
    gap: 12,
  },
  careerPathCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  careerPathName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4,
  },
  careerPathDesc: {
    fontSize: 13,
    color: '#64748b',
  },
  noAvailability: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  availabilityDay: {
    marginBottom: 12,
  },
  availabilityDayLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 6,
  },
  availabilitySlot: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 8,
    marginBottom: 4,
    gap: 6,
  },
  availabilityTime: {
    fontSize: 13,
    color: '#64748b',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    gap: 8,
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  comingSoonCard: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 16,
    alignItems: 'center',
  },
  comingSoonTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#64748b',
    marginTop: 8,
    marginBottom: 4,
  },
  comingSoonText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
  },
  bottomPadding: {
    height: 40,
  },
})
