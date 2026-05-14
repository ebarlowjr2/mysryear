import React, { useState, useEffect } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native'
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { useSession } from '../src/hooks/useSession'
import { getTasks, updateTask, CATEGORIES, Category, Task } from '../src/data/planner'
import { colors, ui, radius } from '../src/theme'

export default function EditTaskScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const [task, setTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<Category>('Admin/Other')
  const [dueDate, setDueDate] = useState<Date | null>(null)
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

    useEffect(() => {
      async function loadTask() {
        if (!user?.id || !id) return

        try {
          const tasks = await getTasks(user.id)
          const found = tasks.find(t => t.id === id)
          if (found) {
            setTask(found)
            setTitle(found.title)
            setCategory(found.category)
            if (found.dueDate) {
              setDueDate(new Date(found.dueDate + 'T00:00:00'))
            }
            setNotes(found.notes ?? '')
          }
        } catch (err) {
          Alert.alert('Error', 'Failed to load task')
        } finally {
          setLoading(false)
        }
      }

      loadTask()
    }, [user?.id, id])

    const handleDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
      if (Platform.OS === 'android') {
        setShowDatePicker(false)
      }
      if (event.type === 'set' && selectedDate) {
        setDueDate(selectedDate)
      }
    }

    const formatDateForDisplay = (date: Date | null) => {
      if (!date) return 'Select a date'
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const formatDateForAPI = (date: Date | null) => {
      if (!date) return undefined
      return date.toISOString().split('T')[0]
    }

    const clearDate = () => {
      setDueDate(null)
    }

    const handleSave = async () => {
      if (!title.trim()) {
        Alert.alert('Error', 'Title is required')
        return
      }

      if (!id) {
        Alert.alert('Error', 'Task not found')
        return
      }

      setSaving(true)
      try {
        await updateTask(id, {
          title: title.trim(),
          category,
          dueDate: formatDateForAPI(dueDate),
          notes: notes.trim() || undefined
        })
        router.back()
      } catch (err) {
        Alert.alert('Error', 'Failed to update task')
      } finally {
        setSaving(false)
      }
    }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading task...</Text>
      </View>
    )
  }

  if (!task) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Task not found</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.cancelButton}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Task</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving ? (
            <ActivityIndicator size="small" color={ui.primary} />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.form}>
        <View style={styles.field}>
          <Text style={styles.label}>Title *</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder="Enter task title"
            placeholderTextColor={ui.inputPlaceholder}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Category</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, category === cat && styles.categoryChipSelected]}
                onPress={() => setCategory(cat)}
              >
                <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextSelected]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

                <View style={styles.field}>
                  <Text style={styles.label}>Due Date (optional)</Text>
                  <View style={styles.dateRow}>
                    <TouchableOpacity 
                      style={styles.dateButton} 
                      onPress={() => setShowDatePicker(true)}
                    >
                      <Text style={[styles.dateButtonText, !dueDate && styles.dateButtonPlaceholder]}>
                        {formatDateForDisplay(dueDate)}
                      </Text>
                    </TouchableOpacity>
                    {dueDate && (
                      <TouchableOpacity style={styles.clearButton} onPress={clearDate}>
                        <Text style={styles.clearButtonText}>Clear</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {showDatePicker && (
                    <View style={styles.datePickerContainer}>
                      <DateTimePicker
                        value={dueDate || new Date()}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={handleDateChange}
                        minimumDate={new Date()}
                        textColor="#fff"
                      />
                      {Platform.OS === 'ios' && (
                        <TouchableOpacity 
                          style={styles.datePickerDone} 
                          onPress={() => setShowDatePicker(false)}
                        >
                          <Text style={styles.datePickerDoneText}>Done</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

        <View style={styles.field}>
          <Text style={styles.label}>Notes (optional)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Add any notes..."
            placeholderTextColor={ui.inputPlaceholder}
            multiline
            numberOfLines={4}
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
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  backButton: {
    color: ui.primary,
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  cancelButton: {
    fontSize: 16,
    color: ui.textSecondary,
  },
  saveButton: {
    fontSize: 16,
    color: ui.primary,
    fontWeight: '600',
  },
  form: {
    flex: 1,
    padding: 16,
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 4,
  },
  categoryScroll: {
    flexDirection: 'row',
  },
  categoryChip: {
    backgroundColor: ui.backgroundSecondary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    borderColor: ui.border,
  },
  categoryChipSelected: {
    backgroundColor: ui.primary,
    borderColor: ui.primary,
  },
  categoryChipText: {
    fontSize: 14,
    color: ui.textSecondary,
  },
  categoryChipTextSelected: {
    color: colors.white,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateButton: {
    flex: 1,
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  dateButtonText: {
    fontSize: 16,
    color: ui.text,
  },
  dateButtonPlaceholder: {
    color: ui.inputPlaceholder,
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  clearButtonText: {
    fontSize: 14,
    color: colors.error,
  },
  datePickerContainer: {
    backgroundColor: ui.card,
    borderRadius: radius.md,
    marginTop: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: ui.border,
  },
  datePickerDone: {
    alignItems: 'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  datePickerDoneText: {
    fontSize: 16,
    color: ui.primary,
    fontWeight: '600',
  },
})
