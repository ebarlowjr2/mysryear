import React, { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { Href, useFocusEffect, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import {
  SCHOLARSHIP_FIELDS,
  SCHOLARSHIP_FIELD_TAGS,
  TRACKED_STATUSES,
  TRACKED_STATUS_LABELS,
  formatAwardAmount,
  type CareerPlanMatch,
  type CatalogCard,
  type ScholarshipCatalogFilters,
  type ScholarshipDiscoveryInput,
  type ScholarshipFieldTag,
  type TrackedAward,
  type TrackedStatus,
} from '@mysryear/shared'
import { useSession } from '../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import { buildDiscovery, loadScholarshipDiscoveryData, updateScholarshipStatus } from '../../src/data/scholarships'
import { colors, ui, radius, shadow } from '../../src/theme'

type View_ = 'discover' | 'tracker'

const DEADLINE_OPTIONS: Array<{ label: string; value: number | null }> = [
  { label: 'Any deadline', value: null },
  { label: 'Next 30 days', value: 30 },
  { label: 'Next 60 days', value: 60 },
]

function Chip({ label, active, onPress, accessibilityLabel }: { label: string; active: boolean; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

export default function ScholarshipsScreen() {
  const router = useRouter()
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [input, setInput] = useState<ScholarshipDiscoveryInput | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [view, setView] = useState<View_>('discover')
  const [trackerTab, setTrackerTab] = useState<TrackedStatus>('saved')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [field, setField] = useState<ScholarshipFieldTag | ''>('')
  const [within, setWithin] = useState<number | null>(null)
  const [stateOnly, setStateOnly] = useState(false)
  const [page, setPage] = useState(1)

  const loadData = useCallback(async () => {
    if (!user?.id) return
    try {
      setError(null)
      const active = await getActiveStudentProfile(user.id)
      setStudentProfile(active)
      setInput(await loadScholarshipDiscoveryData(active?.id ?? null))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scholarships')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  // Reload whenever the screen regains focus: picks up a switched student or
  // career plans changed in the LifePath picker.
  useFocusEffect(
    useCallback(() => {
      if (sessionLoading) return
      if (!user?.id) {
        setLoading(false)
        return
      }
      void loadData()
    }, [sessionLoading, user?.id, loadData]),
  )

  const filters: ScholarshipCatalogFilters = useMemo(
    () => ({ query, field, deadlineWithinDays: within, state: stateOnly && input?.student?.state ? input.student.state : '' }),
    [query, field, within, stateOnly, input?.student?.state],
  )
  const discovery = useMemo(() => (input ? buildDiscovery(input, filters, page) : null), [input, filters, page])

  const setStatus = useCallback(
    async (card: { scholarshipId: string; entry: CatalogCard['entry'] }, status: TrackedStatus) => {
      if (!user?.id || !studentProfile?.id) return
      setBusyId(card.scholarshipId)
      try {
        await updateScholarshipStatus({ studentProfileId: studentProfile.id, scholarship: card.entry, status, userId: user.id })
        await loadData()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not update this scholarship')
      } finally {
        setBusyId(null)
      }
    },
    [loadData, studentProfile?.id, user?.id],
  )

  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v)
    setPage(1)
  }

  const renderAward = useCallback(
    ({ item }: { item: CatalogCard }) => (
      <AwardCard
        card={item}
        busy={busyId === item.scholarshipId}
        canSave={Boolean(studentProfile?.id)}
        onSave={() => setStatus(item, 'saved')}
        onOpen={() => router.push(`/scholarship/${item.scholarshipId}` as Href)}
      />
    ),
    [busyId, router, setStatus, studentProfile?.id],
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading open scholarships…</Text>
      </View>
    )
  }

  const catalog = discovery?.catalog
  const header = (
    <View>
      <View style={styles.header}>
        <Text style={styles.title} accessibilityRole="header">Open scholarships</Text>
        <Text style={styles.subtitle}>
          {catalog?.state === 'unavailable'
            ? 'Listings are temporarily unavailable'
            : `${catalog?.openCount ?? 0} open now${catalog?.upcomingCount ? ` · ${catalog.upcomingCount} opening soon` : ''} · verified on sponsor pages`}
        </Text>
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.segment}>
        <Chip label="Discover" active={view === 'discover'} onPress={() => setView('discover')} />
        <Chip
          label={`My tracker (${TRACKED_STATUSES.reduce((s, k) => s + (discovery?.tracker.counts[k] ?? 0), 0)})`}
          active={view === 'tracker'}
          onPress={() => setView('tracker')}
        />
      </View>

      {view === 'discover' ? (
        <>
          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search awards, sponsors, majors…"
              placeholderTextColor={ui.inputPlaceholder}
              value={query}
              onChangeText={resetPage(setQuery)}
              accessibilityLabel="Search open scholarships"
              returnKeyType="search"
            />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            <Chip label="All fields" active={!field} onPress={() => resetPage(setField)('')} accessibilityLabel="Field: all fields" />
            {SCHOLARSHIP_FIELD_TAGS.map((tag) => (
              <Chip key={tag} label={SCHOLARSHIP_FIELDS[tag].label} active={field === tag} onPress={() => resetPage(setField)(field === tag ? '' : tag)} accessibilityLabel={`Field: ${SCHOLARSHIP_FIELDS[tag].label}`} />
            ))}
          </ScrollView>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {DEADLINE_OPTIONS.map((o) => (
              <Chip key={o.label} label={o.label} active={within === o.value} onPress={() => resetPage(setWithin)(o.value)} />
            ))}
            {input?.student?.state ? (
              <Chip
                label={stateOnly ? `National + ${input.student.state}` : 'Anywhere'}
                active={stateOnly}
                onPress={() => resetPage(setStateOnly)(!stateOnly)}
                accessibilityLabel={`Location filter: ${stateOnly ? `national and ${input.student.state}` : 'anywhere'}`}
              />
            ) : null}
          </ScrollView>
          {catalog && catalog.state !== 'ok' ? (
            <View style={styles.notice} accessibilityLiveRegion="polite">
              <Text style={styles.noticeText}>{catalog.message}</Text>
            </View>
          ) : null}
        </>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {TRACKED_STATUSES.map((status) => (
            <Chip key={status} label={`${TRACKED_STATUS_LABELS[status]} (${discovery?.tracker.counts[status] ?? 0})`} active={trackerTab === status} onPress={() => setTrackerTab(status)} />
          ))}
        </ScrollView>
      )}
    </View>
  )

  const footer =
    view === 'discover' && discovery ? (
      <View>
        {catalog && catalog.page.pageCount > 1 ? (
          <View style={styles.pager}>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Previous page" disabled={!catalog.page.hasPrevious} onPress={() => setPage(catalog.page.page - 1)} style={[styles.pagerButton, !catalog.page.hasPrevious && styles.disabled]}>
              <Text style={styles.pagerText}>Previous</Text>
            </TouchableOpacity>
            <Text style={styles.pagerLabel}>Page {catalog.page.page} of {catalog.page.pageCount} · {catalog.page.total} awards</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Next page" disabled={!catalog.page.hasNext} onPress={() => setPage(catalog.page.page + 1)} style={[styles.pagerButton, !catalog.page.hasNext && styles.disabled]}>
              <Text style={styles.pagerText}>Next</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <ForYouSection
          discovery={discovery}
          studentName={studentProfile?.first_name ?? null}
          onPick={() => router.push('/aura/lifepath/select' as Href)}
          onOpen={(id) => router.push(`/scholarship/${id}` as Href)}
        />
        {studentProfile ? (
          <View style={styles.readinessCard}>
            <Text style={styles.readinessLabel}>Strengthen your applications · {discovery.readiness.percentage}% ready</Text>
            {discovery.readiness.actions.slice(0, 3).map((a) => (
              <Text key={a.key} style={styles.readinessAction}>• {a.label}</Text>
            ))}
            {discovery.readiness.actions.length === 0 ? <Text style={styles.readinessAction}>Your scholarship profile basics are in place.</Text> : null}
          </View>
        ) : null}
      </View>
    ) : null

  const trackerItems = (discovery?.tracker.items ?? []).filter((i) => i.status === trackerTab)

  return (
    <View style={styles.container}>
      {view === 'discover' ? (
        <FlatList
          testID="open-scholarships-list"
          data={catalog?.page.items ?? []}
          renderItem={renderAward}
          keyExtractor={(item) => item.scholarshipId}
          ListHeaderComponent={header}
          ListFooterComponent={footer}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData() }} tintColor={ui.primary} />}
        />
      ) : (
        <FlatList
          data={trackerItems}
          keyExtractor={(item) => item.scholarshipId}
          renderItem={({ item }) => <TrackerRow item={item} onOpen={() => router.push(`/scholarship/${item.scholarshipId}` as Href)} />}
          ListHeaderComponent={header}
          ListEmptyComponent={<Text style={styles.emptyText}>Nothing marked {TRACKED_STATUS_LABELS[trackerTab].toLowerCase()} yet. Save an open scholarship to start tracking it.</Text>}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void loadData() }} tintColor={ui.primary} />}
        />
      )}
    </View>
  )
}

