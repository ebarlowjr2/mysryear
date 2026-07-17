import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import { useSession } from '../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import {
  formatDeadline,
  formatScholarshipAmount,
  getScholarshipMatch,
  updateScholarshipApplicationTask,
  updateScholarshipStatus,
  type MobileScholarshipMatch,
  type MobileScholarshipTask,
} from '../../src/data/scholarships'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function ScholarshipDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [match, setMatch] = useState<MobileScholarshipMatch | null>(null)
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    if (!id || !user?.id) return
    try {
      setError(null)
      const active = await getActiveStudentProfile(user.id)
      setStudentProfile(active)
      setMatch(active?.id ? await getScholarshipMatch(active.id, id) : null)
    } catch (err) {
      console.error('Failed to load scholarship:', err)
      setError(err instanceof Error ? err.message : 'Failed to load scholarship')
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const setStatus = useCallback(async (status: MobileScholarshipMatch['status']) => {
    if (!user?.id || !studentProfile?.id || !match) return
    setBusyId(match.scholarshipId)
    try {
      await updateScholarshipStatus({ studentProfileId: studentProfile.id, scholarship: match.scholarship, status, userId: user.id })
      await loadData()
      if (status === 'applying') {
        Alert.alert('Workspace opened', 'MySRYear will track your scholarship checklist here. Use the official application link when you are ready to submit on the provider site.')
      }
    } catch (err) {
      console.error('Failed to update scholarship status:', err)
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update scholarship')
    } finally {
      setBusyId(null)
    }
  }, [loadData, match, studentProfile?.id, user?.id])

  const toggleTask = useCallback(async (task: MobileScholarshipTask) => {
    if (!studentProfile?.id) return
    setBusyId(task.id)
    try {
      await updateScholarshipApplicationTask({
        studentProfileId: studentProfile.id,
        taskId: task.id,
        status: task.status === 'done' ? 'not_started' : 'done',
      })
      await loadData()
    } catch (err) {
      console.error('Failed to update task:', err)
      Alert.alert('Error', err instanceof Error ? err.message : 'Failed to update task')
    } finally {
      setBusyId(null)
    }
  }, [loadData, studentProfile?.id])

  const openOfficialApplication = useCallback(async () => {
    const url = match?.scholarship.application_url
    if (!url) {
      Alert.alert('Official link missing', 'This scholarship does not have an official application link yet. Use the checklist while you confirm the provider link.')
      return
    }
    await WebBrowser.openBrowserAsync(url)
  }, [match?.scholarship.application_url])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading scholarship...</Text>
      </View>
    )
  }

  if (!match) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error || 'Scholarship not found'}</Text>
        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.back()}>
          <Text style={styles.secondaryButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{match.scholarship.title}</Text>
        <Text style={styles.provider}>{match.scholarship.organization || 'Scholarship Provider'}</Text>

        <View style={styles.statusRow}>
          <View style={styles.badge}><Text style={styles.badgeText}>{match.matchScore}% match</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{match.readinessPercentage}% ready</Text></View>
          <View style={styles.badge}><Text style={styles.badgeText}>{match.status}</Text></View>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Amount</Text><Text style={styles.detailValue}>{formatScholarshipAmount(match.scholarship.amount)}</Text></View>
          <View style={styles.detailRow}><Text style={styles.detailLabel}>Deadline</Text><Text style={styles.detailValue}>{formatDeadline(match.scholarship.deadline)}</Text></View>
          {match.scholarship.state ? <View style={styles.detailRow}><Text style={styles.detailLabel}>State</Text><Text style={styles.detailValue}>{match.scholarship.state}</Text></View> : null}
        </View>

        {match.scholarship.description ? <Text style={styles.description}>{match.scholarship.description}</Text> : null}

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Why this matches</Text>
          {match.matchReason.slice(0, 5).map((reason) => <Text key={reason} style={styles.bullet}>• {reason}</Text>)}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Missing requirements</Text>
          {match.missingRequirements.length ? match.missingRequirements.slice(0, 5).map((item) => <Text key={item} style={styles.bullet}>• {item}</Text>) : <Text style={styles.bullet}>No major missing requirements detected.</Text>}
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>MySRYear application workspace</Text>
          <Text style={styles.helperText}>This does not submit your scholarship. Track tasks here, then apply on the provider's official site.</Text>
          <Text style={styles.progressText}>{match.applicationProgress.completed}/{match.applicationProgress.total} checklist items complete</Text>

          {match.applicationTasks.length === 0 ? (
            <Text style={styles.helperText}>Open the workspace to generate a checklist for this scholarship.</Text>
          ) : match.applicationTasks.map((task) => (
            <TouchableOpacity key={task.id} style={styles.taskRow} disabled={busyId === task.id} onPress={() => toggleTask(task)}>
              <View style={[styles.checkbox, task.status === 'done' && styles.checkboxDone]}><Text style={styles.checkboxText}>{task.status === 'done' ? '✓' : ''}</Text></View>
              <View style={styles.taskBody}>
                <Text style={[styles.taskTitle, task.status === 'done' && styles.taskTitleDone]}>{task.title}</Text>
                {task.description ? <Text style={styles.taskDescription}>{task.description}</Text> : null}
                <Text style={styles.taskMeta}>{task.category.replace('_', ' ')}{task.due_date ? ` • Due ${formatDeadline(task.due_date)}` : ''}{task.upload_required ? ' • Document needed' : ''}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.actionsSection}>
          {match.status === 'suggested' ? <TouchableOpacity style={styles.secondaryButton} disabled={busyId === match.scholarshipId} onPress={() => setStatus('saved')}><Text style={styles.secondaryButtonText}>Save to MySRYear</Text></TouchableOpacity> : null}
          {match.status === 'saved' ? <TouchableOpacity style={styles.primaryButton} disabled={busyId === match.scholarshipId} onPress={() => setStatus('applying')}><Text style={styles.primaryButtonText}>Open Application Workspace</Text></TouchableOpacity> : null}
          {match.status === 'applying' ? <TouchableOpacity style={styles.primaryButton} disabled={busyId === match.scholarshipId} onPress={() => setStatus('submitted')}><Text style={styles.primaryButtonText}>I Submitted This</Text></TouchableOpacity> : null}
          {match.status === 'submitted' ? <TouchableOpacity style={styles.secondaryButton} disabled={busyId === match.scholarshipId} onPress={() => setStatus('awarded')}><Text style={styles.secondaryButtonText}>Mark Awarded</Text></TouchableOpacity> : null}
          <TouchableOpacity style={styles.secondaryButton} onPress={openOfficialApplication}>
            <Text style={styles.secondaryButtonText}>Open Official Application</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  centerContainer: { flex: 1, backgroundColor: ui.background, justifyContent: 'center', alignItems: 'center', padding: 24 },
  loadingText: { color: ui.textSecondary, marginTop: 12, fontSize: 16 },
  errorText: { color: colors.error, fontSize: 16, textAlign: 'center', marginBottom: 16 },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 8, backgroundColor: ui.background },
  backLink: { color: ui.primary, fontSize: 16, fontWeight: '700' },
  content: { flex: 1 },
  contentContainer: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 28, fontWeight: '900', color: ui.text, lineHeight: 34 },
  provider: { fontSize: 15, color: ui.textSecondary, marginTop: 6 },
  statusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  badge: { backgroundColor: '#EFF6FF', borderRadius: radius.full, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { color: ui.primary, fontWeight: '800', fontSize: 12, textTransform: 'capitalize' },
  detailsCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 18, ...shadow.card },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: ui.border },
  detailLabel: { fontSize: 14, color: ui.textSecondary },
  detailValue: { fontSize: 14, color: ui.text, fontWeight: '800', flexShrink: 1, textAlign: 'right' },
  description: { marginTop: 16, fontSize: 15, color: ui.textSecondary, lineHeight: 22 },
  sectionCard: { backgroundColor: colors.white, borderRadius: radius.lg, padding: 16, marginTop: 16, ...shadow.card },
  sectionTitle: { fontSize: 17, fontWeight: '900', color: ui.text, marginBottom: 10 },
  bullet: { fontSize: 14, color: ui.textSecondary, lineHeight: 21, marginBottom: 4 },
  helperText: { fontSize: 13, color: ui.textSecondary, lineHeight: 19, marginBottom: 8 },
  progressText: { fontSize: 14, color: ui.text, fontWeight: '800', marginBottom: 10 },
  taskRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: ui.border },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: ui.primary, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkboxDone: { backgroundColor: ui.primary },
  checkboxText: { color: colors.white, fontWeight: '900' },
  taskBody: { flex: 1 },
  taskTitle: { fontSize: 15, fontWeight: '800', color: ui.text },
  taskTitleDone: { textDecorationLine: 'line-through', color: ui.textSecondary },
  taskDescription: { fontSize: 13, color: ui.textSecondary, lineHeight: 18, marginTop: 3 },
  taskMeta: { fontSize: 12, color: ui.textSecondary, marginTop: 6, textTransform: 'capitalize' },
  actionsSection: { marginTop: 20, gap: 12 },
  primaryButton: { backgroundColor: ui.primary, paddingVertical: 15, borderRadius: radius.md, alignItems: 'center' },
  primaryButtonText: { color: colors.white, fontSize: 16, fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: ui.primary, paddingVertical: 15, borderRadius: radius.md, alignItems: 'center' },
  secondaryButtonText: { color: ui.primary, fontSize: 16, fontWeight: '900' },
})
