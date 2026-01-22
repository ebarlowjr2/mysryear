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
  Platform,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import DateTimePicker from '@react-native-community/datetimepicker'
import { supabase } from '../../src/lib/supabase'
import {
  createJob,
  getMyRecruiterProfile,
  JOB_CATEGORIES,
  LOCATION_MODES,
  parseCounties,
  type JobCategory,
  type LocationMode,
} from '../../src/data/jobs'
import { US_STATES } from '../../src/data/opportunities'

export default function JobNewModal() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Form state
  const [orgName, setOrgName] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<JobCategory>('internship')
  const [description, setDescription] = useState('')
  const [applyUrl, setApplyUrl] = useState('')
  const [locationMode, setLocationMode] = useState<LocationMode>('remote')
  const [state, setState] = useState('')
  const [countiesInput, setCountiesInput] = useState('')
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [isPublished, setIsPublished] = useState(true)

  // UI state
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showStateDropdown, setShowStateDropdown] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.back()
        return
      }
      setUserId(user.id)

      // Pre-fill org name from recruiter profile
      const recruiterProfile = await getMyRecruiterProfile(user.id)
      if (recruiterProfile) {
        setOrgName(recruiterProfile.org_name)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!userId) return

    // Validation
    if (!orgName.trim()) {
      Alert.alert('Required', 'Please enter an organization name')
      return
    }
    if (!title.trim()) {
      Alert.alert('Required', 'Please enter a job title')
      return
    }

    const counties = parseCounties(countiesInput)

    setSaving(true)
    try {
      await createJob(userId, {
        org_name: orgName.trim(),
        title: title.trim(),
        category,
        description: description.trim() || null,
        apply_url: applyUrl.trim() || null,
        location_mode: locationMode,
        state: state || null,
        counties,
        deadline: deadline ? deadline.toISOString().split('T')[0] : null,
        is_published: isPublished,
      })

      Alert.alert('Success', 'Job post created!', [
        { text: 'OK', onPress: () => router.back() }
      ])
    } catch (error) {
      console.error('Error creating job:', error)
      Alert.alert('Error', 'Failed to create job post')
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
        <TouchableOpacity style={styles.closeButton} onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="#64748b" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Job Post</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Organization Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Organization Name *</Text>
          <TextInput
            style={styles.input}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Your company or organization"
          />
        </View>

        {/* Job Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Job Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Software Engineering Intern"
          />
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>Category *</Text>
          <View style={styles.categoryChips}>
            {JOB_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  category === cat.value && { backgroundColor: cat.color },
                ]}
                onPress={() => setCategory(cat.value)}
              >
                <Ionicons
                  name={cat.icon as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={category === cat.value ? '#fff' : '#64748b'}
                />
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat.value && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={description}
            onChangeText={setDescription}
            placeholder="Describe the position, requirements, and benefits..."
            multiline
            numberOfLines={4}
          />
        </View>

        {/* Apply URL */}
        <View style={styles.section}>
          <Text style={styles.label}>Apply URL</Text>
          <TextInput
            style={styles.input}
            value={applyUrl}
            onChangeText={setApplyUrl}
            placeholder="https://..."
            autoCapitalize="none"
            keyboardType="url"
          />
        </View>

        {/* Location Mode */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.locationChips}>
            {LOCATION_MODES.map(mode => (
              <TouchableOpacity
                key={mode.value}
                style={[
                  styles.locationChip,
                  locationMode === mode.value && styles.locationChipSelected,
                ]}
                onPress={() => setLocationMode(mode.value)}
              >
                <Text
                  style={[
                    styles.locationChipText,
                    locationMode === mode.value && styles.locationChipTextSelected,
                  ]}
                >
                  {mode.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* State & Counties (for local/hybrid) */}
        {(locationMode === 'local' || locationMode === 'hybrid') && (
          <>
            <View style={styles.section}>
              <Text style={styles.label}>State</Text>
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
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Counties (max 4)</Text>
              <TextInput
                style={styles.input}
                value={countiesInput}
                onChangeText={setCountiesInput}
                placeholder="e.g., Jefferson, Shelby, Madison"
              />
              <Text style={styles.hint}>Comma-separated, max 4 counties</Text>
            </View>
          </>
        )}

        {/* Deadline */}
        <View style={styles.section}>
          <Text style={styles.label}>Application Deadline</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color="#64748b" />
            <Text style={deadline ? styles.dateText : styles.datePlaceholder}>
              {deadline ? deadline.toLocaleDateString() : 'Select deadline (optional)'}
            </Text>
          </TouchableOpacity>
          {deadline && (
            <TouchableOpacity onPress={() => setDeadline(null)}>
              <Text style={styles.clearDate}>Clear deadline</Text>
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={deadline || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selectedDate) => {
              setShowDatePicker(Platform.OS === 'ios')
              if (selectedDate) {
                setDeadline(selectedDate)
              }
            }}
          />
        )}

        {/* Published Toggle */}
        <View style={styles.section}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.label}>Publish Immediately</Text>
              <Text style={styles.hint}>Make visible to students right away</Text>
            </View>
            <Switch
              value={isPublished}
              onValueChange={setIsPublished}
              trackColor={{ false: '#e2e8f0', true: '#3b82f6' }}
              thumbColor="#fff"
            />
          </View>
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
            <Text style={styles.saveButtonText}>Create Job Post</Text>
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
  closeButton: {
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
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
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
  categoryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 6,
  },
  categoryChipText: {
    fontSize: 13,
    color: '#64748b',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  locationChips: {
    flexDirection: 'row',
    gap: 8,
  },
  locationChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingVertical: 12,
  },
  locationChipSelected: {
    backgroundColor: '#3b82f6',
  },
  locationChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  locationChipTextSelected: {
    color: '#fff',
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
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    color: '#0f172a',
  },
  datePlaceholder: {
    fontSize: 16,
    color: '#94a3b8',
  },
  clearDate: {
    fontSize: 13,
    color: '#3b82f6',
    marginTop: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
