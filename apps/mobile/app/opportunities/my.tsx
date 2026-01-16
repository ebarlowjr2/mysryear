import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native'
import { useRouter, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'
import {
  listMyOpportunities,
  deleteOpportunity,
  getTypeInfo,
  formatDate,
  Opportunity,
} from '../../src/data/opportunities'

export default function MyOpportunitiesScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Tap guards for navigation
  const guardedBack = useTapGuard(() => safeBack('profile'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchOpportunities = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await listMyOpportunities(user.id)
      setOpportunities(data)
    } catch (error) {
      console.error('Failed to fetch my opportunities:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchOpportunities()
  }, [fetchOpportunities])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchOpportunities()
    setRefreshing(false)
  }

  const handleAddOpportunity = () => {
    router.push('/(modals)/opportunity-new')
  }

  const handleEditOpportunity = (id: string) => {
    router.push(`/(modals)/opportunity-edit/${id}`)
  }

  const handleDeleteOpportunity = (opp: Opportunity) => {
    Alert.alert(
      'Delete Opportunity',
      `Are you sure you want to delete "${opp.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteOpportunity(opp.id)
              setOpportunities(prev => prev.filter(o => o.id !== opp.id))
            } catch (error) {
              console.error('Failed to delete opportunity:', error)
              Alert.alert('Error', 'Failed to delete opportunity')
            }
          },
        },
      ]
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'My Opportunities',
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
        <Text style={styles.loadingText}>Loading your opportunities...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'My Opportunities',
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

      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {opportunities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={32} color={ui.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No opportunities yet</Text>
            <Text style={styles.emptyText}>
              Create internships, webinars, or events to reach students in your area
            </Text>
            <TouchableOpacity style={styles.emptyButton} onPress={handleAddOpportunity}>
              <Ionicons name="add" size={20} color={colors.white} />
              <Text style={styles.emptyButtonText}>Create Opportunity</Text>
            </TouchableOpacity>
          </View>
        ) : (
          opportunities.map(opp => {
            const typeInfo = getTypeInfo(opp.type)
            return (
              <View key={opp.id} style={styles.opportunityCard}>
                <TouchableOpacity
                  style={styles.cardContent}
                  onPress={() => handleEditOpportunity(opp.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardHeader}>
                    <Text style={styles.opportunityTitle} numberOfLines={2}>
                      {opp.title}
                    </Text>
                    <View style={styles.statusContainer}>
                      <View style={[styles.typePill, { backgroundColor: `${typeInfo.color}20` }]}>
                        <Text style={[styles.typePillText, { color: typeInfo.color }]}>
                          {typeInfo.label}
                        </Text>
                      </View>
                      <View style={[
                        styles.publishedPill,
                        { backgroundColor: opp.is_published ? '#22c55e20' : '#94a3b820' }
                      ]}>
                        <Text style={[
                          styles.publishedPillText,
                          { color: opp.is_published ? '#22c55e' : '#94a3b8' }
                        ]}>
                          {opp.is_published ? 'Published' : 'Draft'}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {opp.org_name && (
                    <Text style={styles.orgName} numberOfLines={1}>
                      {opp.org_name}
                    </Text>
                  )}

                  <View style={styles.cardMeta}>
                    {opp.deadline && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={ui.textSecondary} />
                        <Text style={styles.metaText}>Deadline: {formatDate(opp.deadline)}</Text>
                      </View>
                    )}
                    {opp.location_mode && (
                      <View style={styles.metaItem}>
                        <Ionicons name="location-outline" size={14} color={ui.textSecondary} />
                        <Text style={styles.metaText}>
                          {opp.location_mode.charAt(0).toUpperCase() + opp.location_mode.slice(1)}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleEditOpportunity(opp.id)}
                  >
                    <Ionicons name="pencil-outline" size={20} color={ui.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleDeleteOpportunity(opp)}
                  >
                    <Ionicons name="trash-outline" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            )
          })
        )}
      </ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handleAddOpportunity} activeOpacity={0.8}>
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
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  emptyText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 32,
    lineHeight: 20,
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
  opportunityCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    overflow: 'hidden',
    ...shadow.card,
  },
  cardContent: {
    padding: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  opportunityTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: ui.text,
  },
  statusContainer: {
    flexDirection: 'column',
    gap: 4,
    alignItems: 'flex-end',
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  publishedPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  publishedPillText: {
    fontSize: 10,
    fontWeight: '600',
  },
  orgName: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  cardMeta: {
    marginTop: 12,
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
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
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
