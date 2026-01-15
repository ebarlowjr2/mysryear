import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors, ui, radius } from '../../../src/theme'
import {
  getApplication,
  updateApplication,
  APPLICATION_STATUSES,
  APPLICATION_TYPES,
  ESSAY_STATUSES,
  ApplicationStatus,
  ApplicationType,
  EssayStatus,
} from '../../../src/data/applications'

export default function EditApplicationModal() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form state
  const [collegeName, setCollegeName] = useState('')
  const [programName, setProgramName] = useState('')
  const [applicationType, setApplicationType] = useState<ApplicationType>('college')
  const [status, setStatus] = useState<ApplicationStatus>('not_started')
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [dateApplied, setDateApplied] = useState<Date | null>(null)
  const [portalUrl, setPortalUrl] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [essayStatus, setEssayStatus] = useState<EssayStatus>('not_started')
  const [recommendationCount, setRecommendationCount] = useState('0')
  const [feeAmount, setFeeAmount] = useState('')
  const [notes, setNotes] = useState('')

  // Date picker visibility
  const [showDeadlinePicker, setShowDeadlinePicker] = useState(false)
  const [showDateAppliedPicker, setShowDateAppliedPicker] = useState(false)

  const fetchApplication = useCallback(async () => {
    if (!id) return
    try {
      const app = await getApplication(id)
      if (app) {
        setCollegeName(app.college_name)
        setProgramName(app.program_name || '')
        setApplicationType(app.application_type)
        setStatus(app.status)
        setDeadline(app.deadline ? new Date(app.deadline) : null)
        setDateApplied(app.date_applied ? new Date(app.date_applied) : null)
        setPortalUrl(app.portal_url || '')
        setContactEmail(app.contact_email || '')
        setEssayStatus(app.essay_status)
        setRecommendationCount(String(app.recommendation_count))
        setFeeAmount(app.fee_amount ? String(app.fee_amount) : '')
        setNotes(app.notes || '')
      }
    } catch (error) {
      console.error('Failed to fetch application:', error)
      Alert.alert('Error', 'Failed to load application')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const handleCancel = () => {
    router.back()
  }

  const handleSave = async () => {
    if (!collegeName.trim()) {
      Alert.alert('Required Field', 'Please enter a college/organization name')
      return
    }

    if (!id) return

    setSaving(true)
    try {
      await updateApplication(id, {
        college_name: collegeName.trim(),
        program_name: programName.trim() || null,
        application_type: applicationType,
        status,
        deadline: deadline ? deadline.toISOString().split('T')[0] : null,
        date_applied: dateApplied ? dateApplied.toISOString().split('T')[0] : null,
        portal_url: portalUrl.trim() || null,
        contact_email: contactEmail.trim() || null,
        essay_status: essayStatus,
        recommendation_count: parseInt(recommendationCount) || 0,
        fee_amount: feeAmount ? parseFloat(feeAmount) : null,
        notes: notes.trim() || null,
      })
      router.back()
    } catch (error) {
      console.error('Failed to update application:', error)
      Alert.alert('Error', 'Failed to update application. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return 'Not set'
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Edit Application' }} />
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Edit Application',
          headerLeft: () => (
            <TouchableOpacity onPress={handleCancel} style={styles.headerButton}>
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* College Name (Required) */}
        <View style={styles.field}>
          <Text style={styles.label}>College/Organization *</Text>
          <TextInput
            style={styles.input}
            value={collegeName}
            onChangeText={setCollegeName}
            placeholder="e.g., Harvard University"
            placeholderTextColor={ui.textMuted}
          />
        </View>

        {/* Program Name */}
        <View style={styles.field}>
          <Text style={styles.label}>Program (Optional)</Text>
          <TextInput
            style={styles.input}
            value={programName}
            onChangeText={setProgramName}
            placeholder="e.g., Computer Science"
            placeholderTextColor={ui.textMuted}
          />
        </View>

        {/* Application Type */}
        <View style={styles.field}>
          <Text style={styles.label}>Type</Text>
          <View style={styles.chipContainer}>
            {APPLICATION_TYPES.map(type => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.chip,
                  applicationType === type.value && styles.chipActive,
                ]}
                onPress={() => setApplicationType(type.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    applicationType === type.value && styles.chipTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Status */}
        <View style={styles.field}>
          <Text style={styles.label}>Status</Text>
          <View style={styles.chipContainer}>
            {APPLICATION_STATUSES.map(s => (
              <TouchableOpacity
                key={s.value}
                style={[
                  styles.chip,
                  status === s.value && { backgroundColor: `${s.color}20`, borderColor: s.color },
                ]}
                onPress={() => setStatus(s.value)}
              >
                <View style={[styles.statusDot, { backgroundColor: s.color }]} />
                <Text
                  style={[
                    styles.chipText,
                    status === s.value && { color: s.color },
                  ]}
                >
                  {s.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Deadline */}
        <View style={styles.field}>
          <Text style={styles.label}>Deadline</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDeadlinePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={ui.textSecondary} />
            <Text style={[styles.dateText, !deadline && styles.datePlaceholder]}>
              {formatDateDisplay(deadline)}
            </Text>
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
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDeadlinePicker(Platform.OS === 'ios')
                if (date) setDeadline(date)
              }}
            />
          )}
        </View>

        {/* Date Applied */}
        <View style={styles.field}>
          <Text style={styles.label}>Date Applied</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDateAppliedPicker(true)}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={ui.textSecondary} />
            <Text style={[styles.dateText, !dateApplied && styles.datePlaceholder]}>
              {formatDateDisplay(dateApplied)}
            </Text>
            {dateApplied && (
              <TouchableOpacity onPress={() => setDateApplied(null)}>
                <Ionicons name="close-circle" size={20} color={ui.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
          {showDateAppliedPicker && (
            <DateTimePicker
              value={dateApplied || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={(event, date) => {
                setShowDateAppliedPicker(Platform.OS === 'ios')
                if (date) setDateApplied(date)
              }}
            />
          )}
        </View>

        {/* Portal URL */}
        <View style={styles.field}>
          <Text style={styles.label}>Portal URL</Text>
          <TextInput
            style={styles.input}
            value={portalUrl}
            onChangeText={setPortalUrl}
            placeholder="https://apply.college.edu"
            placeholderTextColor={ui.textMuted}
            keyboardType="url"
            autoCapitalize="none"
          />
        </View>

        {/* Essay Status */}
        <View style={styles.field}>
          <Text style={styles.label}>Essay Status</Text>
          <View style={styles.chipContainer}>
            {ESSAY_STATUSES.map(e => (
              <TouchableOpacity
                key={e.value}
                style={[
                  styles.chip,
                  essayStatus === e.value && styles.chipActive,
                ]}
                onPress={() => setEssayStatus(e.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    essayStatus === e.value && styles.chipTextActive,
                  ]}
                >
                  {e.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Recommendation Count */}
        <View style={styles.field}>
          <Text style={styles.label}>Recommendations Received</Text>
          <TextInput
            style={[styles.input, styles.numberInput]}
            value={recommendationCount}
            onChangeText={setRecommendationCount}
            placeholder="0"
            placeholderTextColor={ui.textMuted}
            keyboardType="number-pad"
          />
        </View>

        {/* Contact Email */}
        <View style={styles.field}>
          <Text style={styles.label}>Contact Email (Optional)</Text>
          <TextInput
            style={styles.input}
            value={contactEmail}
            onChangeText={setContactEmail}
            placeholder="admissions@college.edu"
            placeholderTextColor={ui.textMuted}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        {/* Fee Amount */}
        <View style={styles.field}>
          <Text style={styles.label}>Application Fee (Optional)</Text>
          <View style={styles.feeContainer}>
            <Text style={styles.feePrefix}>$</Text>
            <TextInput
              style={[styles.input, styles.feeInput]}
              value={feeAmount}
              onChangeText={setFeeAmount}
              placeholder="0.00"
              placeholderTextColor={ui.textMuted}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        {/* Notes */}
        <View style={styles.field}>
          <Text style={styles.label}>Notes</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Any additional notes..."
            placeholderTextColor={ui.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  headerButton: {
    padding: 8,
  },
  cancelText: {
    color: ui.textSecondary,
    fontSize: 16,
  },
  saveText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  field: {
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
    borderColor: ui.cardBorder,
  },
  numberInput: {
    width: 100,
  },
  textArea: {
    minHeight: 100,
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    borderWidth: 1,
    borderColor: 'transparent',
    gap: 6,
  },
  chipActive: {
    backgroundColor: `${ui.primary}15`,
    borderColor: ui.primary,
  },
  chipText: {
    fontSize: 13,
    color: ui.textSecondary,
    fontWeight: '500',
  },
  chipTextActive: {
    color: ui.primary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    gap: 10,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: ui.text,
  },
  datePlaceholder: {
    color: ui.textMuted,
  },
  feeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  feePrefix: {
    fontSize: 16,
    color: ui.textSecondary,
    marginRight: 8,
  },
  feeInput: {
    flex: 1,
    maxWidth: 120,
  },
})
