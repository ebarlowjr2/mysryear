import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import {
  getActiveStudentProfile,
  getCurrentProfile,
  type AccountProfile,
} from '../../src/data/identity'
import { listLifePathCareerIds } from '../../src/data/lifepath'
import { colors, radius, shadow, ui } from '../../src/theme'

function isFamilyRole(role: AccountProfile['role']) {
  return role === 'parent' || role === 'guardian'
}

function lifePathCta(role: AccountProfile['role'], hasCareers: boolean) {
  if (isFamilyRole(role)) return 'Open LifePath Options'
  if (role === 'counselor') return 'Open Linked Student LifePath'
  return hasCareers ? 'Open LifePath Dashboard' : 'Start LifePath'
}

function lifePathDescription(role: AccountProfile['role']) {
  if (isFamilyRole(role)) {
    return 'Review your student’s official LifePath or try a separate Parent Simulation.'
  }
  if (role === 'counselor') return 'Review approved student pathways in a read-only support view.'
  return 'Compare career paths, cost, debt risk, and Career Health.'
}

export default function AuraScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [hasCareers, setHasCareers] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    const [account, activeStudent] = await Promise.all([
      getCurrentProfile(user.id),
      getActiveStudentProfile(user.id),
    ])
    setProfile(account)
    if (account?.role === 'business') {
      setLoading(false)
      router.replace('/' as never)
      return
    }
    setHasCareers(
      activeStudent?.id ? (await listLifePathCareerIds(activeStudent.id)).length > 0 : false,
    )
    setLoading(false)
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading) void load()
  }, [sessionLoading, load])

  if (sessionLoading || loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>A.U.R.A</Text>
      <Text style={styles.title}>Planning modules for what comes next.</Text>
      <Text style={styles.subtitle}>
        Start with LifePath today. More guided planning tools are coming soon.
      </Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/aura/lifepath' as never)}>
        <View style={styles.iconWrap}>
          <Ionicons name="map-outline" size={24} color={ui.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>A.U.R.A LifePath</Text>
          <Text style={styles.cardText}>{lifePathDescription(profile?.role || null)}</Text>
          <Text style={styles.cardAction}>{lifePathCta(profile?.role || null, hasCareers)}</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.card, styles.disabledCard]}>
        <View style={styles.iconWrap}>
          <Ionicons name="chatbubbles-outline" size={24} color={ui.textSecondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>A.U.R.A Guidance Counselor</Text>
          <Text style={styles.cardText}>Guided school and career conversations.</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>
      </View>
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
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: {
    color: ui.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 18,
  },
  card: {
    flexDirection: 'row',
    gap: 14,
    backgroundColor: ui.card,
    borderColor: ui.cardBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 14,
    ...shadow.card,
  },
  disabledCard: { opacity: 0.7 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
  cardText: { color: ui.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  cardAction: { color: ui.primary, fontWeight: '800', marginTop: 10 },
  comingSoon: { color: ui.textMuted, fontWeight: '700', marginTop: 10 },
})
