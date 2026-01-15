import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'
import {
  listApplications,
  getStatusInfo,
  formatDate,
  getDaysUntilDeadline,
  Application,
  ApplicationStatus,
  APPLICATION_STATUSES,
} from '../../src/data/applications'

type FilterStatus = 'all' | ApplicationStatus

export default function ApplicationsListScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [applications, setApplications] = useState<Application[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterStatus>('all')

  // Tap guards for navigation
  const guardedBack = useTapGuard(() => safeBack('dashboard'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchApplications = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await listApplications(user.id)
      setApplications(data)
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchApplications()
    setRefreshing(false)
  }

  const filteredApplications = filter === 'all'
    ? applications
    : applications.filter(app => app.status === filter)

  const handleAddApplication = () => {
    router.push('/(modals)/application-new')
  }

  const handleOpenApplication = (id: string) => {
    router.push(`/applications/${id}`)
  }

  const renderDeadlineBadge = (deadline: string | null) => {
    const days = getDaysUntilDeadline(deadline)
    if (days === null) return null

    let badgeColor = ui.textMuted
    let badgeText = `${days} days`

    if (days < 0) {
      badgeColor = colors.error
      badgeText = 'Past due'
    } else if (days === 0) {
      badgeColor = colors.error
      badgeText = 'Today!'
    } else if (days <= 7) {
      badgeColor = colors.warning
      badgeText = `${days} days`
    } else if (days <= 30) {
      badgeColor = ui.primary
    }

    return (
      <View style={[styles.deadlineBadge, { backgroundColor: `${badgeColor}15` }]}>
        <Ionicons name="calendar-outline" size={12} color={badgeColor} />
        <Text style={[styles.deadlineBadgeText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Applications',
            headerLeft: () => (
              <TouchableOpacity onPress={guardedBack} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color={ui.headerText} />
              </TouchableOpacity>
            ),
            headerRight: () => (
              <TouchableOpacity onPress={guardedHome} style={styles.headerButton}>
                <Ionicons name="home" size={24} color={ui.primary} />
              </TouchableOpacity>
            ),
          }}
        />
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading applications...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Applications',
          headerLeft: () => (
            <TouchableOpacity onPress={guardedBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={ui.headerText} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={guardedHome} style={styles.headerButton}>
              <Ionicons name="home" size={24} color={ui.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterChipText, filter === 'all' && styles.filterChipTextActive]}>
            All ({applications.length})
          </Text>
        </TouchableOpacity>
        {APPLICATION_STATUSES.map(status => {
          const count = applications.filter(a => a.status === status.value).length
          if (count === 0) return null
          return (
            <TouchableOpacity
              key={status.value}
              style={[
                styles.filterChip,
                filter === status.value && styles.filterChipActive,
              ]}
              onPress={() => setFilter(status.value)}
            >
              <View style={[styles.statusDot, { backgroundColor: status.color }]} />
              <Text
                style={[
                  styles.filterChipText,
                  filter === status.value && styles.filterChipTextActive,
                ]}
              >
                {status.label} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Applications List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredApplications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="school-outline" size={64} color={ui.textMuted} />
            <Text style={styles.emptyTitle}>
              {filter === 'all' ? 'No applications yet' : `No ${filter.replace('_', ' ')} applications`}
            </Text>
            <Text style={styles.emptyText}>
              {filter === 'all'
                ? 'Start tracking your college and scholarship applications'
                : 'Try a different filter or add new applications'}
            </Text>
            {filter === 'all' && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleAddApplication}>
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.emptyButtonText}>Add Application</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredApplications.map(app => {
            const statusInfo = getStatusInfo(app.status)
            return (
              <TouchableOpacity
                key={app.id}
                style={styles.applicationCard}
                onPress={() => handleOpenApplication(app.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.collegeName} numberOfLines={1}>
                    {app.college_name}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: `${statusInfo.color}20` }]}>
                    <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                      {statusInfo.label}
                    </Text>
                  </View>
                </View>

                {app.program_name && (
                  <Text style={styles.programName} numberOfLines={1}>
                    {app.program_name}
                  </Text>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.cardMeta}>
                    {app.deadline && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={ui.textSecondary} />
                        <Text style={styles.metaText}>Due: {formatDate(app.deadline)}</Text>
                      </View>
                    )}
                    {app.date_applied && (
                      <View style={styles.metaItem}>
                        <Ionicons name="checkmark-circle-outline" size={14} color={ui.textSecondary} />
                        <Text style={styles.metaText}>Applied: {formatDate(app.date_applied)}</Text>
                      </View>
                    )}
                  </View>
                  {renderDeadlineBadge(app.deadline)}
                </View>

                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={ui.textMuted}
                  style={styles.cardChevron}
                />
              </TouchableOpacity>
            )
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddApplication} activeOpacity={0.8}>
        <Ionicons name="add" size={28} color={colors.white} />
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  headerButton: {
    padding: 8,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  filterContainer: {
    maxHeight: 56,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  filterContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    flexDirection: 'row',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: ui.primary,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  listContainer: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 24,
    gap: 8,
  },
  emptyButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  applicationCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  collegeName: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: ui.text,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  programName: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  cardMeta: {
    flex: 1,
    gap: 4,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  deadlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    gap: 4,
  },
  deadlineBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardChevron: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.soft,
  },
})
