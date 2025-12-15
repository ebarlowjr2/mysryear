import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator } from 'react-native'
import { useSession } from '../../src/hooks/useSession'
import { getDashboardMetrics, getNextDeadline, DashboardMetrics, NextDeadline } from '../../src/data/dashboard'

export default function DashboardScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [nextDeadline, setNextDeadline] = useState<NextDeadline>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async () => {
    if (!user?.id) return

    try {
      setError(null)
      const [metricsData, deadlineData] = await Promise.all([
        getDashboardMetrics(user.id),
        getNextDeadline(user.id)
      ])
      setMetrics(metricsData)
      setNextDeadline(deadlineData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (!sessionLoading && user?.id) {
      fetchData()
    }
  }, [sessionLoading, user?.id, fetchData])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchData()
  }, [fetchData])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    )
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <Text style={styles.retryText} onPress={onRefresh}>Tap to retry</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#3b82f6"
          colors={['#3b82f6']}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{metrics?.scholarshipsCount ?? 0}</Text>
          <Text style={styles.statLabel}>Scholarships</Text>
          <Text style={styles.statDesc}>available</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{metrics?.upcomingDeadlines ?? 0}</Text>
          <Text style={styles.statLabel}>Deadlines</Text>
          <Text style={styles.statDesc}>upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{metrics?.pendingTasks ?? 0}</Text>
          <Text style={styles.statLabel}>Tasks</Text>
          <Text style={styles.statDesc}>pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{metrics?.completedTasks ?? 0}</Text>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statDesc}>tasks</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Next Deadline</Text>
        {nextDeadline ? (
          <View style={styles.deadlineCard}>
            <View style={styles.deadlineHeader}>
              <Text style={styles.deadlineTitle}>{nextDeadline.title}</Text>
              <Text style={styles.deadlineDate}>{formatDate(nextDeadline.dueDate)}</Text>
            </View>
            <Text style={styles.deadlineCategory}>{nextDeadline.category}</Text>
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>No upcoming deadlines</Text>
            <Text style={styles.emptySubtext}>Add tasks in the Planner to see them here</Text>
          </View>
        )}
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    textAlign: 'center',
  },
  retryText: {
    color: '#3b82f6',
    fontSize: 16,
    marginTop: 12,
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  statDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  deadlineCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  deadlineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  deadlineTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  deadlineDate: {
    fontSize: 14,
    color: '#3b82f6',
    fontWeight: '600',
  },
  deadlineCategory: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 8,
  },
  emptyCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
  },
  emptySubtext: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
})
