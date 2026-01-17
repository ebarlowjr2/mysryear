import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'
import {
  getOpportunityWithOwnerStatus,
  getTypeInfo,
  formatDate,
  formatCounties,
  getDaysUntilDeadline,
  OpportunityWithOwner,
  LOCATION_MODES,
} from '../../src/data/opportunities'
import { createTask } from '../../src/data/planner'

export default function OpportunityDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useAuth()
  const [opportunity, setOpportunity] = useState<OpportunityWithOwner | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToPlanner, setAddingToPlanner] = useState(false)

  // Tap guards for navigation
  const guardedBack = useTapGuard(() => safeBack('dashboard'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchOpportunity = useCallback(async () => {
    if (!id) return
    try {
      // Sprint 10: Use new function that includes owner verification status
      const data = await getOpportunityWithOwnerStatus(id)
      setOpportunity(data)
    } catch (error) {
      console.error('Failed to fetch opportunity:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchOpportunity()
  }, [fetchOpportunity])

  const handleOpenUrl = async () => {
    if (!opportunity?.apply_url) return
    try {
      const canOpen = await Linking.canOpenURL(opportunity.apply_url)
      if (canOpen) {
        await Linking.openURL(opportunity.apply_url)
      } else {
        Alert.alert('Error', 'Cannot open this URL')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open URL')
    }
  }

  const handleAddToPlanner = async () => {
    if (!user?.id || !opportunity) return
    
    setAddingToPlanner(true)
    try {
      const taskTitle = `Apply/Register: ${opportunity.title}`
      const dueDate = opportunity.deadline || opportunity.start_date || null
      const notes = `Organization: ${opportunity.org_name || 'N/A'}\nURL: ${opportunity.apply_url || 'N/A'}`

            await createTask(user.id, {
              title: taskTitle,
              dueDate: dueDate || undefined,
              notes: notes,
            })

      Alert.alert(
        'Added to Planner',
        `"${taskTitle}" has been added to your planner.`,
        [
          { text: 'View Planner', onPress: () => goTab('planner') },
          { text: 'OK', style: 'cancel' },
        ]
      )
    } catch (error) {
      console.error('Failed to add to planner:', error)
      Alert.alert('Error', 'Failed to add to planner')
    } finally {
      setAddingToPlanner(false)
    }
  }

  const renderDeadlineBadge = () => {
    if (!opportunity?.deadline) return null
    
    const days = getDaysUntilDeadline(opportunity.deadline)
    if (days === null) return null

    let badgeColor = ui.textMuted
    let badgeText = `${days} days left`

    if (days < 0) {
      badgeColor = colors.error
      badgeText = 'Past deadline'
    } else if (days === 0) {
      badgeColor = colors.error
      badgeText = 'Due today!'
    } else if (days <= 7) {
      badgeColor = colors.warning
    } else if (days <= 30) {
      badgeColor = ui.primary
    }

    return (
      <View style={[styles.deadlineBanner, { backgroundColor: `${badgeColor}15` }]}>
        <Ionicons name="time-outline" size={18} color={badgeColor} />
        <Text style={[styles.deadlineBannerText, { color: badgeColor }]}>{badgeText}</Text>
      </View>
    )
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Opportunity',
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
        <Text style={styles.loadingText}>Loading opportunity...</Text>
      </View>
    )
  }

  if (!opportunity) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Opportunity',
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
        <Ionicons name="alert-circle-outline" size={64} color={ui.textMuted} />
        <Text style={styles.errorTitle}>Opportunity not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={guardedBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const typeInfo = getTypeInfo(opportunity.type)
  const locationMode = LOCATION_MODES.find(l => l.value === opportunity.location_mode)

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Opportunity',
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Deadline Banner */}
        {renderDeadlineBadge()}

        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={[styles.typePill, { backgroundColor: `${typeInfo.color}20` }]}>
            <Text style={[styles.typePillText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
          </View>
          <Text style={styles.title}>{opportunity.title}</Text>
          {opportunity.org_name && (
            <View style={styles.orgRow}>
              <Text style={styles.orgName}>{opportunity.org_name}</Text>
              {/* Sprint 10: Show Verified Business badge if owner is verified */}
              {opportunity.owner_verified && (
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle" size={16} color="#065F46" />
                  <Text style={styles.verifiedBadgeText}>Verified Business</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <View style={styles.detailIcon}>
              <Ionicons name="location-outline" size={20} color={ui.primary} />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Location</Text>
              <Text style={styles.detailValue}>{locationMode?.label || 'Local'}</Text>
            </View>
          </View>

          {opportunity.state && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="map-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>State</Text>
                <Text style={styles.detailValue}>{opportunity.state}</Text>
              </View>
            </View>
          )}

          {opportunity.counties && opportunity.counties.length > 0 && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="business-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Counties</Text>
                <Text style={styles.detailValue}>{formatCounties(opportunity.counties)}</Text>
              </View>
            </View>
          )}

          {opportunity.deadline && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="calendar-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Deadline</Text>
                <Text style={styles.detailValue}>{formatDate(opportunity.deadline)}</Text>
              </View>
            </View>
          )}

          {opportunity.start_date && (
            <View style={styles.detailRow}>
              <View style={styles.detailIcon}>
                <Ionicons name="play-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Start Date</Text>
                <Text style={styles.detailValue}>{formatDate(opportunity.start_date)}</Text>
              </View>
            </View>
          )}
        </View>

        {/* Description Section */}
        {opportunity.description && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Description</Text>
            <Text style={styles.description}>{opportunity.description}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionsSection}>
          {opportunity.apply_url && (
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleOpenUrl}
              activeOpacity={0.8}
            >
              <Ionicons name="open-outline" size={20} color={colors.white} />
              <Text style={styles.primaryButtonText}>Apply / Register</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleAddToPlanner}
            disabled={addingToPlanner}
            activeOpacity={0.8}
          >
            {addingToPlanner ? (
              <ActivityIndicator size="small" color={ui.primary} />
            ) : (
              <>
                <Ionicons name="calendar-outline" size={20} color={ui.primary} />
                <Text style={styles.secondaryButtonText}>Add to Planner</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginTop: 16,
  },
  backButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  deadlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  deadlineBannerText: {
    fontSize: 15,
    fontWeight: '600',
  },
  headerSection: {
    padding: 20,
    backgroundColor: ui.card,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  typePill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    marginBottom: 12,
  },
  typePillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ui.text,
    marginBottom: 4,
  },
  orgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    flexWrap: 'wrap',
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    color: ui.textSecondary,
  },
  // Sprint 10: Verified badge styles
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    gap: 4,
  },
  verifiedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
  },
  section: {
    padding: 20,
    backgroundColor: ui.card,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
    justifyContent: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: ui.textSecondary,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 16,
    color: ui.text,
    fontWeight: '500',
  },
  description: {
    fontSize: 15,
    color: ui.text,
    lineHeight: 24,
  },
  actionsSection: {
    padding: 20,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.primary,
    paddingVertical: 16,
    borderRadius: radius.lg,
    gap: 8,
    ...shadow.soft,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 17,
    fontWeight: '600',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    paddingVertical: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.primary,
    gap: 8,
  },
  secondaryButtonText: {
    color: ui.primary,
    fontSize: 17,
    fontWeight: '600',
  },
})
