import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius } from '../../src/theme'
import { getProfile } from '../../src/data/profile'
import {
  createOpportunity,
  parseCounties,
  OpportunityType,
  LocationMode,
  OPPORTUNITY_TYPES,
  LOCATION_MODES,
  US_STATES,
} from '../../src/data/opportunities'

export default function OpportunityNewModal() {
  const router = useRouter()
  const { user } = useAuth()
  
  const [orgName, setOrgName] = useState('')
  const [title, setTitle] = useState('')
  const [type, setType] = useState<OpportunityType>('internship')
  const [description, setDescription] = useState('')
  const [applyUrl, setApplyUrl] = useState('')
  const [locationMode, setLocationMode] = useState<LocationMode>('local')
  const [state, setState] = useState('')
  const [countiesInput, setCountiesInput] = useState('')
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [startDate, setStartDate] = useState<Date | null>(null)
  const [isPublished, setIsPublished] = useState(true)
  
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [showStartDatePicker, setShowStartDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  // Load org name from profile on mount
  React.useEffect(() => {
    const loadProfile = async () => {
      if (!user?.id) return
      const profile = await getProfile(user.id)
      if (profile?.org_name) {
        setOrgName(profile.org_name)
      }
    }
    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    if (!user?.id) return
    
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required')
      return
    }

    // Parse counties
    const counties = countiesInput.trim() ? parseCounties(countiesInput) : null
    if (counties && counties.length > 4) {
      Alert.alert('Error', 'Maximum 4 counties allowed')
      return
    }

    setSaving(true)
    try {
      await createOpportunity(user.id, {
        org_name: orgName.trim() || null,
        title: title.trim(),
        type,
        description: description.trim() || null,
        apply_url: applyUrl.trim() || null,
        location_mode: locationMode,
        state: state || null,
        counties,
        deadline: deadline ? deadline.toISOString().split('T')[0] : null,
        start_date: startDate ? startDate.toISOString().split('T')[0] : null,
        is_published: isPublished,
      })
      
      router.back()
    } catch (error) {
      console.error('Failed to create opportunity:', error)
      Alert.alert('Error', 'Failed to create opportunity')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (date: Date | null) => {
    if (!date) return 'Not set'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <Stack.Screen
        options={{
          title: 'New Opportunity',
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity
              onPress={handleSave}
              style={styles.headerButton}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator size="small" color={ui.primary} />
              ) : (
                <Text style={styles.saveText}>Save</Text>
              )}
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Organization Name */}
        <View style={styles.section}>
          <Text style={styles.label}>Organization Name</Text>
          <TextInput
            style={styles.input}
            value={orgName}
            onChangeText={setOrgName}
            placeholder="Your organization name"
            placeholderTextColor={ui.textMuted}
          />
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Summer Internship 2026"
            placeholderTextColor={ui.textMuted}
          />
        </View>

        {/* Type */}
        <View style={styles.section}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipContainer}>
            {OPPORTUNITY_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[
                  styles.chip,
                  type === t.value && { backgroundColor: `${t.color}20`, borderColor: t.color },
                ]}
                onPress={() => setType(t.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    type === t.value && { color: t.color },
                  ]}
                >
                  {t.label}
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
            placeholder="Describe the opportunity..."
            placeholderTextColor={ui.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Apply URL */}
        <View style={styles.section}>
          <Text style={styles.label}>Apply/Register URL</Text>
          <TextInput
            style={styles.input}
            value={applyUrl}
            onChangeText={setApplyUrl}
            placeholder="https://..."
            placeholderTextColor={ui.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Location Mode */}
        <View style={styles.section}>
          <Text style={styles.label}>Location</Text>
          <View style={styles.chipContainer}>
            {LOCATION_MODES.map(l => (
              <TouchableOpacity
                key={l.value}
                style={[
                  styles.chip,
                  locationMode === l.value && styles.chipActive,
                ]}
                onPress={() => setLocationMode(l.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    locationMode === l.value && styles.chipTextActive,
                  ]}
                >
                  {l.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* State (only show for local/hybrid) */}
        {locationMode !== 'remote' && (
          <View style={styles.section}>
            <Text style={styles.label}>State</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.stateScroll}
            >
              {US_STATES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[
                    styles.stateChip,
                    state === s && styles.stateChipActive,
                  ]}
                  onPress={() => setState(s)}
                >
                  <Text
                    style={[
                      styles.stateChipText,
                      state === s && styles.stateChipTextActive,
                    ]}
                  >
                    {s}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Counties (only show for local/hybrid) */}
        {locationMode !== 'remote' && (
          <View style={styles.section}>
            <Text style={styles.label}>Counties (up to 4)</Text>
            <TextInput
              style={styles.input}
              value={countiesInput}
              onChangeText={setCountiesInput}
              placeholder="Montgomery, Autauga, Elmore, Lowndes"
              placeholderTextColor={ui.textMuted}
            />
            <Text style={styles.hint}>Separate multiple counties with commas</Text>
          </View>
        )}

        {/* Deadline */}
        <View style={styles.section}>
          <Text style={styles.label}>Deadline</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDeadlinePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={ui.textSecondary} />
            <Text style={styles.dateButtonText}>{formatDate(deadline)}</Text>
            {deadline && (
              <TouchableOpacity onPress={() => setDeadline(null)}>
                <Ionicons name="close-circle" size={20} color={ui.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showDeadlinePicker && (
            <DateTimePicker
              value={deadline || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowDeadlinePicker(false)
                if (date) setDeadline(date)
              }}
            />
          )}
        </View>

        {/* Start Date */}
        <View style={styles.section}>
          <Text style={styles.label}>Start Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowStartDatePicker(true)}
          >
            <Ionicons name="play-outline" size={20} color={ui.textSecondary} />
            <Text style={styles.dateButtonText}>{formatDate(startDate)}</Text>
            {startDate && (
              <TouchableOpacity onPress={() => setStartDate(null)}>
                <Ionicons name="close-circle" size={20} color={ui.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showStartDatePicker && (
            <DateTimePicker
              value={startDate || new Date()}
              mode="date"
              display="default"
              onChange={(event, date) => {
                setShowStartDatePicker(false)
                if (date) setStartDate(date)
              }}
            />
          )}
        </View>

        {/* Published Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsPublished(!isPublished)}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Published</Text>
              <Text style={styles.toggleHint}>
                {isPublished ? 'Visible to students' : 'Saved as draft'}
              </Text>
            </View>
            <View style={[styles.toggle, isPublished && styles.toggleActive]}>
              <View style={[styles.toggleKnob, isPublished && styles.toggleKnobActive]} />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
    color: ui.textSecondary,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    fontSize: 16,
    color: ui.text,
    borderWidth: 1,
    borderColor: ui.border,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 14,
  },
  hint: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 4,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    borderWidth: 1,
    borderColor: ui.border,
  },
  chipActive: {
    backgroundColor: ui.primaryLight,
    borderColor: ui.primary,
  },
  chipText: {
    fontSize: 14,
    color: ui.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: ui.primary,
  },
  stateScroll: {
    marginHorizontal: -16,
    paddingHorizontal: 16,
  },
  stateChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    marginRight: 8,
  },
  stateChipActive: {
    backgroundColor: ui.primaryLight,
  },
  stateChipText: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  stateChipTextActive: {
    color: ui.primary,
    fontWeight: '500',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.border,
    gap: 10,
  },
  dateButtonText: {
    flex: 1,
    fontSize: 16,
    color: ui.text,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.border,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
  },
  toggleHint: {
    fontSize: 13,
    color: ui.textSecondary,
    marginTop: 2,
  },
  toggle: {
    width: 50,
    height: 30,
    borderRadius: 15,
    backgroundColor: ui.backgroundSecondary,
    padding: 2,
  },
  toggleActive: {
    backgroundColor: ui.primary,
  },
  toggleKnob: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.white,
  },
  toggleKnobActive: {
    marginLeft: 20,
  },
})
