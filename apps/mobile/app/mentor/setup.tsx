import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import {
  getMyMentorProfile,
  createMentorProfile,
  updateMentorProfile,
  type CreateMentorProfilePayload,
} from '../../src/data/mentors'
import { CAREER_PATHS, type CareerPath } from '../../src/content/careerPaths'
import { US_STATES } from '../../src/data/opportunities'

export default function MentorSetupScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [headline, setHeadline] = useState('')
  const [bio, setBio] = useState('')
  const [selectedCareerPaths, setSelectedCareerPaths] = useState<string[]>([])
  const [isRemote, setIsRemote] = useState(true)
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactUrl, setContactUrl] = useState('')
  const [showStateDropdown, setShowStateDropdown] = useState(false)

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

      // Check if mentor profile exists
      const mentorProfile = await getMyMentorProfile(user.id)
      if (mentorProfile) {
        setIsEditing(true)
        setHeadline(mentorProfile.headline || '')
        setBio(mentorProfile.bio || '')
        setSelectedCareerPaths(mentorProfile.career_paths || [])
        setIsRemote(mentorProfile.is_remote)
        setState(mentorProfile.state || '')
        setCounty(mentorProfile.county || '')
        setContactEmail(mentorProfile.contact_email || '')
        setContactUrl(mentorProfile.contact_url || '')
      }
    } catch (error) {
      console.error('Error loading mentor data:', error)
      Alert.alert('Error', 'Failed to load mentor data')
    } finally {
      setLoading(false)
    }
  }

  function toggleCareerPath(pathId: string) {
    setSelectedCareerPaths(prev => {
      if (prev.includes(pathId)) {
        return prev.filter(id => id !== pathId)
      }
      return [...prev, pathId]
    })
  }

  async function handleSave() {
    if (!userId) return

    // Validation
    if (!headline.trim()) {
      Alert.alert('Required', 'Please enter a headline')
      return
    }
    if (selectedCareerPaths.length === 0) {
      Alert.alert('Required', 'Please select at least one career path')
      return
    }
    if (!contactEmail.trim() && !contactUrl.trim()) {
      Alert.alert('Required', 'Please provide a contact email or URL')
      return
    }

    setSaving(true)
    try {
      const payload: CreateMentorProfilePayload = {
        headline: headline.trim(),
        bio: bio.trim() || null,
        career_paths: selectedCareerPaths,
        is_remote: isRemote,
        state: state || null,
        county: county.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_url: contactUrl.trim() || null,
      }

      if (isEditing) {
        await updateMentorProfile(userId, payload)
        Alert.alert('Success', 'Mentor profile updated!', [
          { text: 'OK', onPress: () => router.push('/mentor/availability' as never) }
        ])
      } else {
        await createMentorProfile(userId, payload)
        Alert.alert('Success', 'Mentor profile created!', [
          { text: 'Set Availability', onPress: () => router.push('/mentor/availability' as never) }
        ])
      }
    } catch (error) {
      console.error('Error saving mentor profile:', error)
      Alert.alert('Error', 'Failed to save mentor profile')
    } finally {
      setSaving(false)
    }
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
        <Text style={styles.headerTitle}>
          {isEditing ? 'Edit Mentor Profile' : 'Become a Mentor'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        {!isEditing && (
          <View style={styles.introCard}>
            <Ionicons name="people" size={32} color="#3b82f6" />
            <Text style={styles.introTitle}>Share Your Experience</Text>
            <Text style={styles.introText}>
              Help students explore career paths by sharing your professional journey and insights.
            </Text>
          </View>
        )}

        {/* Headline */}
        <View style={styles.section}>
          <Text style={styles.label}>Headline *</Text>
          <Text style={styles.hint}>e.g., "Cybersecurity Analyst at Tech Corp"</Text>
          <TextInput
            style={styles.input}
            value={headline}
            onChangeText={setHeadline}
            placeholder="Your professional headline"
            maxLength={100}
          />
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.hint}>Tell students about your career journey</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Share your background, experience, and what you can help students with..."
            multiline
            numberOfLines={4}
            maxLength={500}
          />
        </View>

        {/* Career Paths */}
        <View style={styles.section}>
          <Text style={styles.label}>Career Paths *</Text>
          <Text style={styles.hint}>Select the areas you can mentor in</Text>
          <View style={styles.careerPathsGrid}>
            {CAREER_PATHS.map((path: CareerPath) => (
              <TouchableOpacity
                key={path.id}
                style={[
                  styles.careerPathChip,
                  selectedCareerPaths.includes(path.id) && styles.careerPathChipSelected,
                ]}
                onPress={() => toggleCareerPath(path.id)}
              >
                <Ionicons
                  name={path.icon as keyof typeof Ionicons.glyphMap}
                  size={16}
                  color={selectedCareerPaths.includes(path.id) ? '#fff' : '#64748b'}
                />
                <Text
                  style={[
                    styles.careerPathChipText,
                    selectedCareerPaths.includes(path.id) && styles.careerPathChipTextSelected,
                  ]}
                >
                  {path.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Remote/Local */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Available Remotely</Text>
              <Text style={styles.hint}>Can meet with students virtually</Text>
            </View>
            <Switch
              value={isRemote}
              onValueChange={setIsRemote}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Location (optional) */}
        <View style={styles.section}>
          <Text style={styles.label}>Location (Optional)</Text>
          <Text style={styles.hint}>For local in-person mentoring</Text>
          
          {/* State Dropdown */}
          <TouchableOpacity
            style={styles.dropdown}
            onPress={() => setShowStateDropdown(!showStateDropdown)}
          >
            <Text style={state ? styles.dropdownText : styles.dropdownPlaceholder}>
              {state || 'Select State'}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#64748b" />
          </TouchableOpacity>
          
          {showStateDropdown && (
            <View style={styles.dropdownList}>
              <ScrollView style={styles.dropdownScroll} nestedScrollEnabled>
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => {
                    setState('')
                    setShowStateDropdown(false)
                  }}
                >
                  <Text style={styles.dropdownItemText}>-- None --</Text>
                </TouchableOpacity>
                {US_STATES.map(s => (
                  <TouchableOpacity
                    key={s}
                    style={styles.dropdownItem}
                    onPress={() => {
                      setState(s)
                      setShowStateDropdown(false)
                    }}
                  >
                    <Text style={styles.dropdownItemText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            value={county}
            onChangeText={setCounty}
            placeholder="County (optional)"
          />
        </View>

        {/* Contact Method */}
        <View style={styles.section}>
          <Text style={styles.label}>Contact Method *</Text>
          <Text style={styles.hint}>How students can reach you</Text>
          
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          
          <Text style={styles.orText}>or</Text>
          
          <TextInput
            style={styles.input}
            value={contactUrl}
            onChangeText={setContactUrl}
            placeholder="LinkedIn or Calendly URL"
            autoCapitalize="none"
          />
        </View>

        {/* Save Button */}
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>
              {isEditing ? 'Save Changes' : 'Create Mentor Profile'}
            </Text>
          )}
        </TouchableOpacity>

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
    padding: 16,
  },
  introCard: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
  },
  introTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
    marginTop: 12,
    marginBottom: 8,
  },
  introText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#0f172a',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  careerPathsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  careerPathChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  careerPathChipSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  careerPathChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  careerPathChipTextSelected: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdown: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: '#0f172a',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  dropdownList: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
    maxHeight: 200,
  },
  dropdownScroll: {
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  dropdownItemText: {
    fontSize: 16,
    color: '#0f172a',
  },
  orText: {
    textAlign: 'center',
    color: '#64748b',
    marginVertical: 8,
  },
  saveButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
})
