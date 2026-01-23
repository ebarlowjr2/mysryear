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
import { getProfile, Profile } from '../../src/data/profile'
import {
  listOpportunitiesWithOwnerStatus,
  getTypeInfo,
  formatDate,
  getDaysUntilDeadline,
  OpportunityWithOwner,
  OpportunityType,
  OPPORTUNITY_TYPES,
} from '../../src/data/opportunities'
import { getTrackedOpportunityIds } from '../../src/data/tracking'

type FilterType = 'all' | OpportunityType
type LocationFilter = 'for_you' | 'remote' | 'my_county'
type TabFilter = 'for_you' | 'tracked'

export default function OpportunitiesListScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [opportunities, setOpportunities] = useState<OpportunityWithOwner[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [typeFilter, setTypeFilter] = useState<FilterType>('all')
  const [locationFilter, setLocationFilter] = useState<LocationFilter>('for_you')
  // Sprint 14: Tab state for For You vs Tracked
  const [activeTab, setActiveTab] = useState<TabFilter>('for_you')
  const [trackedOpportunityIds, setTrackedOpportunityIds] = useState<string[]>([])

  // Tap guards for navigation
  const guardedBack = useTapGuard(() => safeBack('dashboard'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchData = useCallback(async () => {
    if (!user?.id) return
    try {
      const userProfile = await getProfile(user.id)
      setProfile(userProfile)
      // Sprint 10: Use new function that includes owner verification status
      const data = await listOpportunitiesWithOwnerStatus(userProfile)
      setOpportunities(data)
      
      // Sprint 14: Fetch tracked opportunity IDs
      const trackedIds = await getTrackedOpportunityIds()
      setTrackedOpportunityIds(trackedIds)
    } catch (error) {
      console.error('Failed to fetch opportunities:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchData()
    setRefreshing(false)
  }

  // Sprint 14: Filter by tracked tab first
  let filteredOpportunities = activeTab === 'tracked'
    ? opportunities.filter(opp => trackedOpportunityIds.includes(opp.id))
    : opportunities

  // Filter by type
  filteredOpportunities = typeFilter === 'all'
    ? filteredOpportunities
    : filteredOpportunities.filter(opp => opp.type === typeFilter)

  // Filter by location
  if (locationFilter === 'remote') {
    filteredOpportunities = filteredOpportunities.filter(
      opp => opp.location_mode === 'remote'
    )
  } else if (locationFilter === 'my_county' && profile?.county) {
    filteredOpportunities = filteredOpportunities.filter(
      opp => opp.location_mode === 'local' || opp.location_mode === 'hybrid'
    )
  }

  const handleOpenOpportunity = (id: string) => {
    router.push(`/opportunities/${id}`)
  }

  const handleGoToProfile = () => {
    goTab('profile')
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

  const renderLocationBadge = (locationMode: string) => {
    let icon: keyof typeof Ionicons.glyphMap = 'location-outline'
    let label = 'Local'
    let color = ui.textSecondary

    if (locationMode === 'remote') {
      icon = 'globe-outline'
      label = 'Remote'
      color = '#22c55e'
    } else if (locationMode === 'hybrid') {
      icon = 'git-merge-outline'
      label = 'Hybrid'
      color = '#8b5cf6'
    }

    return (
      <View style={styles.locationBadge}>
        <Ionicons name={icon} size={12} color={color} />
        <Text style={[styles.locationBadgeText, { color }]}>{label}</Text>
      </View>
    )
  }

  // Check if user needs to set location
  const needsLocation = !profile?.state || !profile?.county

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Opportunities',
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
        <Text style={styles.loadingText}>Loading opportunities...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Opportunities',
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

      {/* Location Warning Banner */}
      {needsLocation && (
        <TouchableOpacity style={styles.locationBanner} onPress={handleGoToProfile}>
          <Ionicons name="location-outline" size={20} color={colors.warning} />
          <Text style={styles.locationBannerText}>
            Set your county/state to see local opportunities
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.warning} />
        </TouchableOpacity>
      )}

      {/* Sprint 14: Tab Toggle */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'for_you' && styles.tabActive]}
          onPress={() => setActiveTab('for_you')}
        >
          <Text style={[styles.tabText, activeTab === 'for_you' && styles.tabTextActive]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'tracked' && styles.tabActive]}
          onPress={() => setActiveTab('tracked')}
        >
          <Ionicons
            name="bookmark"
            size={14}
            color={activeTab === 'tracked' ? ui.primary : ui.textSecondary}
          />
          <Text style={[styles.tabText, activeTab === 'tracked' && styles.tabTextActive]}>
            Tracked ({trackedOpportunityIds.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Type Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterContainer}
        contentContainerStyle={styles.filterContent}
      >
        <TouchableOpacity
          style={[styles.filterChip, typeFilter === 'all' && styles.filterChipActive]}
          onPress={() => setTypeFilter('all')}
        >
          <Text style={[styles.filterChipText, typeFilter === 'all' && styles.filterChipTextActive]}>
            All ({opportunities.length})
          </Text>
        </TouchableOpacity>
        {OPPORTUNITY_TYPES.map(type => {
          const count = opportunities.filter(o => o.type === type.value).length
          return (
            <TouchableOpacity
              key={type.value}
              style={[
                styles.filterChip,
                typeFilter === type.value && styles.filterChipActive,
              ]}
              onPress={() => setTypeFilter(type.value)}
            >
              <View style={[styles.typeDot, { backgroundColor: type.color }]} />
              <Text
                style={[
                  styles.filterChipText,
                  typeFilter === type.value && styles.filterChipTextActive,
                ]}
              >
                {type.label} ({count})
              </Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Location Filter */}
      <View style={styles.locationFilterContainer}>
        <TouchableOpacity
          style={[styles.locationFilterChip, locationFilter === 'for_you' && styles.locationFilterActive]}
          onPress={() => setLocationFilter('for_you')}
        >
          <Text style={[styles.locationFilterText, locationFilter === 'for_you' && styles.locationFilterTextActive]}>
            For You
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.locationFilterChip, locationFilter === 'remote' && styles.locationFilterActive]}
          onPress={() => setLocationFilter('remote')}
        >
          <Text style={[styles.locationFilterText, locationFilter === 'remote' && styles.locationFilterTextActive]}>
            Remote Only
          </Text>
        </TouchableOpacity>
        {profile?.county && (
          <TouchableOpacity
            style={[styles.locationFilterChip, locationFilter === 'my_county' && styles.locationFilterActive]}
            onPress={() => setLocationFilter('my_county')}
          >
            <Text style={[styles.locationFilterText, locationFilter === 'my_county' && styles.locationFilterTextActive]}>
              My County
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Opportunities List */}
      <ScrollView
        style={styles.listContainer}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredOpportunities.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="briefcase-outline" size={32} color={ui.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>
              {needsLocation
                ? 'Set your location'
                : typeFilter === 'all'
                ? 'No opportunities yet'
                : `No ${typeFilter} opportunities`}
            </Text>
            <Text style={styles.emptyText}>
              {needsLocation
                ? 'Add your county and state in your profile to see local opportunities'
                : 'Check back soon for new internships, webinars, and events'}
            </Text>
            {needsLocation && (
              <TouchableOpacity style={styles.emptyButton} onPress={handleGoToProfile}>
                <Ionicons name="person-outline" size={18} color={colors.white} />
                <Text style={styles.emptyButtonText}>Go to Profile</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredOpportunities.map(opp => {
            const typeInfo = getTypeInfo(opp.type)
            return (
              <TouchableOpacity
                key={opp.id}
                style={styles.opportunityCard}
                onPress={() => handleOpenOpportunity(opp.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <Text style={styles.opportunityTitle} numberOfLines={2}>
                    {opp.title}
                  </Text>
                  <View style={[styles.typePill, { backgroundColor: `${typeInfo.color}20` }]}>
                    <Text style={[styles.typePillText, { color: typeInfo.color }]}>
                      {typeInfo.label}
                    </Text>
                  </View>
                </View>

                {opp.org_name && (
                  <View style={styles.orgRow}>
                    <Text style={styles.orgName} numberOfLines={1}>
                      {opp.org_name}
                    </Text>
                    {/* Sprint 10: Show Verified badge if owner is verified */}
                    {opp.owner_verified && (
                      <View style={styles.verifiedBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#065F46" />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.cardFooter}>
                  <View style={styles.cardMeta}>
                    {renderLocationBadge(opp.location_mode)}
                    {opp.deadline && (
                      <View style={styles.metaItem}>
                        <Ionicons name="calendar-outline" size={14} color={ui.textSecondary} />
                        <Text style={styles.metaText}>Deadline: {formatDate(opp.deadline)}</Text>
                      </View>
                    )}
                  </View>
                  {renderDeadlineBadge(opp.deadline)}
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
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}15`,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  locationBannerText: {
    flex: 1,
    fontSize: 14,
    color: colors.warning,
    fontWeight: '500',
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
  typeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  locationFilterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  locationFilterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
  },
  locationFilterActive: {
    backgroundColor: ui.primaryLight,
  },
  locationFilterText: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  locationFilterTextActive: {
    color: ui.primary,
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
  opportunityTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
    color: ui.text,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typePillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  orgName: {
    fontSize: 14,
    color: ui.textSecondary,
    flex: 1,
  },
  // Sprint 10: Verified badge styles
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065F46',
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
  locationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationBadgeText: {
    fontSize: 12,
    fontWeight: '500',
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
  // Sprint 14: Tab styles
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    gap: 6,
  },
  tabActive: {
    backgroundColor: ui.primaryLight,
  },
  tabText: {
    fontSize: 14,
    color: ui.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: ui.primary,
  },
})
