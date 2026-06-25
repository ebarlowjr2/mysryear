import React, { useCallback, useEffect, useState } from 'react'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../../src/hooks/useSession'
import { getActiveStudentProfile, type StudentProfile } from '../../../src/data/identity'
import { averageCareerHealth, formatCurrencyRange, listSelectedLifePathCareers, nextLifePathAction, type SelectedCareer } from '../../../src/data/lifepath'
import { colors, radius, shadow, ui } from '../../../src/theme'

function riskColor(risk: string) {
  if (risk === 'low') return colors.success
  if (risk === 'medium') return colors.warning
  return colors.error
}

export default function LifePathScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null)
  const [careers, setCareers] = useState<SelectedCareer[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const active = await getActiveStudentProfile(user.id)
    setStudentProfile(active)
    setCareers(active?.id ? await listSelectedLifePathCareers(active.id) : [])
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  if (sessionLoading || loading) return <View style={styles.center}><ActivityIndicator size="large" color={ui.primary} /></View>

  if (!studentProfile?.id) {
    return <View style={styles.center}><Text style={styles.title}>A.U.R.A LifePath</Text><Text style={styles.subtitle}>Create or select an active student profile first.</Text></View>
  }

  if (!careers.length) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.kicker}>A.U.R.A LifePath</Text>
        <Text style={styles.title}>Map your future before senior year.</Text>
        <Text style={styles.subtitle}>Choose up to five career interests and compare timeline, cost, debt risk, and Career Health.</Text>
        <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/aura/lifepath/select' as never)}>
          <Text style={styles.primaryButtonText}>Start My LifePath</Text>
        </TouchableOpacity>
      </ScrollView>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>A.U.R.A LifePath</Text>
      <Text style={styles.title}>LifePath Dashboard</Text>
      <Text style={styles.subtitle}>{careers.length} selected careers • Avg Career Health {averageCareerHealth(careers)}%</Text>
      <Text style={styles.nextAction}>{nextLifePathAction(careers)}</Text>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/aura/lifepath/select' as never)}>
        <Text style={styles.secondaryButtonText}>Edit Career Choices</Text>
      </TouchableOpacity>

      {careers.map((career) => (
        <View key={career.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.category}>{career.category}</Text>
              <Text style={styles.cardTitle}>{career.title}</Text>
            </View>
            <View style={styles.scorePill}><Text style={styles.scoreText}>{career.health.score}</Text></View>
          </View>
          <View style={styles.metaGrid}>
            <Text style={styles.meta}>Salary: {formatCurrencyRange(career.startingSalaryMin, career.startingSalaryMax)}</Text>
            <Text style={styles.meta}>Cost: {formatCurrencyRange(career.estimatedCostMin, career.estimatedCostMax)}</Text>
            <Text style={[styles.meta, { color: riskColor(career.debtRisk) }]}>Debt risk: {career.debtRisk}</Text>
            {career.certifications?.length ? <Text style={styles.meta}>Certification friendly</Text> : null}
          </View>
          <TouchableOpacity style={styles.primaryButtonSmall} onPress={() => router.push(`/aura/lifepath/career/${career.id}` as never)}>
            <Text style={styles.primaryButtonText}>View Path</Text>
          </TouchableOpacity>
        </View>
      ))}
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
  nextAction: { color: ui.text, backgroundColor: ui.primaryLight, padding: 12, borderRadius: radius.md, marginBottom: 12, fontWeight: '700' },
  primaryButton: { backgroundColor: ui.primary, borderRadius: radius.md, padding: 15, alignItems: 'center', marginTop: 8 },
  primaryButtonSmall: { backgroundColor: ui.primary, borderRadius: radius.md, padding: 12, alignItems: 'center', marginTop: 14 },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  secondaryButton: { borderColor: ui.primary, borderWidth: 1, borderRadius: radius.md, padding: 13, alignItems: 'center', marginBottom: 14 },
  secondaryButtonText: { color: ui.primary, fontWeight: '800' },
  card: { backgroundColor: ui.card, borderWidth: 1, borderColor: ui.cardBorder, borderRadius: radius.lg, padding: 16, marginTop: 14, ...shadow.card },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  category: { color: ui.textSecondary, fontSize: 12, fontWeight: '700' },
  cardTitle: { color: ui.text, fontSize: 20, fontWeight: '900', marginTop: 2 },
  scorePill: { width: 52, height: 52, borderRadius: 26, backgroundColor: ui.primaryLight, alignItems: 'center', justifyContent: 'center' },
  scoreText: { color: ui.primary, fontSize: 20, fontWeight: '900' },
  metaGrid: { marginTop: 12, gap: 5 },
  meta: { color: ui.textSecondary, fontSize: 13, fontWeight: '600' },
})
