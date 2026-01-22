import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { getDashboardMetrics, getNextDeadline, DashboardMetrics, NextDeadline } from '../../src/data/dashboard'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import {
  listApplications,
  getNextDeadline as getNextAppDeadline,
  formatDate as formatAppDate,
  getDaysUntilDeadline,
  getStatusInfo,
  Application,
} from '../../src/data/applications'
import { getProfile, Profile } from '../../src/data/profile'
import ParentDashboard from '../../src/components/ParentDashboard'
import { getVerificationStatus, VerificationStatus } from '../../src/data/verification'

export default function DashboardScreen() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [nextDeadline, setNextDeadline] = useState<NextDeadline>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [applicationsCount, setApplicationsCount] = useState(0)
  const [nextAppDeadline, setNextAppDeadline] = useState<Application | null>(null)
  // Sprint 10: Verification status for business/teacher nudge
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('unverified')

    const fetchData = useCallback(async (userId: string) => {
      try {
        setError(null)
        const [profileData, metricsData, deadlineData, applications, appDeadline] = await Promise.all([
          getProfile(userId).catch(() => null),
          getDashboardMetrics(userId),
          getNextDeadline(userId),
          listApplications(userId).catch(() => []),
          getNextAppDeadline(userId).catch(() => null),
        ])
        setProfile(profileData)
        setMetrics(metricsData)
        setNextDeadline(deadlineData)
        setApplicationsCount(applications.length)
        setNextAppDeadline(appDeadline)
        
        // Sprint 10: Fetch verification status for business/teacher users
        if (profileData?.role === 'business' || profileData?.role === 'teacher') {
          const verificationInfo = await getVerificationStatus(userId).catch(() => ({ status: 'unverified' as VerificationStatus }))
          setVerificationStatus(verificationInfo.status)
        }
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

    // Render Parent Dashboard for parent role
    if (profile?.role === 'parent' && user?.id) {
      return <ParentDashboard userId={user.id} />
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

      {/* Sprint 10: Verification Nudge for unverified Business/Teacher users */}
      {(profile?.role === 'business' || profile?.role === 'teacher') && verificationStatus === 'unverified' && (
        <TouchableOpacity 
          style={styles.verificationNudge}
          onPress={() => goTab('profile')}
        >
          <View style={styles.verificationNudgeIcon}>
            <Ionicons name="shield-checkmark-outline" size={24} color="#B45309" />
          </View>
          <View style={styles.verificationNudgeContent}>
            <Text style={styles.verificationNudgeTitle}>Get Verified</Text>
            <Text style={styles.verificationNudgeDesc}>
              Verified accounts build trust with students and parents.
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#B45309" />
        </TouchableOpacity>
      )}

      {/* Quick Actions Row */}
      <View style={styles.quickActionsContainer}>
        <Text style={styles.quickActionsTitle}>Quick Actions</Text>
        <View style={styles.quickActionsRow}>
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(modals)/new-task')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#10B98120' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#10B981" />
            </View>
            <Text style={styles.quickActionLabel}>New Task</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/(modals)/application-new')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#3B82F620' }]}>
              <Ionicons name="document-text-outline" size={24} color="#3B82F6" />
            </View>
            <Text style={styles.quickActionLabel}>New App</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => goTab('scholarships')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: '#F59E0B20' }]}>
              <Ionicons name="school-outline" size={24} color="#F59E0B" />
            </View>
            <Text style={styles.quickActionLabel}>Scholarships</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.quickActionButton}
            onPress={() => router.push('/aura')}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: ui.primaryLight }]}>
              <Ionicons name="sparkles" size={24} color={ui.primary} />
            </View>
            <Text style={styles.quickActionLabel}>A.U.R.A.</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Empty State Coaching - Show when all counts are zero */}
      {(metrics?.pendingTasks ?? 0) === 0 && 
       (metrics?.completedTasks ?? 0) === 0 && 
       applicationsCount === 0 && 
       (metrics?.scholarshipsCount ?? 0) === 0 && (
        <View style={styles.getStartedCard}>
          <View style={styles.getStartedHeader}>
            <Ionicons name="rocket-outline" size={28} color={ui.primary} />
            <Text style={styles.getStartedTitle}>Get Started</Text>
          </View>
          <Text style={styles.getStartedDesc}>
            Complete these 3 steps to set up your senior year dashboard
          </Text>
          
          <TouchableOpacity 
            style={styles.getStartedStep}
            onPress={() => router.push('/(modals)/new-task')}
          >
            <View style={styles.getStartedStepNumber}>
              <Text style={styles.getStartedStepNumberText}>1</Text>
            </View>
            <View style={styles.getStartedStepInfo}>
              <Text style={styles.getStartedStepTitle}>Add your first deadline</Text>
              <Text style={styles.getStartedStepDesc}>Track important dates and tasks</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.getStartedStep}
            onPress={() => router.push('/(modals)/application-new')}
          >
            <View style={styles.getStartedStepNumber}>
              <Text style={styles.getStartedStepNumberText}>2</Text>
            </View>
            <View style={styles.getStartedStepInfo}>
              <Text style={styles.getStartedStepTitle}>Add a college application</Text>
              <Text style={styles.getStartedStepDesc}>Start tracking schools you're considering</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.getStartedStep}
            onPress={() => goTab('scholarships')}
          >
            <View style={styles.getStartedStepNumber}>
              <Text style={styles.getStartedStepNumberText}>3</Text>
            </View>
            <View style={styles.getStartedStepInfo}>
              <Text style={styles.getStartedStepTitle}>Save a scholarship</Text>
              <Text style={styles.getStartedStepDesc}>Bookmark scholarships that match your profile</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsGrid}>
        <TouchableOpacity style={styles.statCard} onPress={() => router.push('/applications')}>
          <Text style={styles.statLabel}>Applications</Text>
          <Text style={styles.statValue}>{applicationsCount} tracked</Text>
          <Text style={styles.statDesc}>Tap to manage</Text>
        </TouchableOpacity>
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

      {/* Next Application Deadline Card */}
      {nextAppDeadline && (
        <TouchableOpacity 
          style={styles.deadlineCard}
          onPress={() => router.push(`/applications/${nextAppDeadline.id}`)}
        >
          <View style={styles.deadlineIcon}>
            <Ionicons name="alert-circle" size={24} color={colors.warning} />
          </View>
          <View style={styles.deadlineInfo}>
            <Text style={styles.deadlineLabel}>Next Application Deadline</Text>
            <Text style={styles.deadlineCollege} numberOfLines={1}>{nextAppDeadline.college_name}</Text>
            <Text style={styles.deadlineDate}>
              {formatAppDate(nextAppDeadline.deadline)} 
              {getDaysUntilDeadline(nextAppDeadline.deadline) !== null && 
                ` (${getDaysUntilDeadline(nextAppDeadline.deadline)} days)`}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
        </TouchableOpacity>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything in one place</Text>
        <Text style={styles.sectionSubtitle}>Replace sticky notes and scattered tabs with a simple dashboard.</Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => goTab('scholarships')}
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
            onPress={() => goTab('planner')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={24} color={ui.primary} />
            </View>
            <Text style={styles.featureTitle}>Senior Year Timeline</Text>
            <Text style={styles.featureDesc}>Milestones you can customize for your state and goals.</Text>
            <Text style={styles.featureLink}>Open</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => router.push('/applications')}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="document-text-outline" size={24} color={ui.primary} />
            </View>
            <Text style={styles.featureTitle}>Application Tracker</Text>
            <Text style={styles.featureDesc}>Track each school with tasks, essays, and documents.</Text>
            <Text style={styles.featureLink}>Open</Text>
          </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.featureCard}
                      onPress={() => router.push('/test-prep')}
                    >
                      <View style={styles.featureIcon}>
                        <Ionicons name="school-outline" size={24} color={ui.primary} />
                      </View>
                      <Text style={styles.featureTitle}>Test Prep</Text>
                      <Text style={styles.featureDesc}>Prepare for SAT, ACT, AP exams, and more standardized tests.</Text>
                      <Text style={styles.featureLink}>Open</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.featureCard}
                      onPress={() => router.push('/opportunities')}
                    >
                      <View style={styles.featureIcon}>
                        <Ionicons name="briefcase-outline" size={24} color={ui.primary} />
                      </View>
                      <Text style={styles.featureTitle}>Opportunities</Text>
                      <Text style={styles.featureDesc}>Discover internships, webinars, and events in your area.</Text>
                      <Text style={styles.featureLink}>Open</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.featureCard}
                      onPress={() => router.push('/mentors' as never)}
                    >
                      <View style={[styles.featureIcon, { backgroundColor: '#3b82f620' }]}>
                        <Ionicons name="people-outline" size={24} color="#3b82f6" />
                      </View>
                      <Text style={styles.featureTitle}>Find a Mentor</Text>
                      <Text style={styles.featureDesc}>Connect with professionals who can guide your career journey.</Text>
                      <Text style={styles.featureLink}>Open</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={styles.featureCard}
                      onPress={() => router.push('/jobs' as never)}
                    >
                      <View style={[styles.featureIcon, { backgroundColor: '#22c55e20' }]}>
                        <Ionicons name="bag-outline" size={24} color="#22c55e" />
                      </View>
                      <Text style={styles.featureTitle}>Jobs & Programs</Text>
                      <Text style={styles.featureDesc}>Browse internships, apprenticeships, and entry-level opportunities.</Text>
                      <Text style={styles.featureLink}>Open</Text>
                    </TouchableOpacity>

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
  deadlineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: `${colors.warning}10`,
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: `${colors.warning}30`,
  },
  deadlineIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: `${colors.warning}20`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deadlineInfo: {
    flex: 1,
  },
  deadlineLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: ui.textSecondary,
  },
  deadlineCollege: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginTop: 2,
  },
  deadlineDate: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '500',
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
  // Sprint 9A: Quick Actions styles
  quickActionsContainer: {
    paddingHorizontal: 16,
    marginTop: 16,
  },
  quickActionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 12,
  },
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  quickActionButton: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  quickActionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickActionLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: ui.text,
    textAlign: 'center',
  },
  // Sprint 9A: Get Started card styles
  getStartedCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 20,
    marginHorizontal: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  getStartedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  getStartedTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: ui.text,
  },
  getStartedDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 16,
    lineHeight: 20,
  },
  getStartedStep: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: ui.border,
  },
  getStartedStepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  getStartedStepNumberText: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.primary,
  },
  getStartedStepInfo: {
    flex: 1,
  },
  getStartedStepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.text,
  },
  getStartedStepDesc: {
    fontSize: 13,
    color: ui.textSecondary,
    marginTop: 2,
  },
  // Sprint 10: Verification nudge styles
  verificationNudge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.lg,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  verificationNudgeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationNudgeContent: {
    flex: 1,
  },
  verificationNudgeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
  },
  verificationNudgeDesc: {
    fontSize: 13,
    color: '#B45309',
    marginTop: 2,
    lineHeight: 18,
  },
})
