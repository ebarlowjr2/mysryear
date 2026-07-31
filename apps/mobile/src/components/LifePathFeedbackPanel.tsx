import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import {
  getCareerById,
  listLifePathFeedback,
  createLifePathFeedback,
  updateLifePathFeedback,
  deleteLifePathFeedback,
  type LifePathFeedback,
} from '../data/lifepath'
import type { AccountProfile, StudentProfile } from '../data/identity'
import { colors, radius, shadow, ui } from '../theme'

type Props = {
  userId: string
  role: AccountProfile['role']
  studentProfile: StudentProfile | null
  careerId?: string | null
}

function formatDate(value?: string | null) {
  if (!value) return 'Unknown date'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown date'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function studentName(studentProfile: StudentProfile | null) {
  if (!studentProfile) return 'Selected student'
  return (
    [studentProfile.first_name, studentProfile.last_name].filter(Boolean).join(' ') || 'Student'
  )
}

function canAdd(role: AccountProfile['role']) {
  return role === 'parent' || role === 'guardian'
}

export default function LifePathFeedbackPanel({
  userId,
  role,
  studentProfile,
  careerId = null,
}: Props) {
  const [notes, setNotes] = useState<LifePathFeedback[]>([])
  const [noteText, setNoteText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const career = useMemo(() => (careerId ? getCareerById(careerId) : null), [careerId])
  const studentLabel = studentName(studentProfile)
  const addAllowed = canAdd(role)

  const load = useCallback(async () => {
    if (!studentProfile?.id) {
      setNotes([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const result = await listLifePathFeedback(studentProfile.id, careerId || null)
    if (result.error) setError(result.error)
    setNotes(result.notes)
    setLoading(false)
  }, [careerId, studentProfile?.id])

  useEffect(() => {
    void load()
  }, [load])

  async function addNote() {
    if (!studentProfile?.id || !addAllowed || !noteText.trim()) return
    setSaving(true)
    const result = await createLifePathFeedback({
      studentProfileId: studentProfile.id,
      careerId: careerId || null,
      authorUserId: userId,
      authorRole: role as 'parent' | 'guardian',
      note: noteText,
    })
    setSaving(false)
    if (!result.success) {
      Alert.alert('Could not save note', result.error || 'Please try again.')
      return
    }
    setNoteText('')
    await load()
  }

  async function saveEdit(noteId: string) {
    if (!editingText.trim()) return
    setSaving(true)
    const result = await updateLifePathFeedback(noteId, editingText)
    setSaving(false)
    if (!result.success) {
      Alert.alert('Could not update note', result.error || 'Please try again.')
      return
    }
    setEditingId(null)
    setEditingText('')
    await load()
  }

  async function removeNote(noteId: string) {
    const result = await deleteLifePathFeedback(noteId)
    if (!result.success) {
      Alert.alert('Could not delete note', result.error || 'Please try again.')
      return
    }
    await load()
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{career ? 'Career Notes' : 'LifePath Notes'}</Text>
      <Text style={styles.cardSubtitle}>
        Notes are attached to {studentLabel}
        {career ? ` • ${career.title}` : ' • general LifePath'} and never change official selections
        or tasks.
      </Text>

      {loading ? <ActivityIndicator color={ui.primary} style={styles.loader} /> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!loading && notes.length === 0 ? <Text style={styles.emptyText}>No notes yet.</Text> : null}

      {notes.map((note) => {
        const isOwn = note.author_user_id === userId
        const noteCareer = note.career_id ? getCareerById(note.career_id) : null
        const isEditing = editingId === note.id
        return (
          <View key={note.id} style={styles.note}>
            <View style={styles.noteHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.noteMeta}>
                  {note.author_role} {isOwn ? '(you)' : ''} • {formatDate(note.created_at)}
                </Text>
                <Text style={styles.noteMeta}>
                  Student: {studentLabel} • Path: {noteCareer?.title || 'General LifePath'}
                </Text>
              </View>
              {isOwn ? (
                <View style={styles.noteActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setEditingId(note.id)
                      setEditingText(note.note)
                    }}
                  >
                    <Ionicons name="pencil-outline" size={18} color={ui.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => void removeNote(note.id)}>
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            {isEditing ? (
              <View style={styles.editBox}>
                <TextInput
                  value={editingText}
                  onChangeText={setEditingText}
                  multiline
                  style={styles.input}
                  placeholder="Update note"
                  placeholderTextColor={ui.inputPlaceholder}
                />
                <View style={styles.editActions}>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => {
                      setEditingId(null)
                      setEditingText('')
                    }}
                  >
                    <Text style={styles.secondaryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.primaryButtonSmall}
                    disabled={saving || !editingText.trim()}
                    onPress={() => void saveEdit(note.id)}
                  >
                    <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <Text style={styles.noteText}>{note.note}</Text>
            )}
          </View>
        )
      })}

      {addAllowed ? (
        <View style={styles.addBox}>
          <TextInput
            value={noteText}
            onChangeText={setNoteText}
            multiline
            style={styles.input}
            placeholder={career ? 'Add a note for this career path' : 'Add a general LifePath note'}
            placeholderTextColor={ui.inputPlaceholder}
          />
          <TouchableOpacity
            style={[styles.primaryButton, (!noteText.trim() || saving) && styles.disabled]}
            disabled={!noteText.trim() || saving}
            onPress={() => void addNote()}
          >
            <Text style={styles.primaryButtonText}>{saving ? 'Saving...' : 'Add Note'}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <Text style={styles.readOnlyText}>Notes are read-only for this role.</Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: ui.card,
    borderColor: ui.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 14,
    ...shadow.card,
  },
  cardTitle: { color: ui.text, fontWeight: '900', fontSize: 18, marginBottom: 6 },
  cardSubtitle: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginBottom: 10 },
  loader: { marginVertical: 10 },
  errorText: { color: colors.error, fontSize: 13, marginTop: 8 },
  emptyText: { color: ui.textSecondary, fontSize: 13, marginVertical: 8 },
  readOnlyText: { color: ui.textSecondary, fontSize: 13, fontWeight: '700', marginTop: 10 },
  note: { borderTopColor: ui.border, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  noteHeader: { flexDirection: 'row', gap: 10, alignItems: 'flex-start' },
  noteMeta: { color: ui.textSecondary, fontSize: 12, lineHeight: 17, fontWeight: '700' },
  noteActions: { flexDirection: 'row', gap: 12, paddingTop: 2 },
  noteText: { color: ui.text, fontSize: 14, lineHeight: 20, marginTop: 8 },
  addBox: { marginTop: 14, gap: 10 },
  editBox: { marginTop: 10, gap: 10 },
  editActions: { flexDirection: 'row', gap: 10 },
  input: {
    minHeight: 86,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: ui.inputBorder,
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 12,
    color: ui.inputText,
  },
  primaryButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
  },
  primaryButtonSmall: {
    flex: 1,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
  },
  primaryButtonText: { color: colors.white, fontWeight: '900' },
  secondaryButton: {
    flex: 1,
    borderColor: ui.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
  },
  secondaryButtonText: { color: ui.primary, fontWeight: '900' },
  disabled: { opacity: 0.55 },
})
