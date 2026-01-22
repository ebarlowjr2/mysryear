import { useState, useEffect } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { safeBack } from '../../src/navigation/safeBack'
import {
  getMyAvailability,
  createAvailability,
  deleteAvailability,
  DAYS_OF_WEEK,
  formatTime,
  type MentorAvailability,
} from '../../src/data/mentors'

// Time options for picker (30 min intervals)
const TIME_OPTIONS = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2)
  const minutes = i % 2 === 0 ? '00' : '30'
  return `${hours.toString().padStart(2, '0')}:${minutes}:00`
})

export default function MentorAvailabilityScreen() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [availability, setAvailability] = useState<MentorAvailability[]>([])

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState(1) // Monday
  const [startTime, setStartTime] = useState('09:00:00')
  const [endTime, setEndTime] = useState('17:00:00')
  const [showStartPicker, setShowStartPicker] = useState(false)
  const [showEndPicker, setShowEndPicker] = useState(false)

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

      const slots = await getMyAvailability(user.id)
      setAvailability(slots)
    } catch (error) {
      console.error('Error loading availability:', error)
      Alert.alert('Error', 'Failed to load availability')
    } finally {
      setLoading(false)
    }
  }

  async function handleAddSlot() {
    if (!userId) return

    // Validate times
    if (startTime >= endTime) {
      Alert.alert('Invalid Time', 'End time must be after start time')
      return
    }

    setSaving(true)
    try {
      await createAvailability(userId, {
        day_of_week: selectedDay,
        start_time: startTime,
        end_time: endTime,
      })
      
      // Refresh list
      const slots = await getMyAvailability(userId)
      setAvailability(slots)
      setShowAddModal(false)
      
      // Reset form
      setSelectedDay(1)
      setStartTime('09:00:00')
      setEndTime('17:00:00')
    } catch (error) {
      console.error('Error adding slot:', error)
      Alert.alert('Error', 'Failed to add availability slot')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSlot(slotId: string) {
    Alert.alert(
      'Delete Slot',
      'Are you sure you want to delete this availability slot?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAvailability(slotId)
              setAvailability(prev => prev.filter(s => s.id !== slotId))
            } catch (error) {
              console.error('Error deleting slot:', error)
              Alert.alert('Error', 'Failed to delete slot')
            }
          },
        },
      ]
    )
  }

  // Group availability by day
  const availabilityByDay = DAYS_OF_WEEK.map(day => ({
    ...day,
    slots: availability.filter(a => a.day_of_week === day.value),
  }))

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
        <Text style={styles.headerTitle}>Availability</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color="#3b82f6" />
          <Text style={styles.infoText}>
            Set your weekly availability so students know when you're free to connect.
          </Text>
        </View>

        {/* Days List */}
        {availabilityByDay.map(day => (
          <View key={day.value} style={styles.daySection}>
            <Text style={styles.dayLabel}>{day.label}</Text>
            {day.slots.length === 0 ? (
              <Text style={styles.noSlots}>No availability set</Text>
            ) : (
              day.slots.map(slot => (
                <View key={slot.id} style={styles.slotCard}>
                  <View style={styles.slotTime}>
                    <Ionicons name="time-outline" size={16} color="#64748b" />
                    <Text style={styles.slotTimeText}>
                      {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteSlot(slot.id)}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        ))}

        {/* Done Button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={() => safeBack('profile')}
        >
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Add Slot Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Availability</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Day Selector */}
            <Text style={styles.modalLabel}>Day</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.dayPicker}
            >
              {DAYS_OF_WEEK.map(day => (
                <TouchableOpacity
                  key={day.value}
                  style={[
                    styles.dayChip,
                    selectedDay === day.value && styles.dayChipSelected,
                  ]}
                  onPress={() => setSelectedDay(day.value)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      selectedDay === day.value && styles.dayChipTextSelected,
                    ]}
                  >
                    {day.short}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Start Time */}
            <Text style={styles.modalLabel}>Start Time</Text>
            <TouchableOpacity
              style={styles.timePicker}
              onPress={() => setShowStartPicker(!showStartPicker)}
            >
              <Text style={styles.timePickerText}>{formatTime(startTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
            {showStartPicker && (
              <ScrollView style={styles.timeList} nestedScrollEnabled>
                {TIME_OPTIONS.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timeOption}
                    onPress={() => {
                      setStartTime(time)
                      setShowStartPicker(false)
                    }}
                  >
                    <Text style={styles.timeOptionText}>{formatTime(time)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* End Time */}
            <Text style={styles.modalLabel}>End Time</Text>
            <TouchableOpacity
              style={styles.timePicker}
              onPress={() => setShowEndPicker(!showEndPicker)}
            >
              <Text style={styles.timePickerText}>{formatTime(endTime)}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>
            {showEndPicker && (
              <ScrollView style={styles.timeList} nestedScrollEnabled>
                {TIME_OPTIONS.map(time => (
                  <TouchableOpacity
                    key={time}
                    style={styles.timeOption}
                    onPress={() => {
                      setEndTime(time)
                      setShowEndPicker(false)
                    }}
                  >
                    <Text style={styles.timeOptionText}>{formatTime(time)}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {/* Save Button */}
            <TouchableOpacity
              style={[styles.saveButton, saving && styles.saveButtonDisabled]}
              onPress={handleAddSlot}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveButtonText}>Add Slot</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  addButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    gap: 8,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1e40af',
  },
  daySection: {
    marginBottom: 20,
  },
  dayLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0f172a',
    marginBottom: 8,
  },
  noSlots: {
    fontSize: 14,
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  slotCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  slotTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  slotTimeText: {
    fontSize: 14,
    color: '#0f172a',
  },
  deleteButton: {
    padding: 4,
  },
  doneButton: {
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 20,
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 40,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#0f172a',
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#64748b',
    marginBottom: 8,
    marginTop: 16,
  },
  dayPicker: {
    flexDirection: 'row',
  },
  dayChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    marginRight: 8,
  },
  dayChipSelected: {
    backgroundColor: '#3b82f6',
  },
  dayChipText: {
    fontSize: 14,
    color: '#64748b',
  },
  dayChipTextSelected: {
    color: '#fff',
  },
  timePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 12,
  },
  timePickerText: {
    fontSize: 16,
    color: '#0f172a',
  },
  timeList: {
    maxHeight: 150,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 4,
  },
  timeOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  timeOptionText: {
    fontSize: 14,
    color: '#0f172a',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
