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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import {
  getMyRecruiterProfile,
  createRecruiterProfile,
  updateRecruiterProfile,
  RECRUITER_TYPES,
  type RecruiterType,
  type CreateRecruiterProfilePayload,
} from '../../src/data/jobs'

export default function RecruiterSetupScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [recruiterType, setRecruiterType] = useState<RecruiterType>('professional')
  const [bio, setBio] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactUrl, setContactUrl] = useState('')

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

      // Check if recruiter profile exists
      const recruiterProfile = await getMyRecruiterProfile(user.id)
      if (recruiterProfile) {
        setIsEditing(true)
        setOrgName(recruiterProfile.org_name || '')
        setRecruiterType(recruiterProfile.recruiter_type)
        setBio(recruiterProfile.bio || '')
        setContactEmail(recruiterProfile.contact_email || '')
        setContactUrl(recruiterProfile.contact_url || '')
      }
    } catch (error) {
      console.error('Error loading recruiter data:', error)
      Alert.alert('Error', 'Failed to load recruiter data')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userId) return

    // Validation
    if (!orgName.trim()) {
      Alert.alert('Required', 'Please enter your organization name')
      return
    }
    if (!contactEmail.trim() && !contactUrl.trim()) {
      Alert.alert('Required', 'Please provide a contact email or URL')
      return
    }

    setSaving(true)
    try {
      const payload: CreateRecruiterProfilePayload = {
        org_name: orgName.trim(),
        recruiter_type: recruiterType,
        bio: bio.trim() || null,
        contact_email: contactEmail.trim() || null,
        contact_url: contactUrl.trim() || null,
      }

      if (isEditing) {
        await updateRecruiterProfile(userId, payload)
        Alert.alert('Success', 'Recruiter profile updated!', [
          { text: 'OK', onPress: () => router.push('/jobs/my' as never) }
        ])
      } else {
        await createRecruiterProfile(userId, payload)
        Alert.alert('Success', 'Recruiter profile created!', [
          { text: 'Post a Job', onPress: () => router.push('/jobs/my' as never) }
        ])
      }
    } catch (error) {
      console.error('Error saving recruiter profile:', error)
      Alert.alert('Error', 'Failed to save recruiter profile')
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
          {isEditing ? 'Edit Recruiter Profile' : 'Become a Recruiter'}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Intro */}
        {!isEditing && (
          <View style={styles.introCard}>
            <Ionicons name="briefcase" size={32} color="#6366f1" />
            <Text style={styles.introTitle}>Post Jobs & Programs</Text>
            <Text style={styles.introText}>
              Connect with students by posting internships, entry-level positions, apprenticeships, and more.
            </Text>
          </View>
        )}

        {/* Organization Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Organization Name *</Text>
          <TextInput
            style={styles.input}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Your company or organization"
            maxLength={100}
          />
        </View>

        {/* Recruiter Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Recruiter Type *</Text>
          <View style={styles.typeChips}>
            {RECRUITER_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeChip,
                  recruiterType === type.value && styles.typeChipSelected,
                ]}
                onPress={() => setRecruiterType(type.value)}
              >
                <Ionicons
                  name={type.value === 'military' ? 'flag-outline' : 'business-outline'}
                  size={16}
                  color={recruiterType === type.value ? '#fff' : '#64748b'}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    recruiterType === type.value && styles.typeChipTextSelected,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Bio */}
        <View style={styles.section}>
          <Text style={styles.label}>Bio</Text>
          <Text style={styles.hint}>Tell students about your organization</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={bio}
            onChangeText={setBio}
            placeholder="Describe your organization and what opportunities you offer..."
            multiline
            numberOfLines={4}
            maxLength={500}
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
            placeholder="Website or LinkedIn URL"
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
              {isEditing ? 'Save Changes' : 'Create Recruiter Profile'}
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
    backgroundColor: '#eef2ff',
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
  typeChips: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 8,
  },
  typeChipSelected: {
    backgroundColor: '#6366f1',
    borderColor: '#6366f1',
  },
  typeChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  typeChipTextSelected: {
    color: '#fff',
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
