import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Href, useRouter } from 'expo-router'
import { useSession } from '../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import {
  formatDeadline,
  formatScholarshipAmount,
  listScholarshipMatches,
  searchScholarshipMatches,
  updateScholarshipStatus,
  type MobileScholarshipMatch,
  type MobileScholarshipWorkspace,
} from '../../src/data/scholarships'
import { colors, ui, radius, shadow } from '../../src/theme'

type Tab = 'suggested' | 'saved' | 'applying' | 'submitted' | 'awarded'

const tabs: Array<{ key: Tab; label: string }> = [
  { key: 'suggested', label: 'Matches' },
  { key: 'saved', label: 'Saved' },
  { key: 'applying', label: 'Applying' },
  { key: 'submitted', label: 'Submitted' },
  { key: 'awarded', label: 'Awarded' },
]

export default function ScholarshipsScreen() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [workspace, setWorkspace] = useState<MobileScholarshipWorkspace | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<Tab>('suggested')
  const [busyId, setBusyId] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    try {
      setError(null)
      const active = await getActiveStudentProfile(user.id)
      setStudentProfile(active)
      if (!active?.id) {
        setWorkspace(null)
        return
      }
      setWorkspace(await listScholarshipMatches(active.id))
    } catch (err) {
      console.error('Failed to load scholarship matches:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scholarship matches')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    void loadData()
  }, [sessionLoading, user?.id, loadData])

  const handleRefresh = useCallback(() => {
    setRefreshing(true)
    void loadData()
  }, [loadData])

  const updateStatus = useCallback(async (match: MobileScholarshipMatch, status: MobileScholarshipMatch['status']) => {
    if (!user?.id || !studentProfile?.id) return
    setBusyId(match.scholarshipId)
    try {
      await updateScholarshipStatus({ studentProfileId: studentProfile.id, scholarship: match.scholarship, status, userId: user.id })
      if (tabs.some((tab) => tab.key === status)) setActiveTab(status as Tab)
      await loadData()
    } catch (err) {
      console.error('Failed to update scholarship status:', err)
      setError(err instanceof Error ? err.message : 'Failed to update scholarship')
    } finally {
      setBusyId(null)
    }
  }, [loadData, studentProfile?.id, user?.id])

  const filteredMatches = useMemo(() => {
    const matches = searchScholarshipMatches(workspace?.matches || [], searchQuery)
    if (activeTab === 'suggested') return matches.filter((match) => match.status === 'suggested').slice(0, 30)
    return matches.filter((match) => match.status === activeTab)
  }, [activeTab, searchQuery, workspace?.matches])

  const renderScholarshipItem = useCallback(({ item }: { item: MobileScholarshipMatch }) => {
    return (
      <TouchableOpacity
        style={styles.scholarshipCard}
        onPress={() => router.push(`/scholarship/${item.scholarshipId}` as Href)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleWrap}>
            <Text style={styles.scholarshipName} numberOfLines={2}>{item.scholarship.title}</Text>
            <Text style={styles.providerText}>{item.scholarship.organization || 'Scholarship Provider'}</Text>
          </View>
          <View style={styles.scorePill}><Text style={styles.scorePillText}>{item.matchScore}%</Text></View>
        </View>

        <View style={styles.cardDetails}>
          <Text style={styles.detailValue}>{formatScholarshipAmount(item.scholarship.amount)}</Text>
          <Text style={styles.detailMuted}>Deadline {formatDeadline(item.scholarship.deadline)}</Text>
        </View>

        <View style={styles.readinessRow}>
          <Text style={styles.readinessText}>{item.readinessPercentage}% ready</Text>
          {item.applicationProgress.total > 0 ? (
            <Text style={styles.readinessText}>{item.applicationProgress.completed}/{item.applicationProgress.total} tasks</Text>
          ) : null}
        </View>

        <Text style={styles.reasonText} numberOfLines={2}>{item.matchReason[0] || 'Profile-based scholarship match'}</Text>

        <View style={styles.cardActions}>
          {item.status === 'suggested' ? (
            <TouchableOpacity style={styles.secondaryButton} disabled={busyId === item.scholarshipId} onPress={() => updateStatus(item, 'saved')}>
              <Text style={styles.secondaryButtonText}>Save to MySRYear</Text>
            </TouchableOpacity>
          ) : null}
          {item.status === 'saved' ? (
            <TouchableOpacity style={styles.primaryButton} disabled={busyId === item.scholarshipId} onPress={() => updateStatus(item, 'applying')}>
              <Text style={styles.primaryButtonText}>Open Workspace</Text>
            </TouchableOpacity>
          ) : null}
          {item.status === 'applying' ? (
            <TouchableOpacity style={styles.primaryButton} disabled={busyId === item.scholarshipId} onPress={() => router.push(`/scholarship/${item.scholarshipId}` as Href)}>
              <Text style={styles.primaryButtonText}>View Checklist</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </TouchableOpacity>
    )
  }, [busyId, router, updateStatus])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Building scholarship matches...</Text>
      </View>
    )
  }

  if (!studentProfile) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.title}>Scholarships</Text>
        <Text style={styles.emptyText}>Create or select an active student profile before matching scholarships.</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Scholarships</Text>
        <Text style={styles.subtitle}>Matched to {studentProfile.first_name || 'the active student'}'s profile</Text>
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.readinessCard}>
        <Text style={styles.readinessLabel}>Scholarship Readiness</Text>
        <Text style={styles.readinessScore}>{workspace?.readiness.percentage ?? 0}%</Text>
        <Text style={styles.readinessSubtitle}>{workspace?.readiness.label || 'Needs Foundation'}</Text>
        <Text style={styles.readinessHint}>Next: {workspace?.readiness.topMissingRequirement || 'Keep tracking applications and deadlines.'}</Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search matched scholarships..."
          placeholderTextColor={ui.inputPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity key={tab.key} style={[styles.tab, activeTab === tab.key && styles.tabActive]} onPress={() => setActiveTab(tab.key)}>
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label} ({workspace?.counts[tab.key] ?? 0})</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredMatches}
        renderItem={renderScholarshipItem}
        keyExtractor={item => item.scholarshipId}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={ui.primary} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No scholarships in this status yet.</Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  centerContainer: { flex: 1, backgroundColor: ui.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: ui.textSecondary, marginTop: 12, fontSize: 16 },
  errorText: { color: colors.error, fontSize: 14, marginHorizontal: 16, marginBottom: 8 },
  header: { padding: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: ui.text },
  subtitle: { fontSize: 15, color: ui.textSecondary, marginTop: 4 },
  readinessCard: { marginHorizontal: 16, marginBottom: 12, padding: 18, backgroundColor: colors.white, borderRadius: radius.lg, ...shadow.card },
  readinessLabel: { fontSize: 13, color: ui.textSecondary, fontWeight: '700' },
  readinessScore: { fontSize: 40, fontWeight: '900', color: ui.text, marginTop: 4 },
  readinessSubtitle: { fontSize: 16, fontWeight: '700', color: ui.text },
  readinessHint: { fontSize: 13, color: ui.textSecondary, marginTop: 8 },
  searchContainer: { paddingHorizontal: 16, paddingVertical: 8 },
  searchInput: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, fontSize: 16, color: ui.text, borderWidth: 1, borderColor: ui.border },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8, gap: 8, flexWrap: 'wrap' },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: ui.border },
  tabActive: { backgroundColor: ui.primary, borderColor: ui.primary },
  tabText: { fontSize: 13, color: ui.textSecondary, fontWeight: '700' },
  tabTextActive: { color: colors.white },
  listContent: { padding: 16, paddingBottom: 32 },
  scholarshipCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 14, ...shadow.card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  cardTitleWrap: { flex: 1 },
  scholarshipName: { fontSize: 18, fontWeight: '800', color: ui.text },
  providerText: { fontSize: 13, color: ui.textSecondary, marginTop: 4 },
  scorePill: { backgroundColor: '#EFF6FF', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, alignSelf: 'flex-start' },
  scorePillText: { color: ui.primary, fontWeight: '800', fontSize: 13 },
  cardDetails: { marginTop: 14, flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  detailValue: { fontSize: 15, color: ui.text, fontWeight: '800' },
  detailMuted: { fontSize: 13, color: ui.textSecondary, flexShrink: 1 },
  readinessRow: { marginTop: 12, flexDirection: 'row', justifyContent: 'space-between' },
  readinessText: { fontSize: 13, color: ui.textSecondary, fontWeight: '700' },
  reasonText: { marginTop: 10, fontSize: 13, color: ui.textSecondary, lineHeight: 18 },
  cardActions: { marginTop: 14, flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, backgroundColor: ui.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: ui.primary, paddingVertical: 12, borderRadius: radius.md, alignItems: 'center' },
  secondaryButtonText: { color: ui.primary, fontSize: 14, fontWeight: '800' },
  emptyContainer: { padding: 32, alignItems: 'center' },
  emptyText: { color: ui.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22 },
})