function AwardCard({ card, busy, canSave, onSave, onOpen }: { card: CatalogCard; busy: boolean; canSave: boolean; onSave: () => void; onOpen: () => void }) {
  const { entry, availability } = card
  return (
    <View style={styles.card} accessible={false}>
      <TouchableOpacity onPress={onOpen} accessibilityRole="link" accessibilityLabel={`${entry.title}, ${availability.label}. View details`}>
        <Text style={styles.cardTitle}>{entry.title}</Text>
        <Text style={styles.cardSponsor}>{entry.organization}</Text>
        <Text style={styles.cardAmount}>{formatAwardAmount(entry)}</Text>
        <Text style={[styles.cardDeadline, availability.closingSoon && styles.closingSoon]}>{availability.label}</Text>
        {entry.eligibilitySummary ? <Text style={styles.cardEligibility} numberOfLines={3}>{entry.eligibilitySummary}</Text> : null}
        {entry.earlyClosureNote ? <Text style={styles.cardWarning}>⚠ {entry.earlyClosureNote}</Text> : null}
      </TouchableOpacity>
      <View style={styles.cardActions}>
        {card.trackedStatus ? (
          <View style={styles.statusPill}><Text style={styles.statusPillText}>{TRACKED_STATUS_LABELS[card.trackedStatus]}</Text></View>
        ) : canSave ? (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Save ${entry.title}`} style={styles.secondaryButton} disabled={busy} onPress={onSave}>
            <Text style={styles.secondaryButtonText}>{busy ? 'Saving…' : 'Save'}</Text>
          </TouchableOpacity>
        ) : null}
        {availability.canApply && entry.applicationUrl ? (
          <TouchableOpacity accessibilityRole="link" accessibilityLabel={`Apply to ${entry.title} on the official site`} style={styles.primaryButton} onPress={() => void WebBrowser.openBrowserAsync(entry.applicationUrl!)}>
            <Text style={styles.primaryButtonText}>Apply ↗</Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.primaryButton, styles.disabled]}><Text style={styles.primaryButtonText}>Not open yet</Text></View>
        )}
      </View>
    </View>
  )
}

function ForYouSection({
  discovery,
  studentName,
  onPick,
  onOpen,
}: {
  discovery: ReturnType<typeof buildDiscovery> | null
  studentName: string | null
  onPick: () => void
  onOpen: (id: string) => void
}) {
  if (!discovery) return null
  const forYou = discovery.forYou
  return (
    <View style={styles.forYou}>
      <Text style={styles.sectionTitle} accessibilityRole="header">For your A.U.R.A. career plans</Text>
      {forYou.careers.length ? (
        <Text style={styles.helperText}>{studentName ? `${studentName}'s` : 'Your'} plans: {forYou.careers.map((c) => `#${c.rank} ${c.title}`).join(' · ')}</Text>
      ) : null}
      {forYou.state !== 'ok' ? (
        <View>
          <Text style={styles.helperText}>{forYou.message}</Text>
          {forYou.state === 'needs-interests' ? (
            <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={onPick}>
              <Text style={styles.secondaryButtonText}>Choose career interests</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : (
        forYou.items.slice(0, 4).map((m: CareerPlanMatch) => (
          <TouchableOpacity key={m.scholarshipId} style={styles.matchCard} onPress={() => onOpen(m.scholarshipId)} accessibilityRole="link" accessibilityLabel={`${m.entry.title}. ${m.reasons[0] ?? ''}`}>
            <Text style={styles.matchTitle}>{m.entry.title}</Text>
            <Text style={styles.cardDeadline}>{m.availability.label} · {formatAwardAmount(m.entry)}</Text>
            {m.reasons.map((r) => <Text key={r} style={styles.bullet}>✓ {r}</Text>)}
            {m.toCheck.slice(0, 3).map((c) => <Text key={c} style={styles.bulletMuted}>• Check: {c}</Text>)}
          </TouchableOpacity>
        ))
      )}
      {forYou.state === 'ok' ? <Text style={styles.disclaimer}>{forYou.disclaimer}</Text> : null}
    </View>
  )
}

function TrackerRow({ item, onOpen }: { item: TrackedAward; onOpen: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onOpen} accessibilityRole="link">
      <Text style={styles.cardTitle}>{item.entry?.title ?? 'Scholarship'}</Text>
      <Text style={styles.cardSponsor}>{item.entry?.organization ?? ''}</Text>
      <Text style={styles.cardDeadline}>{TRACKED_STATUS_LABELS[item.status]} · {item.availability?.label ?? 'Details unavailable'}</Text>
      {item.progress.total > 0 ? <Text style={styles.helperText}>{item.progress.completed}/{item.progress.total} tasks · Next: {item.progress.nextTask ?? 'done'}</Text> : null}
    </TouchableOpacity>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  centerContainer: { flex: 1, backgroundColor: ui.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: ui.textSecondary, marginTop: 12, fontSize: 16 },
  errorText: { color: colors.error, fontSize: 14, marginHorizontal: 16, marginBottom: 8 },
  header: { paddingHorizontal: 4, paddingTop: 8, paddingBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', color: ui.text },
  subtitle: { fontSize: 14, color: ui.textSecondary, marginTop: 4 },
  segment: { flexDirection: 'row', gap: 8, marginVertical: 8 },
  chipRow: { gap: 8, paddingVertical: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, minHeight: 36, borderRadius: radius.full, backgroundColor: colors.white, borderWidth: 1, borderColor: ui.border, justifyContent: 'center' },
  chipActive: { backgroundColor: ui.primary, borderColor: ui.primary },
  chipText: { fontSize: 13, color: ui.text, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  searchContainer: { paddingVertical: 8 },
  searchInput: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, fontSize: 16, color: ui.text, borderWidth: 1, borderColor: ui.border },
  notice: { backgroundColor: '#FFFBEB', borderRadius: radius.md, padding: 14, marginVertical: 8, borderWidth: 1, borderColor: '#FDE68A' },
  noticeText: { color: '#78350F', fontSize: 14, lineHeight: 20 },
  listContent: { padding: 16, paddingBottom: 40 },
  card: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginBottom: 12, ...shadow.card },
  cardTitle: { fontSize: 18, fontWeight: '800', color: ui.text },
  cardSponsor: { fontSize: 13, color: ui.textSecondary, marginTop: 2 },
  cardAmount: { fontSize: 15, color: ui.text, fontWeight: '800', marginTop: 10 },
  cardDeadline: { fontSize: 13, color: ui.text, fontWeight: '600', marginTop: 4 },
  closingSoon: { color: '#B45309' },
  cardEligibility: { fontSize: 13, color: ui.textSecondary, marginTop: 8, lineHeight: 18 },
  cardWarning: { fontSize: 12, color: '#92400E', marginTop: 8, lineHeight: 17 },
  cardActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  primaryButton: { flex: 1, backgroundColor: ui.primary, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 14, fontWeight: '800' },
  secondaryButton: { flex: 1, borderWidth: 1, borderColor: ui.primary, minHeight: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12, marginTop: 4 },
  secondaryButtonText: { color: ui.primary, fontSize: 14, fontWeight: '800' },
  statusPill: { flex: 1, minHeight: 44, borderRadius: radius.md, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  statusPillText: { color: '#047857', fontWeight: '800' },
  disabled: { opacity: 0.45 },
  forYou: { backgroundColor: '#EEF2FF', borderRadius: radius.lg, padding: 14, marginVertical: 8 },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: ui.text, marginBottom: 6 },
  helperText: { fontSize: 13, color: ui.textSecondary, lineHeight: 19, marginBottom: 8 },
  matchCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 12, marginTop: 8 },
  matchTitle: { fontSize: 15, fontWeight: '800', color: ui.text },
  bullet: { fontSize: 13, color: ui.text, marginTop: 4, lineHeight: 18 },
  bulletMuted: { fontSize: 12, color: ui.textSecondary, marginTop: 3, lineHeight: 17 },
  disclaimer: { fontSize: 12, color: ui.textSecondary, marginTop: 8, fontStyle: 'italic' },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginVertical: 8 },
  pagerButton: { borderWidth: 1, borderColor: ui.primary, borderRadius: radius.md, paddingHorizontal: 14, minHeight: 44, justifyContent: 'center' },
  pagerText: { color: ui.primary, fontWeight: '800' },
  pagerLabel: { color: ui.textSecondary, fontSize: 12, flexShrink: 1, textAlign: 'center' },
  readinessCard: { backgroundColor: colors.white, borderRadius: radius.md, padding: 14, marginTop: 12, borderWidth: 1, borderColor: ui.border },
  readinessLabel: { fontSize: 13, color: ui.textSecondary, fontWeight: '700', marginBottom: 4 },
  readinessAction: { fontSize: 14, color: ui.text, marginTop: 3 },
  emptyText: { color: ui.textSecondary, fontSize: 15, textAlign: 'center', lineHeight: 22, padding: 24 },
})
