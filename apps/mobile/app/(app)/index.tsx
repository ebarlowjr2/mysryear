import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { useSession } from '../../src/hooks/useSession'
import { getDashboardMetrics, getStudentSuccessDashboard, DashboardMetrics } from '../../src/data/dashboard'
import {
  DOCUMENT_TYPE_OPTIONS,
  deleteStudentDocument,
  uploadStudentDocument,
  type MobileDocumentType,
  type StudentSuccessSummary,
} from '../../src/data/academic'
import { getActiveStudentProfile, type StudentProfile } from '../../src/data/identity'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function DashboardScreen() {
  const { user, loading: sessionLoading } = useSession()
  const router = useRouter()
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [activeStudentProfile, setActiveStudentProfile] = useState<StudentProfile | null>(null)
  const [successSummary, setSuccessSummary] = useState<StudentSuccessSummary | null>(null)
  const [documentType, setDocumentType] = useState<MobileDocumentType>('report_card')
  const [schoolYear, setSchoolYear] = useState('2025-2026')
  const [gradingPeriod, setGradingPeriod] = useState('')
  const [gpa, setGpa] = useState('')
  const [notes, setNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadMessage, setUploadMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (userId: string) => {
    try {
      setError(null)
      const [metricsData, studentProfile, successData] = await Promise.all([
        getDashboardMetrics(userId),
        getActiveStudentProfile(userId),
        getStudentSuccessDashboard(userId),
      ])
      setMetrics(metricsData)
      setActiveStudentProfile(studentProfile)
      setSuccessSummary(successData)
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


  const refreshDashboard = useCallback(() => {
    if (!user?.id) return
    fetchData(user.id)
  }, [fetchData, user?.id])

  const handlePickAndUpload = async () => {
    if (!user?.id || !activeStudentProfile?.id) {
      setUploadMessage('Select or create an active student profile before uploading.')
      return
    }

    setUploadMessage(null)
    const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true })
    if (result.canceled || !result.assets?.[0]) return

    const asset = result.assets[0]
    setUploading(true)
    try {
      const upload = await uploadStudentDocument({
        userId: user.id,
        studentProfileId: activeStudentProfile.id,
        fileUri: asset.uri,
        fileName: asset.name,
        fileType: asset.mimeType || null,
        fileSize: asset.size || null,
        documentType,
        schoolYear: schoolYear || null,
        gradingPeriod: gradingPeriod || null,
        gradeLevel: activeStudentProfile.grade_level || null,
        gpa: gpa ? Number(gpa) : null,
        notes: notes || null,
      })
      if (upload.error) {
        setUploadMessage(upload.error)
        return
      }
      setUploadMessage('Upload complete.')
      setGpa('')
      setNotes('')
      refreshDashboard()
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteDocument = async (fileId: string) => {
    const result = await deleteStudentDocument(fileId)
    if (!result.success) {
      setUploadMessage(result.error || 'Delete failed')
      return
    }
    setUploadMessage('Document deleted.')
    refreshDashboard()
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
        {activeStudentProfile && (
          <View style={styles.activeStudentCard}>
            <Text style={styles.activeStudentLabel}>Active student profile</Text>
            <Text style={styles.activeStudentName}>
              {[activeStudentProfile.first_name, activeStudentProfile.last_name].filter(Boolean).join(' ') || 'Student'}
            </Text>
            <Text style={styles.activeStudentMeta}>
              {activeStudentProfile.graduation_year ? `Class of ${activeStudentProfile.graduation_year}` : 'Graduation year not set'}
              {activeStudentProfile.schools?.name ? ` • ${activeStudentProfile.schools.name}` : ''}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Academic Health</Text>
          <Text style={styles.statValue}>
            {metrics?.academicHealthScore ?? 0}/100
          </Text>
          <Text style={styles.statDesc}>
            {metrics?.academicHealthLabel || 'Needs Attention'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Report Card</Text>
          <Text style={styles.statValue}>{metrics?.reportCardStatus === 'updated' ? 'Updated' : 'Missing'}</Text>
          <Text style={styles.statDesc}>Latest academic record</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Checklist</Text>
          <Text style={styles.statValue}>{metrics?.checklistDone ?? 0}/{metrics?.checklistTotal ?? 0}</Text>
          <Text style={styles.statDesc}>Grade-level success tasks</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>LifePath</Text>
          <Text style={styles.statValue}>{metrics?.lifePathCareersCount ?? 0} careers</Text>
          <Text style={styles.statDesc}>Avg health {metrics?.lifePathAverageHealth ?? 0}%</Text>
        </View>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Activities</Text>
          <Text style={styles.statValue}>{metrics?.portfolioActivitiesCount ?? 0}</Text>
          <Text style={styles.statDesc}>Portfolio entries</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Service Hours</Text>
          <Text style={styles.statValue}>{metrics?.portfolioServiceHoursTotal ?? 0}</Text>
          <Text style={styles.statDesc}>Volunteer/service</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Achievements</Text>
          <Text style={styles.statValue}>{metrics?.portfolioAchievementsCount ?? 0}</Text>
          <Text style={styles.statDesc}>Awards and honors</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Certifications</Text>
          <Text style={styles.statValue}>{metrics?.portfolioCertificationsCompleted ?? 0}</Text>
          <Text style={styles.statDesc}>Completed credentials</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Scholarship Ready</Text>
          <Text style={styles.statValue}>{metrics?.portfolioScholarshipReadinessScore ?? 0}%</Text>
          <Text style={styles.statDesc}>{metrics?.portfolioScholarshipReadinessLabel || 'Portfolio checklist'}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parent Action Center</Text>
        <Text style={styles.sectionSubtitle}>{successSummary?.academicHealth.nextAction || 'Upload records and complete one checklist item this week.'}</Text>
        <View style={styles.featureGrid}>
          {(successSummary?.tasks || []).slice(0, 3).map((task) => (
            <View key={task.id} style={styles.featureCard}>
              <View style={styles.featureIcon}>
                <Ionicons name={task.upload_required ? 'document-attach-outline' : 'checkmark-circle-outline'} size={24} color={ui.primary} />
              </View>
              <Text style={styles.featureTitle}>{task.title}</Text>
              <Text style={styles.featureDesc}>{task.description || 'Student success task'}</Text>
              <Text style={styles.featureLink}>{task.status.replace('_', ' ')}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Document Upload</Text>
        <Text style={styles.sectionSubtitle}>Upload report cards, transcripts, test scores, resumes, and certifications for the active student profile.</Text>
        <View style={styles.uploadCard}>
          <Text style={styles.uploadLabel}>Document type</Text>
          <View style={styles.chipRow}>
            {DOCUMENT_TYPE_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.chip, documentType === option.value && styles.chipActive]}
                onPress={() => setDocumentType(option.value)}
              >
                <Text style={[styles.chipText, documentType === option.value && styles.chipTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.uploadLabel}>School year</Text>
              <TextInput style={styles.uploadInput} value={schoolYear} onChangeText={setSchoolYear} placeholder="2025-2026" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.uploadLabel}>Grading period</Text>
              <TextInput style={styles.uploadInput} value={gradingPeriod} onChangeText={setGradingPeriod} placeholder="Q1" />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={styles.formField}>
              <Text style={styles.uploadLabel}>GPA optional</Text>
              <TextInput style={styles.uploadInput} value={gpa} onChangeText={setGpa} placeholder="3.5" keyboardType="decimal-pad" />
            </View>
            <View style={styles.formField}>
              <Text style={styles.uploadLabel}>Notes optional</Text>
              <TextInput style={styles.uploadInput} value={notes} onChangeText={setNotes} placeholder="Notes" />
            </View>
          </View>

          <TouchableOpacity style={[styles.uploadButton, uploading && styles.uploadButtonDisabled]} onPress={handlePickAndUpload} disabled={uploading}>
            <Ionicons name="cloud-upload-outline" size={20} color={colors.white} />
            <Text style={styles.uploadButtonText}>{uploading ? 'Uploading...' : 'Choose File & Upload'}</Text>
          </TouchableOpacity>
          {uploadMessage && <Text style={styles.uploadMessage}>{uploadMessage}</Text>}
        </View>

        <View style={styles.recentDocs}>
          <Text style={styles.uploadLabel}>Recent documents</Text>
          {(successSummary?.uploadedFiles || []).slice(0, 5).length === 0 ? (
            <Text style={styles.sectionSubtitle}>No documents uploaded yet.</Text>
          ) : (
            (successSummary?.uploadedFiles || []).slice(0, 5).map((file) => (
              <View key={file.id} style={styles.documentRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.documentName}>{file.file_name}</Text>
                  <Text style={styles.documentMeta}>{file.upload_context || 'document'} • {new Date(file.created_at).toLocaleDateString()}</Text>
                </View>
                <TouchableOpacity onPress={() => handleDeleteDocument(file.id)}>
                  <Ionicons name="trash-outline" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Everything in one place</Text>
        <Text style={styles.sectionSubtitle}>Replace sticky notes and scattered tabs with a simple dashboard.</Text>
        
        <View style={styles.featureGrid}>
          <TouchableOpacity 
            style={styles.featureCard}
            onPress={() => router.push('/aura' as never)}
          >
            <View style={styles.featureIcon}>
              <Ionicons name="map-outline" size={24} color={ui.primary} />
            </View>
            <Text style={styles.featureTitle}>A.U.R.A LifePath</Text>
            <Text style={styles.featureDesc}>{metrics?.lifePathNextAction || 'Compare careers, cost, and Career Health.'}</Text>
            <Text style={styles.featureLink}>Open</Text>
          </TouchableOpacity>

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
  activeStudentCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 14,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginTop: 16,
  },
  activeStudentLabel: {
    fontSize: 12,
    color: ui.textSecondary,
    fontWeight: '600',
  },
  activeStudentName: {
    fontSize: 17,
    color: ui.text,
    fontWeight: '700',
    marginTop: 4,
  },
  activeStudentMeta: {
    fontSize: 13,
    color: ui.textSecondary,
    marginTop: 2,
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

  uploadCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  uploadLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: ui.textSecondary,
    marginBottom: 8,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: ui.border,
    backgroundColor: ui.backgroundSecondary,
  },
  chipActive: {
    borderColor: ui.primary,
    backgroundColor: ui.primaryLight,
  },
  chipText: {
    color: ui.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  chipTextActive: {
    color: ui.primary,
  },
  formRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  formField: {
    flex: 1,
  },
  uploadInput: {
    borderWidth: 1,
    borderColor: ui.inputBorder,
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 10,
    color: ui.inputText,
  },
  uploadButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 14,
    marginTop: 4,
  },
  uploadButtonDisabled: {
    opacity: 0.7,
  },
  uploadButtonText: {
    color: colors.white,
    fontWeight: '700',
  },
  uploadMessage: {
    color: ui.textSecondary,
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  recentDocs: {
    marginTop: 14,
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    padding: 12,
    marginTop: 8,
  },
  documentName: {
    color: ui.text,
    fontWeight: '700',
  },
  documentMeta: {
    color: ui.textSecondary,
    fontSize: 12,
    marginTop: 2,
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
