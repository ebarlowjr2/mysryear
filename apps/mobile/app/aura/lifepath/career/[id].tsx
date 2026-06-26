import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { scoreCareerHealth } from '@mysryear/shared'
import { useSession } from '../../../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../../../src/data/identity'
import { formatCurrencyRange, getCareerById, listLifePathTasks, updateLifePathTaskStatus, type LifePathTask } from '../../../../src/data/lifepath'
import { listStudentDocuments, type UploadedFile } from '../../../../src/data/academic'
import { colors, radius, shadow, ui } from '../../../../src/theme'

export default function LifePathCareerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [tasks, setTasks] = useState<LifePathTask[]>([])
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [loading, setLoading] = useState(true)

  const career = id ? getCareerById(id) : null
  const health = career ? scoreCareerHealth(career, 'baseline') : null

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const active = await getActiveStudentProfile(user.id)
    setStudentProfile(active)
    if (active?.id) {
      const [taskRows, fileRows] = await Promise.all([listLifePathTasks(active.id, id), listStudentDocuments(active.id)])
      setTasks(taskRows)
      setFiles(fileRows.filter((file) => ['lifepath_certification', 'portfolio_activity', 'portfolio_achievement', 'portfolio_service_hours'].includes(file.upload_context || '')))
    }
    setLoading(false)
  }, [user?.id, id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  async function toggleTask(task: LifePathTask) {
    const next = task.status === 'done' ? 'todo' : 'done'
    const result = await updateLifePathTaskStatus(task.id, next)
    if (!result.success) Alert.alert('Could not update task', result.error || 'Please try again.')
    else await load()
  }

  if (sessionLoading || loading) return <View style={styles.center}><ActivityIndicator size="large" color={ui.primary} /></View>
  if (!career || !health) return <View style={styles.center}><Text style={styles.title}>Career not found</Text></View>

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>{career.category}</Text>
      <Text style={styles.title}>{career.title}</Text>
      <Text style={styles.subtitle}>{career.description}</Text>

      <View style={styles.scoreCard}>
        <Text style={styles.scoreLabel}>Career Health</Text>
        <Text style={styles.score}>{health.score}</Text>
        <Text style={styles.scoreLabel}>{health.label}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Cost + Debt</Text>
        <Text style={styles.meta}>Estimated cost: {formatCurrencyRange(health.adjustedCostMin, health.adjustedCostMax)}</Text>
        <Text style={styles.meta}>Starting salary: {formatCurrencyRange(career.startingSalaryMin, career.startingSalaryMax)}</Text>
        <Text style={styles.meta}>Timeline: {health.adjustedTimelineYears} years</Text>
        <Text style={styles.meta}>Debt risk: {health.debtRisk}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pathway Checklist</Text>
        {career.milestones.map((milestone) => (
          <View key={`${milestone.stage}-${milestone.title}`} style={styles.milestone}>
            <Text style={styles.stage}>{milestone.stage}</Text>
            <Text style={styles.itemTitle}>{milestone.title}</Text>
            <Text style={styles.itemText}>{milestone.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommended Certifications/Courses</Text>
        {(career.certifications || ['No specific certifications listed yet.']).map((cert) => <Text key={cert} style={styles.bullet}>- {cert}</Text>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>LifePath Tasks</Text>
        {tasks.length === 0 ? <Text style={styles.itemText}>No saved LifePath tasks yet.</Text> : tasks.map((task) => (
          <TouchableOpacity key={task.id} style={styles.taskRow} onPress={() => toggleTask(task)}>
            <Ionicons name={task.status === 'done' ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={task.status === 'done' ? colors.success : ui.textSecondary} />
            <View style={{ flex: 1 }}><Text style={styles.itemTitle}>{task.title}</Text>{task.description ? <Text style={styles.itemText}>{task.description}</Text> : null}{task.uploaded_files?.file_name ? <Text style={styles.proofText}>Proof: {task.uploaded_files.file_name}</Text> : null}</View>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Recommendations</Text>
        {career.recommendations.map((rec) => <Text key={rec} style={styles.bullet}>- {rec}</Text>)}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Parent Action Items</Text>
        <Text style={styles.bullet}>- Review cost and debt risk together.</Text>
        <Text style={styles.bullet}>- Help identify local mentors, clubs, or internships.</Text>
        <Text style={styles.bullet}>- Upload proof files for certificates, awards, or job shadowing.</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Related Uploads / Proof</Text>
        {files.length === 0 ? <Text style={styles.itemText}>No related LifePath proof files yet.</Text> : files.slice(0, 5).map((file) => <Text key={file.id} style={styles.bullet}>- {file.file_name}</Text>)}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: ui.background },
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: ui.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 14 },
  scoreCard: { backgroundColor: ui.primary, borderRadius: radius.lg, padding: 18, alignItems: 'center', marginBottom: 14, ...shadow.card },
  scoreLabel: { color: colors.white, fontWeight: '800' },
  score: { color: colors.white, fontSize: 44, fontWeight: '900', marginVertical: 4 },
  card: { backgroundColor: ui.card, borderColor: ui.cardBorder, borderWidth: 1, borderRadius: radius.lg, padding: 16, marginBottom: 14, ...shadow.card },
  cardTitle: { color: ui.text, fontWeight: '900', fontSize: 18, marginBottom: 10 },
  meta: { color: ui.textSecondary, fontSize: 14, marginTop: 5, fontWeight: '600' },
  milestone: { borderTopColor: ui.border, borderTopWidth: 1, paddingTop: 12, marginTop: 12 },
  stage: { color: ui.primary, fontSize: 12, fontWeight: '800' },
  itemTitle: { color: ui.text, fontWeight: '800', marginTop: 2 },
  itemText: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 3 },
  bullet: { color: ui.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 4 },
  taskRow: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderTopWidth: 1, borderTopColor: ui.border, paddingTop: 12, marginTop: 12 },
  proofText: { color: ui.primary, fontSize: 12, fontWeight: '700', marginTop: 5 },
})
