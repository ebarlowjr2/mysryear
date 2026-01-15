import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native'
import { useRouter, useLocalSearchParams, Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'
import {
  getApplication,
  deleteApplication,
  getStatusInfo,
  formatDate,
  getDaysUntilDeadline,
  Application,
  APPLICATION_TYPES,
  ESSAY_STATUSES,
} from '../../src/data/applications'

export default function ApplicationDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const [application, setApplication] = useState<Application | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

  // Tap guards for navigation
  const guardedBack = useTapGuard(() => safeBack('dashboard'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchApplication = useCallback(async () => {
    if (!id) return
    try {
      const data = await getApplication(id)
      setApplication(data)
    } catch (error) {
      console.error('Failed to fetch application:', error)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchApplication()
  }, [fetchApplication])

  const handleEdit = () => {
    router.push(`/(modals)/application-edit/${id}`)
  }

  const handleDelete = () => {
    Alert.alert(
      'Delete Application',
      `Are you sure you want to delete the application for ${application?.college_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return
            setDeleting(true)
            try {
              await deleteApplication(id)
              router.back()
            } catch (error) {
              Alert.alert('Error', 'Failed to delete application')
              setDeleting(false)
            }
          },
        },
      ]
    )
  }

  const handleOpenPortal = async () => {
    if (!application?.portal_url) return
    
    const url = application.portal_url.startsWith('http')
      ? application.portal_url
      : `https://${application.portal_url}`
    
    const canOpen = await Linking.canOpenURL(url)
    if (canOpen) {
      await Linking.openURL(url)
    } else {
      Alert.alert('Error', 'Cannot open this URL')
    }
  }

  const handleAddToPlanner = () => {
    // Navigate to new task modal with pre-filled data
    const taskTitle = `Submit application to ${application?.college_name}`
    const dueDate = application?.deadline || ''
    router.push(`/(modals)/new-task?title=${encodeURIComponent(taskTitle)}&dueDate=${dueDate}&category=Applications`)
  }

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen
          options={{
            title: 'Application Details',
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
        <Text style={styles.loadingText}>Loading application...</Text>
      </View>
    )
  }

  if (!application) {
    return (
      <View style={styles.centerContainer}>
        <Stack.Screen options={{ title: 'Not Found' }} />
        <Ionicons name="alert-circle-outline" size={64} color={ui.textMuted} />
        <Text style={styles.errorTitle}>Application not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={guardedBack}>
          <Text style={styles.backButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const statusInfo = getStatusInfo(application.status)
  const daysUntil = getDaysUntilDeadline(application.deadline)
  const appType = APPLICATION_TYPES.find(t => t.value === application.application_type)
  const essayStatus = ESSAY_STATUSES.find(e => e.value === application.essay_status)

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Application Details',
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

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Header Card */}
        <View style={styles.headerCard}>
          <Text style={styles.collegeName}>{application.college_name}</Text>
          {application.program_name && (
            <Text style={styles.programName}>{application.program_name}</Text>
          )}
          <View style={styles.headerMeta}>
            <View style={[styles.statusPill, { backgroundColor: `${statusInfo.color}20` }]}>
              <Text style={[styles.statusPillText, { color: statusInfo.color }]}>
                {statusInfo.label}
              </Text>
            </View>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>{appType?.label || 'College'}</Text>
            </View>
          </View>
        </View>

        {/* Deadline Card */}
        {application.deadline && (
          <View style={styles.deadlineCard}>
            <View style={styles.deadlineIcon}>
              <Ionicons name="calendar" size={24} color={ui.primary} />
            </View>
            <View style={styles.deadlineInfo}>
              <Text style={styles.deadlineLabel}>Deadline</Text>
              <Text style={styles.deadlineDate}>{formatDate(application.deadline)}</Text>
            </View>
            {daysUntil !== null && (
              <View style={[
                styles.daysLeftBadge,
                { backgroundColor: daysUntil <= 7 ? `${colors.warning}20` : `${ui.primary}15` }
              ]}>
                <Text style={[
                  styles.daysLeftText,
                  { color: daysUntil <= 7 ? colors.warning : ui.primary }
                ]}>
                  {daysUntil < 0 ? 'Past due' : daysUntil === 0 ? 'Today!' : `${daysUntil} days`}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Details</Text>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Date Applied</Text>
            <Text style={styles.detailValue}>
              {application.date_applied ? formatDate(application.date_applied) : 'Not yet'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Essay Status</Text>
            <Text style={styles.detailValue}>{essayStatus?.label || 'Not Started'}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recommendations</Text>
            <Text style={styles.detailValue}>{application.recommendation_count} received</Text>
          </View>

          {application.fee_amount !== null && application.fee_amount > 0 && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Application Fee</Text>
              <Text style={styles.detailValue}>${application.fee_amount}</Text>
            </View>
          )}

          {application.contact_email && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Contact Email</Text>
              <Text style={styles.detailValue}>{application.contact_email}</Text>
            </View>
          )}
        </View>

        {/* Portal Link */}
        {application.portal_url && (
          <TouchableOpacity style={styles.portalButton} onPress={handleOpenPortal}>
            <Ionicons name="open-outline" size={20} color={ui.primary} />
            <Text style={styles.portalButtonText}>Open Application Portal</Text>
          </TouchableOpacity>
        )}

        {/* Notes Section */}
        {application.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{application.notes}</Text>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editButton} onPress={handleEdit}>
            <Ionicons name="pencil" size={20} color={colors.white} />
            <Text style={styles.editButtonText}>Edit</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.plannerButton} onPress={handleAddToPlanner}>
            <Ionicons name="calendar-outline" size={20} color={ui.primary} />
            <Text style={styles.plannerButtonText}>Add to Planner</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={handleDelete}
          disabled={deleting}
        >
          {deleting ? (
            <ActivityIndicator size="small" color={colors.error} />
          ) : (
            <>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={styles.deleteButtonText}>Delete Application</Text>
            </>
          )}
        </TouchableOpacity>
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
    backgroundColor: ui.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 24,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  headerCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  collegeName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: ui.text,
  },
  programName: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 4,
  },
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: ui.backgroundSecondary,
  },
  typeBadgeText: {
    fontSize: 12,
    color: ui.textSecondary,
    fontWeight: '500',
  },
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primaryLight,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    gap: 12,
  },
  deadlineIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 13,
    color: ui.primaryText,
  },
  deadlineDate: {
    fontSize: 17,
    fontWeight: '600',
    color: ui.primary,
  },
  daysLeftBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
  },
  daysLeftText: {
    fontSize: 13,
    fontWeight: '600',
  },
  section: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ui.backgroundSecondary,
  },
  detailLabel: {
    fontSize: 14,
    color: ui.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.text,
  },
  portalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 16,
    marginBottom: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: ui.primary,
  },
  portalButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 14,
    color: ui.text,
    lineHeight: 22,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
  },
  editButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  plannerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 14,
    gap: 8,
    borderWidth: 1,
    borderColor: ui.primary,
  },
  plannerButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    gap: 8,
  },
  deleteButtonText: {
    color: colors.error,
    fontSize: 14,
    fontWeight: '500',
  },
})
