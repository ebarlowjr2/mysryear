import React, { useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import DateTimePicker from '@react-native-community/datetimepicker'
import { colors, ui, radius, shadow } from '../../src/theme'
import { parentCreateStudentTask } from '../../src/api/edge'
import { safeBack } from '../../src/navigation/safeBack'

const TASK_CATEGORIES = [
  'Admin/Other',
  'Applications',
  'Financial Aid',
  'Testing',
  'Scholarships',
  'Essays',
  'Recommendations',
]

export default function ParentAssignTaskModal() {
  const router = useRouter()
  const { studentId } = useLocalSearchParams<{ studentId: string }>()
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [category, setCategory] = useState('Admin/Other')
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a task title')
      return
    }

    if (!studentId) {
      Alert.alert('Error', 'No student selected')
      return
    }

    setSaving(true)
    try {
      await parentCreateStudentTask(
        studentId,
        title.trim(),
        dueDate ? dueDate.toISOString().split('T')[0] : null,
        notes.trim() || null,
        category
      )
      Alert.alert('Success', 'Task assigned to student', [
        { text: 'OK', onPress: () => safeBack() },
      ])
    } catch (err) {
      console.error('Failed to assign task:', err)
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to assign task')
    } finally {
      setSaving(false)
    }
  }

  const handleDateChange = (event: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios')
    if (selectedDate) {
      setDueDate(selectedDate)
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
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack()} style={styles.closeButton}>
          <Ionicons name="close" size={24} color={ui.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Assign Task</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !title.trim()}
          style={[styles.saveButton, (!title.trim() || saving) && styles.saveButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
          <Text style={styles.infoText}>
            This task will be assigned to your linked student and will appear in their Planner.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Task Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="e.g., Meet with guidance counselor"
            placeholderTextColor={ui.textMuted}
            maxLength={200}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryScroll}
          >
            {TASK_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    category === cat && styles.categoryChipTextSelected,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Due Date</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowDatePicker(true)}
          >
            <Ionicons name="calendar-outline" size={20} color={ui.textSecondary} />
            <Text style={[styles.dateText, !dueDate && styles.datePlaceholder]}>
              {formatDate(dueDate)}
            </Text>
            {dueDate && (
              <TouchableOpacity onPress={() => setDueDate(null)}>
                <Ionicons name="close-circle" size={20} color={ui.textMuted} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>
        </View>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate || new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={handleDateChange}
            minimumDate={new Date()}
          />
        )}

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any additional details or instructions..."
            placeholderTextColor={ui.textMuted}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  saveButton: {
    backgroundColor: ui.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.md,
    minWidth: 60,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 12,
    borderRadius: radius.md,
    marginBottom: 20,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: ui.primaryText,
    lineHeight: 18,
  },
  field: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.md,
    padding: 12,
    fontSize: 16,
    color: ui.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  categoryScroll: {
    marginHorizontal: -4,
  },
  categoryChip: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  categoryChipSelected: {
    backgroundColor: ui.primary,
    borderColor: ui.primary,
  },
  categoryChipText: {
    fontSize: 13,
    color: ui.text,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.md,
    padding: 12,
    gap: 8,
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: ui.text,
  },
  datePlaceholder: {
    color: ui.textMuted,
  },
})
