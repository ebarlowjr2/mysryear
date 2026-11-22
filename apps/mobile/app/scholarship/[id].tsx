import React, { useCallback, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { CAREER_MATCH_DISCLAIMER, TRACKED_STATUS_LABELS, formatAwardAmount, formatCatalogDate, type TrackedStatus } from '@mysryear/shared'
import { useSession } from '../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import {
  formatDeadline,
  getScholarshipDetail,
  updateScholarshipApplicationTask,
  updateScholarshipStatus,
  type MobileScholarshipTask,
  type ScholarshipDetail,
} from '../../src/data/scholarships'
import { colors, ui, radius, shadow } from '../../src/theme'

const NEXT_STEP: Partial<Record<TrackedStatus | 'none', { status: TrackedStatus; label: string; primary: boolean }>> = {
  none: { status: 'saved', label: 'Save to my tracker', primary: false },
  saved: { status: 'applying', label: 'Start application checklist', primary: true },
  applying: { status: 'submitted', label: 'I submitted this', primary: true },
  submitted: { status: 'awarded', label: 'Mark awarded', primary: false },
}

export default function ScholarshipDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [detail, setDetail] = useState<ScholarshipDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id || !user?.id) return
    try {
      setError(null)
      const active = await getActiveStudentProfile(user.id)
      setStudentProfile(active)
      setDetail(await getScholarshipDetail(active?.id ?? null, id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scholarship')
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useFocusEffect(
    useCallback(() => {
      void loadData()
    }, [loadData]),
  )

  const setStatus = useCallback(
    async (status: TrackedStatus) => {
      if (!user?.id || !studentProfile?.id || !detail) return
      setBusyId(detail.entry.id)
      try {
        await updateScholarshipStatus({ studentProfileId: studentProfile.id, scholarship: detail.entry, status, userId: user.id })
        await loadData()
      } catch (err) {
        Alert.alert('Could not update', err instanceof Error ? err.message : 'Failed to update scholarship')
      } finally {
        setBusyId(null)
      }
    },
    [detail, loadData, studentProfile?.id, user?.id],
  )

  const toggleTask = useCallback(
    async (task: MobileScholarshipTask) => {
      if (!studentProfile?.id) return
      setBusyId(task.id)
      try {
        await updateScholarshipApplicationTask({ studentProfileId: studentProfile.id, taskId: task.id, status: task.status === 'done' ? 'not_started' : 'done' })
        await loadData()
      } catch (err) {
        Alert.alert('Could not update task', err instanceof Error ? err.message : 'Failed to update task')
      } finally {
        setBusyId(null)
      }
    },
    [loadData, studentProfile?.id],
  )

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  if (!detail) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'This scholarship is no longer listed.'}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const { entry, availability, trackedStatus, tasks, progress, careerMatch } = detail
  const next = NEXT_STEP[trackedStatus ?? 'none']

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title} accessibilityRole="header">{entry.title}</Text>
        <Text style={styles.provider}>{entry.organization}</Text>
        {trackedStatus ? <View style={styles.badge}><Text style={styles.badgeText}>{TRACKED_STATUS_LABELS[trackedStatus]}</Text></View> : null}

        <View style={styles.detailsCard}>
          <Row label="Award" value={formatAwardAmount(entry)} />
          <Row label="Status" value={availability.label} />
          {entry.opensAt ? <Row label="Opens" value={formatCatalogDate(entry.opensAt, entry.deadlineTimezone)} /> : null}
          {entry.deadline ? <Row label="Closes" value={formatDeadline(entry.deadline)} /> : null}
          {entry.state ? <Row label="Location" value={entry.state} /> : null}
        </View>

        {entry.earlyClosureNote ? <Text style={styles.warning}>⚠ {entry.earlyClosureNote}</Text> : null}
        {entry.eligibilitySummary ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Who can apply</Text>
            <Text style={styles.body}>{entry.eligibilitySummary}</Text>
          </View>
        ) : null}

        {careerMatch ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Why A.U.R.A. suggests this</Text>
            {careerMatch.reasons.map((r) => <Text key={r} style={styles.bullet}>✓ {r}</Text>)}
            {careerMatch.toCheck.map((c) => <Text key={c} style={styles.bulletMuted}>• Check: {c}</Text>)}
            <Text style={styles.disclaimer}>{CAREER_MATCH_DISCLAIMER}</Text>
          </View>
        ) : null}

        <View style={styles.actions}>
          {availability.canApply && entry.applicationUrl ? (
            <TouchableOpacity accessibilityRole="link" style={styles.primaryButton} onPress={() => void WebBrowser.openBrowserAsync(entry.applicationUrl!)}>
              <Text style={styles.primaryButtonText}>Apply on official site ↗</Text>
            </TouchableOpacity>
          ) : null}
          {studentProfile && next ? (
            <TouchableOpacity accessibilityRole="button" style={next.primary ? styles.primaryButton : styles.secondaryButton} disabled={busyId === entry.id} onPress={() => setStatus(next.status)}>
              <Text style={next.primary ? styles.primaryButtonText : styles.secondaryButtonText}>{next.label}</Text>
            </TouchableOpacity>
          ) : null}
          {trackedStatus === 'submitted' ? (
            <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} disabled={busyId === entry.id} onPress={() => setStatus('rejected')}>
              <Text style={styles.secondaryButtonText}>Mark not awarded</Text>
            </TouchableOpacity>
          ) : null}
          {entry.sourceUrl && entry.sourceUrl !== entry.applicationUrl ? (
            <TouchableOpacity accessibilityRole="link" onPress={() => void WebBrowser.openBrowserAsync(entry.sourceUrl!)}>
              <Text style={styles.link}>Sponsor information page ↗</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {trackedStatus ? (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Application checklist</Text>
            <Text style={styles.helperText}>MySRYear tracks your steps; you submit on the sponsor's official site.</Text>
            <Text style={styles.progressText}>{progress.completed}/{progress.total} done</Text>
            {tasks.map((task) => (
              <TouchableOpacity
                key={task.id}
                style={styles.taskRow}
                disabled={busyId === task.id}
                onPress={() => toggleTask(task)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: task.status === 'done' }}
              >
                <View style={[styles.checkbox, task.status === 'done' && styles.checkboxDone]}><Text style={styles.checkboxText}>{task.status === 'done' ? '✓' : ''}</Text></View>
                <View style={styles.taskBody}>
                  <Text style={[styles.taskTitle, task.status === 'done' && styles.taskTitleDone]}>{task.title}</Text>
                  {task.due_date ? <Text style={styles.taskMeta}>Due {formatDeadline(task.due_date)}{task.upload_required ? ' · Document needed' : ''}</Text> : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={styles.provenance}>
          {entry.lastVerifiedAt ? `Checked on the sponsor page ${formatCatalogDate(entry.lastVerifiedAt)}.` : 'Not yet confirmed with the sponsor.'}
          {entry.attribution ? ` ${entry.attribution}` : ''}
        </Text>
      </ScrollView>
    </View>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  centerContainer: { flex: 1, backgroundColor: ui.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { color: colors.error, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8 },
  backLink: { color: ui.primary, fontSize: 16, fontWeight: '700' },
  contentContainer: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 26, fontWeight: '900', color: ui.text, lineHeight: 32 },
  provider: { fontSize: 15, color: ui.textSecondary, marginTop: 6 },
  badge: { alignSelf: 'flex-start', backgroundColor: '#ECFDF5', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6, marginTop: 10 },
  badgeText: { color: '#047857', fontWeight: '800', fontSize: 12 },
  detailsCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow.card },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ui.border },
  detailLabel: { fontSize: 14, color: ui.textSecondary },
  detailValue: { fontSize: 14, color: ui.text, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  warning: { marginTop: 12, fontSize: 13, color: '#92400E', lineHeight: 19 },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow.card },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: ui.text, marginBottom: 8 },
  body: { fontSize: 14, color: ui.text, lineHeight: 21 },
  bullet: { fontSize: 14, color: ui.text, lineHeight: 20, marginBottom: 4 },
  bulletMuted: { fontSize: 13, color: ui.textSecondary, lineHeight: 19, marginBottom: 3 },
  disclaimer: { fontSize: 12, color: ui.textSecondary, marginTop: 8, fontStyle: 'italic' },
  actions: { marginTop: 20, gap: 12 },
  primaryButton: { backgroundColor: ui.primary, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: ui.primary, minHeight: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: ui.primary, fontSize: 16, fontWeight: '900' },
  link: { color: ui.primary, fontSize: 15, fontWeight: '700', textAlign: 'center', paddingVertical: 8 },
  helperText: { fontSize: 13, color: ui.textSecondary, lineHeight: 19, marginBottom: 8 },
  progressText: { fontSize: 14, color: ui.text, fontWeight: '800', marginBottom: 6 },
  taskRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: ui.border, minHeight: 44 },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: ui.primary, alignItems: 'center', justifyContent: 'center' },
  checkboxDone: { backgroundColor: ui.primary },
  checkboxText: { color: colors.white, fontWeight: '900' },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '800', color: ui.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: ui.textSecondary },
  taskMeta: { fontSize: 12, color: ui.textSecondary, marginTop: 4 },
  provenance: { fontSize: 12, color: ui.textSecondary, marginTop: 20, lineHeight: 17 },
})
