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
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { getActiveStudentProfile, getCurrentProfile } from '../../../src/data/identity'
import {
  listStudentLifePathRecommendations,
  respondToLifePathRecommendation,
  type StudentLifePathRecommendation,
} from '../../../src/data/lifepath'
import { useSession } from '../../../src/hooks/useSession'
import { colors, radius, shadow, ui } from '../../../src/theme'

function money(value: number) {
  return `$${Math.round(value).toLocaleString()}`
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : 'recently'
}

export default function LifePathRecommendationsScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [items, setItems] = useState<StudentLifePathRecommendation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    setError(null)
    const profile = await getCurrentProfile(user.id)
    if (profile?.role !== 'student') {
      setLoading(false)
      router.replace('/aura/lifepath' as never)
      return
    }
    const active = await getActiveStudentProfile(user.id)
    if (!active?.id) {
      setItems([])
      setError('Select or create your student profile before viewing recommendations.')
      setLoading(false)
      return
    }
    const result = await listStudentLifePathRecommendations(active.id)
    setItems(result.recommendations)
    setError(result.error)
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [load, sessionLoading])

  async function respond(shareId: string, response: 'acknowledged' | 'dismissed') {
    const result = await respondToLifePathRecommendation(shareId, response)
    if (!result.success) {
      Alert.alert('Could not update recommendation', result.error || 'Please try again.')
      return
    }
    await load()
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        style={styles.backLink}
        onPress={() =>
          router.canGoBack() ? router.back() : router.push('/aura/lifepath' as never)
        }
      >
        <Ionicons name="chevron-back" size={18} color={ui.primary} />
        <Text style={styles.backText}>Back to LifePath</Text>
      </TouchableOpacity>
      <Text style={styles.kicker}>Student Inbox</Text>
      <Text style={styles.title}>Parent Recommendations</Text>
      <Text style={styles.subtitle}>
        Read-only simulations shared by your parent or guardian. Acknowledge or dismiss without
        changing your official LifePath.
      </Text>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      {!items.length ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>No shared recommendations yet</Text>
          <Text style={styles.cardText}>
            When a parent shares a completed simulation, it appears here. Revoked recommendations
            are removed automatically.
          </Text>
        </View>
      ) : null}

      {items.map((item) => {
        const results = item.simulation?.results
        return (
          <View key={item.id} style={styles.card}>
            <View style={styles.rowBetween}>
              <View style={{ flex: 1 }}>
                <Text style={styles.badge}>Parent-created recommendation</Text>
                <Text style={styles.cardTitle}>
                  {item.simulation?.title || 'Parent Simulation'}
                </Text>
                <Text style={styles.cardText}>
                  Shared by {item.parent_name} on {formatDate(item.shared_at)}
                </Text>
              </View>
              <Text style={styles.status}>{item.status}</Text>
            </View>
            {item.message ? <Text style={styles.message}>“{item.message}”</Text> : null}

            {results ? (
              <View style={styles.resultsBox}>
                <Text style={styles.resultText}>
                  Average Career Health: {results.averageCareerHealthScore}/100
                </Text>
                <Text style={styles.resultText}>
                  Estimated cost: {money(results.totalEstimatedCost)}
                </Text>
                <Text style={styles.resultText}>
                  Estimated debt: {money(results.totalEstimatedDebt)}
                </Text>
                {results.results.map((career) => (
                  <View key={career.careerId} style={styles.careerBox}>
                    <Text style={styles.careerTitle}>{career.careerTitle}</Text>
                    <Text style={styles.meta}>
                      Health {career.careerHealthScore}/100 • Debt {money(career.estimatedDebt)}
                    </Text>
                    <Text style={styles.meta}>
                      Salary {money(career.entrySalaryMin)}-{money(career.entrySalaryMax)} • Cost{' '}
                      {money(career.estimatedCost)}
                    </Text>
                    <Text style={styles.explanation}>{career.explanation}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.warning}>
                This recommendation no longer has readable details. It may have been revoked or
                archived.
              </Text>
            )}

            <View style={styles.actions}>
              {item.status !== 'acknowledged' ? (
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={() => void respond(item.id, 'acknowledged')}
                >
                  <Text style={styles.primaryButtonText}>Acknowledge</Text>
                </TouchableOpacity>
              ) : null}
              {item.status !== 'dismissed' ? (
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => void respond(item.id, 'dismissed')}
                >
                  <Text style={styles.secondaryButtonText}>Dismiss</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        )
      })}

      <TouchableOpacity style={styles.exitButton} onPress={() => router.push('/aura' as never)}>
        <Text style={styles.secondaryButtonText}>Exit to A.U.R.A</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.background,
  },
  backLink: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 14 },
  backText: { color: ui.primary, fontWeight: '800' },
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: {
    color: ui.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 14,
  },
  card: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    ...shadow.card,
  },
  rowBetween: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  badge: { color: ui.primary, fontSize: 12, fontWeight: '900' },
  status: { color: ui.primary, fontSize: 12, fontWeight: '900', textTransform: 'capitalize' },
  cardTitle: { color: ui.text, fontSize: 20, fontWeight: '900', marginTop: 4 },
  cardText: { color: ui.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  message: {
    color: ui.text,
    backgroundColor: ui.primaryLight,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 12,
    fontWeight: '700',
  },
  resultsBox: { marginTop: 12, gap: 8 },
  resultText: { color: ui.text, fontWeight: '800' },
  careerBox: {
    borderWidth: 1,
    borderColor: ui.border,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
  },
  careerTitle: { color: ui.text, fontWeight: '900' },
  meta: { color: ui.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 4 },
  explanation: { color: ui.textSecondary, fontSize: 12, lineHeight: 18, marginTop: 6 },
  warning: { color: colors.warning, marginTop: 12, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  primaryButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: 140,
  },
  primaryButtonText: { color: colors.white, fontWeight: '800' },
  secondaryButton: {
    borderColor: ui.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    minWidth: 140,
  },
  secondaryButtonText: { color: ui.primary, fontWeight: '800' },
  exitButton: {
    borderColor: ui.primary,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: 13,
    alignItems: 'center',
    marginTop: 18,
  },
  errorText: { color: colors.error, marginTop: 12, textAlign: 'center' },
})
