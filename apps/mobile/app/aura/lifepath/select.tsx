import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../../src/data/identity'
import { getCareerCatalog, listLifePathCareerIds, saveLifePathCareerIds } from '../../../src/data/lifepath'
import { colors, radius, shadow, ui } from '../../../src/theme'

export default function LifePathSelectScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const careers = getCareerCatalog()
  const categories = useMemo(() => ['All', ...Array.from(new Set(careers.map((career) => career.category))).sort()], [careers])
  const filtered = useMemo(() => careers.filter((career) => {
    const matchesCategory = category === 'All' || career.category === category
    const q = query.trim().toLowerCase()
    const matchesQuery = !q || [career.title, career.category, career.description, ...career.tags].join(' ').toLowerCase().includes(q)
    return matchesCategory && matchesQuery
  }), [careers, category, query])

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const active = await getActiveStudentProfile(user.id)
    setStudentProfile(active)
    setSelected(active?.id ? await listLifePathCareerIds(active.id) : [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  function toggleCareer(careerId: string) {
    if (selected.includes(careerId)) {
      setSelected(selected.filter((id) => id !== careerId))
      return
    }
    if (selected.length >= 5) {
      Alert.alert('Top 5 reached', 'Remove one career before adding another.')
      return
    }
    setSelected([...selected, careerId])
  }

  async function save() {
    if (!user?.id || !studentProfile?.id) return
    setSaving(true)
    const result = await saveLifePathCareerIds(studentProfile.id, user.id, selected)
    setSaving(false)
    if (!result.success) {
      Alert.alert('Could not save LifePath', result.error || 'Please try again.')
      return
    }
    router.replace('/aura/lifepath' as never)
  }

  if (sessionLoading || loading) return <View style={styles.center}><ActivityIndicator size="large" color={ui.primary} /></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>A.U.R.A LifePath</Text>
      <Text style={styles.title}>Choose your top career interests.</Text>
      <Text style={styles.subtitle}>{selected.length} of 5 selected. Pick at least one to start comparing pathways.</Text>

      <TextInput style={styles.input} placeholder="Search careers" placeholderTextColor={ui.inputPlaceholder} value={query} onChangeText={setQuery} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
        {categories.map((cat) => (
          <TouchableOpacity key={cat} style={[styles.chip, category === cat && styles.chipActive]} onPress={() => setCategory(cat)}>
            <Text style={[styles.chipText, category === cat && styles.chipTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {filtered.map((career) => {
        const isSelected = selected.includes(career.id)
        return (
          <TouchableOpacity key={career.id} style={[styles.card, isSelected && styles.cardSelected]} onPress={() => toggleCareer(career.id)}>
            <View style={styles.cardHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.category}>{career.category}</Text>
                <Text style={styles.cardTitle}>{career.title}</Text>
              </View>
              <Ionicons name={isSelected ? 'checkmark-circle' : 'ellipse-outline'} size={26} color={isSelected ? ui.primary : ui.textSecondary} />
            </View>
            <Text style={styles.cardText}>{career.description}</Text>
          </TouchableOpacity>
        )
      })}

      <TouchableOpacity style={[styles.saveButton, !selected.length && styles.disabled]} disabled={!selected.length || saving} onPress={save}>
        <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save LifePath'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: ui.background },
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 28, fontWeight: '900', lineHeight: 34 },
  subtitle: { color: ui.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 14 },
  input: { borderWidth: 1, borderColor: ui.inputBorder, backgroundColor: ui.inputBackground, borderRadius: radius.md, padding: 13, color: ui.inputText, marginBottom: 10 },
  categoryRow: { marginBottom: 10 },
  chip: { borderWidth: 1, borderColor: ui.border, borderRadius: radius.full, paddingHorizontal: 12, paddingVertical: 8, marginRight: 8, backgroundColor: ui.backgroundSecondary },
  chipActive: { borderColor: ui.primary, backgroundColor: ui.primaryLight },
  chipText: { color: ui.textSecondary, fontWeight: '700' },
  chipTextActive: { color: ui.primary },
  card: { backgroundColor: ui.card, borderWidth: 1, borderColor: ui.cardBorder, borderRadius: radius.lg, padding: 15, marginTop: 12, ...shadow.card },
  cardSelected: { borderColor: ui.primary, backgroundColor: ui.primaryLight },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  category: { color: ui.textSecondary, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: ui.text, fontSize: 18, fontWeight: '900', marginTop: 2 },
  cardText: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 8 },
  saveButton: { backgroundColor: ui.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: 18 },
  disabled: { opacity: 0.55 },
  saveButtonText: { color: colors.white, fontWeight: '900' },
})
