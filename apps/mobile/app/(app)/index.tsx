import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { getDashboardMetrics, getNextDeadline, DashboardMetrics, NextDeadline } from '../../src/data/dashboard'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function DashboardScreen() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [nextDeadline, setNextDeadline] = useState<NextDeadline>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (userId: string) => {
    try {
      setError(null)
      const [metricsData, deadlineData] = await Promise.all([
        getDashboardMetrics(userId),
        getNextDeadline(userId)
      ])
      setMetrics(metricsData)
      setNextDeadline(deadlineData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    fetchData(user.id)
  }, [sessionLoading, user?.id, fetchData])

  const onRefresh = useCallback(() => {
    if (!user?.id) return
    setRefreshing(true)
    fetchData(user.id)
  }, [fetchData, user?.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.retryText}>Tap to retry</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ui.primary}
          colors={[ui.primary]}
        />
      }
    >
      <View style={styles.hero}>
        <Text style={styles.badge}>Built for Students & Parents</Text>
        <Text style={styles.heroTitle}>Your senior year, organized and stress-less.</Text>
        <Text style={styles.heroSubtitle}>
          Manage applications, track scholarships, and plan life after high school.
        </Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Next Deadline</Text>
          <Text style={styles.statValue}>
            {nextDeadline ? nextDeadline.title.substring(0, 20) + (nextDeadline.title.length > 20 ? '...' : '') : 'None'}
          </Text>
          <Text style={styles.statDesc}>
            {nextDeadline ? formatDate(nextDeadline.dueDate) : 'Add tasks to see deadlines'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Scholarships</Text>
          <Text style={styles.statValue}>{metrics?.scholarshipsCount ?? 0} available</Text>
          <Text style={styles.statDesc}>Filtered by your profile</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Tasks</Text>
          <Text style={styles.statValue}>{metrics?.pendingTasks ?? 0} pending</Text>
          <Text style={styles.statDesc}>{metrics?.completedTasks ?? 0} completed</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Deadlines</Text>
          <Text style={styles.statValue}>{metrics?.upcomingDeadlines ?? 0} upcoming</Text>
          <Text style={styles.statDesc}>This month</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything in one place</Text>
        <Text style={styles.sectionSubtitle}>Replace sticky notes and scattered tabs with a simple dashboard.</Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => router.push('/(app)/scholarships')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="school-outline" size={24} color={ui.primary} />
            </View>
            <Text style={styles.featureTitle}>Scholarship Finder</Text>
            <Text style={styles.featureDesc}>Curated sources with filters for GPA, state, major, and deadlines.</Text>
            <Text style={styles.featureLink}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => router.push('/(app)/planner')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={24} color={ui.primary} />
            </View>
            <Text style={styles.featureTitle}>Senior Year Timeline</Text>
            <Text style={styles.featureDesc}>Milestones you can customize for your state and goals.</Text>
            <Text style={styles.featureLink}>Open</Text>
          </TouchableOpacity>

          <View style={[styles.featureCard, styles.featureCardDisabled]}>
            <View style={styles.featureIcon}>
              <Ionicons name="document-text-outline" size={24} color={ui.textMuted} />
            </View>
            <Text style={[styles.featureTitle, styles.featureTextDisabled]}>Application Tracker</Text>
            <Text style={styles.featureDesc}>Track each school with tasks, essays, and documents.</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </View>

          <View style={[styles.featureCard, styles.featureCardDisabled]}>
            <View style={styles.featureIcon}>
              <Ionicons name="folder-outline" size={24} color={ui.textMuted} />
            </View>
            <Text style={[styles.featureTitle, styles.featureTextDisabled]}>Essay & Resume Vault</Text>
            <Text style={styles.featureDesc}>Keep drafts, feedback, and activity lists tidy.</Text>
            <Text style={styles.comingSoon}>Coming Soon</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: colors.error,
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    color: ui.primary,
    fontSize: 16,
    marginTop: 12,
    fontWeight: '600',
  },
  hero: {
    padding: 24,
    paddingTop: 16,
  },
  badge: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.primaryText,
    backgroundColor: ui.primaryLight,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: 12,
    overflow: 'hidden',
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    lineHeight: 36,
  },
  heroSubtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 8,
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: ui.text,
  },
  statDesc: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 2,
  },
  section: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ui.text,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
    marginBottom: 20,
  },
  featureGrid: {
    gap: 12,
  },
  featureCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  featureCardDisabled: {
    opacity: 0.7,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  featureTextDisabled: {
    color: ui.textMuted,
  },
  featureDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    lineHeight: 20,
  },
  featureLink: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.primary,
    marginTop: 12,
  },
  comingSoon: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textMuted,
    marginTop: 12,
  },
})
