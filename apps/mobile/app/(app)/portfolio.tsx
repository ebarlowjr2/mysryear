import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import { createPortfolioItem, deletePortfolioItem, listStudentPortfolio, type PortfolioData, type PortfolioItem, type PortfolioKind } from '../../src/data/portfolio'
import { colors, radius, shadow, ui } from '../../src/theme'

const sections: Array<{ kind: PortfolioKind; title: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { kind: 'activities', title: 'Activities & Leadership', icon: 'people-outline' },
  { kind: 'serviceHours', title: 'Volunteer / Service Hours', icon: 'heart-outline' },
  { kind: 'achievements', title: 'Awards & Achievements', icon: 'trophy-outline' },
  { kind: 'certifications', title: 'Certifications', icon: 'ribbon-outline' },
]

function titleFor(item: PortfolioItem) {
  return item.title || item.name || 'Untitled'
}

export default function PortfolioScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)
  const [kind, setKind] = useState<PortfolioKind>('activities')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [organization, setOrganization] = useState('')
  const [hours, setHours] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const active = await getActiveStudentProfile(user.id)
    setStudentProfile(active)
    if (active?.id) {
      setPortfolio(await listStudentPortfolio(active.id))
    }
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  async function addItem() {
    if (!user?.id || !studentProfile?.id) {
      setMessage('Select an active student profile first.')
      return
    }
    if (!title.trim()) {
      setMessage('Enter a title first.')
      return
    }
    setSaving(true)
    setMessage(null)
    const result = await createPortfolioItem(kind, studentProfile.id, user.id, {
      title: title.trim(),
      category: category.trim() || null,
      organization: organization.trim() || null,
      hours: hours ? Number(hours) : 0,
      status: kind === 'certifications' ? 'completed' : undefined,
    })
    if (result.error) setMessage(result.error)
    else {
      setTitle('')
      setCategory('')
      setOrganization('')
      setHours('')
      await load()
      setMessage('Portfolio item added.')
    }
    setSaving(false)
  }

  async function remove(kindToDelete: PortfolioKind, item: PortfolioItem) {
    if (!studentProfile?.id) return
    Alert.alert('Delete portfolio item?', titleFor(item), [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await deletePortfolioItem(kindToDelete, item.id, studentProfile.id)
          if (!result.success) setMessage(result.error || 'Delete failed')
          else await load()
        },
      },
    ])
  }

  if (sessionLoading || loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={ui.primary} /></View>
  }

  if (!studentProfile?.id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Student Portfolio</Text>
        <Text style={styles.subtitle}>Create or select an active student profile before adding portfolio entries.</Text>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Student Portfolio</Text>
      <Text style={styles.subtitle}>Activities, service, awards, and certifications for scholarships and applications.</Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Activities</Text><Text style={styles.summaryValue}>{portfolio?.summary.activitiesCount || 0}</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Hours</Text><Text style={styles.summaryValue}>{portfolio?.summary.serviceHoursTotal || 0}</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Awards</Text><Text style={styles.summaryValue}>{portfolio?.summary.achievementsCount || 0}</Text></View>
        <View style={styles.summaryCard}><Text style={styles.summaryLabel}>Certs</Text><Text style={styles.summaryValue}>{portfolio?.summary.certificationsCompleted || 0}</Text></View>
        <View style={styles.summaryCardWide}><Text style={styles.summaryLabel}>Scholarship Readiness</Text><Text style={styles.summaryValue}>{portfolio?.summary.scholarshipReadinessScore || 0}%</Text><Text style={styles.summaryHint}>{portfolio?.summary.scholarshipReadinessLabel || 'Needs Foundation'}</Text></View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Add Portfolio Item</Text>
        <View style={styles.chips}>
          {sections.map((section) => (
            <TouchableOpacity key={section.kind} style={[styles.chip, kind === section.kind && styles.chipActive]} onPress={() => setKind(section.kind)}>
              <Text style={[styles.chipText, kind === section.kind && styles.chipTextActive]}>{section.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput style={styles.input} placeholder="Title/name" placeholderTextColor={ui.inputPlaceholder} value={title} onChangeText={setTitle} />
        <TextInput style={styles.input} placeholder="Category/type" placeholderTextColor={ui.inputPlaceholder} value={category} onChangeText={setCategory} />
        <TextInput style={styles.input} placeholder="Organization/provider" placeholderTextColor={ui.inputPlaceholder} value={organization} onChangeText={setOrganization} />
        {kind === 'serviceHours' ? <TextInput style={styles.input} placeholder="Hours" placeholderTextColor={ui.inputPlaceholder} value={hours} onChangeText={setHours} keyboardType="decimal-pad" /> : null}
        <TouchableOpacity style={[styles.button, saving && styles.disabled]} onPress={addItem} disabled={saving}>
          <Text style={styles.buttonText}>{saving ? 'Saving...' : 'Add Item'}</Text>
        </TouchableOpacity>
        {message ? <Text style={styles.message}>{message}</Text> : null}
      </View>

      {sections.map((section) => {
        const items = portfolio?.[section.kind] || []
        return (
          <View key={section.kind} style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name={section.icon} size={22} color={ui.primary} />
              <Text style={styles.cardTitle}>{section.title}</Text>
            </View>
            {items.length === 0 ? <Text style={styles.empty}>No entries yet.</Text> : items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{titleFor(item)}</Text>
                  <Text style={styles.itemMeta}>{[item.category, item.organization || item.provider, item.status].filter(Boolean).join(' • ') || 'Portfolio entry'}</Text>
                  {section.kind === 'serviceHours' ? <Text style={styles.itemMeta}>{Number(item.hours || 0)} hours</Text> : null}
                  {item.uploaded_files?.file_name ? <Text style={styles.proofBadge}>Proof: {item.uploaded_files.file_name}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => remove(section.kind, item)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )
      })}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: ui.background },
  title: { fontSize: 28, fontWeight: '800', color: ui.text },
  subtitle: { color: ui.textSecondary, fontSize: 15, marginTop: 8, marginBottom: 18, lineHeight: 22 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  summaryCard: { width: '47%', backgroundColor: ui.card, borderWidth: 1, borderColor: ui.cardBorder, borderRadius: radius.lg, padding: 14, ...shadow.card },
  summaryCardWide: { width: '100%', backgroundColor: ui.card, borderWidth: 1, borderColor: ui.cardBorder, borderRadius: radius.lg, padding: 14, ...shadow.card },
  summaryLabel: { color: ui.textSecondary, fontSize: 12 },
  summaryValue: { color: ui.text, fontSize: 24, fontWeight: '800', marginTop: 4 },
  summaryHint: { color: ui.textSecondary, fontSize: 12, fontWeight: '600', marginTop: 2 },
  card: { backgroundColor: ui.card, borderWidth: 1, borderColor: ui.cardBorder, borderRadius: radius.lg, padding: 16, marginBottom: 16, ...shadow.card },
  cardTitle: { color: ui.text, fontWeight: '800', fontSize: 17 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 12 },
  chip: { borderWidth: 1, borderColor: ui.border, borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: ui.backgroundSecondary },
  chipActive: { borderColor: ui.primary, backgroundColor: ui.primaryLight },
  chipText: { color: ui.textSecondary, fontSize: 12, fontWeight: '600' },
  chipTextActive: { color: ui.primary },
  input: { borderWidth: 1, borderColor: ui.inputBorder, backgroundColor: ui.inputBackground, borderRadius: radius.md, padding: 12, color: ui.inputText, marginBottom: 10 },
  button: { backgroundColor: ui.primary, borderRadius: radius.md, padding: 14, alignItems: 'center' },
  disabled: { opacity: 0.7 },
  buttonText: { color: colors.white, fontWeight: '800' },
  message: { color: ui.textSecondary, textAlign: 'center', marginTop: 10 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  empty: { color: ui.textSecondary, fontSize: 14 },
  itemRow: { flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, borderTopColor: ui.border, paddingTop: 12, marginTop: 12 },
  itemTitle: { color: ui.text, fontWeight: '700' },
  itemMeta: { color: ui.textSecondary, fontSize: 12, marginTop: 2 },
  proofBadge: { color: ui.primary, backgroundColor: ui.primaryLight, alignSelf: 'flex-start', fontSize: 12, fontWeight: '700', marginTop: 8, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full },
})
