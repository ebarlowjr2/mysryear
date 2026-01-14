import React, { useState, useEffect, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native'
import { useRouter, useLocalSearchParams } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { 
  getScholarshipById, 
  getSavedScholarshipIds,
  saveScholarship,
  unsaveScholarship,
  markScholarshipApplied,
  formatDeadline,
  Scholarship
} from '../../src/data/scholarships'
import { createTask } from '../../src/data/planner'
import { colors, ui, radius } from '../../src/theme'

export default function ScholarshipDetailScreen() {
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { user } = useSession()
  const [scholarship, setScholarship] = useState<Scholarship | null>(null)
  const [savedStatus, setSavedStatus] = useState<'saved' | 'applied' | null>(null)
  const [loading, setLoading] = useState(true)
  const [addingToPlanner, setAddingToPlanner] = useState(false)

  const loadData = useCallback(async () => {
    if (!id || !user?.id) return

    try {
      const [scholarshipData, savedIds] = await Promise.all([
        getScholarshipById(id),
        getSavedScholarshipIds(user.id)
      ])
      setScholarship(scholarshipData)
      setSavedStatus(savedIds.get(id) ?? null)
    } catch (err) {
      console.error('Failed to load scholarship:', err)
    } finally {
      setLoading(false)
    }
  }, [id, user?.id])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSaveToggle = useCallback(async () => {
    if (!user?.id || !id) return

    try {
      if (savedStatus) {
        await unsaveScholarship(user.id, id)
        setSavedStatus(null)
      } else {
        await saveScholarship(user.id, id)
        setSavedStatus('saved')
      }
    } catch (err) {
      console.error('Failed to save/unsave scholarship:', err)
    }
  }, [user?.id, id, savedStatus])

  const handleMarkApplied = useCallback(async () => {
    if (!user?.id || !id) return

    try {
      await markScholarshipApplied(user.id, id)
      setSavedStatus('applied')
      Alert.alert('Success', 'Scholarship marked as applied!')
    } catch (err) {
      console.error('Failed to mark as applied:', err)
      Alert.alert('Error', 'Failed to mark as applied')
    }
  }, [user?.id, id])

  const handleApply = useCallback(() => {
    if (scholarship?.link) {
      Linking.openURL(scholarship.link)
    }
  }, [scholarship?.link])

  const handleAddToPlanner = useCallback(async () => {
    if (!user?.id || !scholarship) return

    setAddingToPlanner(true)
    try {
      const normalizedDeadline = normalizeDeadline(scholarship.deadline)
      
      await createTask(user.id, {
        title: `Submit: ${scholarship.name}`,
        category: 'Scholarships',
        dueDate: normalizedDeadline || undefined,
        notes: `Amount: ${scholarship.amount}\nLink: ${scholarship.link}`
      })
      
      Alert.alert(
        'Added to Planner',
        `Task created for "${scholarship.name}" with deadline ${formatDeadline(scholarship.deadline)}`,
        [
          { text: 'View Planner', onPress: () => router.push('/(app)/planner') },
          { text: 'OK' }
        ]
      )
    } catch (err) {
      console.error('Failed to add to planner:', err)
      Alert.alert('Error', 'Failed to add to planner')
    } finally {
      setAddingToPlanner(false)
    }
  }, [user?.id, scholarship, router])

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading scholarship...</Text>
      </View>
    )
  }

  if (!scholarship) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Scholarship not found</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>Go back</Text>
        </TouchableOpacity>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/(app)')}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.replace('/(app)')}
        >
          <Ionicons name="home" size={20} color={ui.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Text style={styles.title}>{scholarship.name}</Text>

        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {savedStatus === 'applied' ? 'Applied' : savedStatus === 'saved' ? 'Saved' : 'Not Saved'}
          </Text>
        </View>

        <View style={styles.detailsCard}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Amount</Text>
            <Text style={styles.detailValue}>{scholarship.amount}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Deadline</Text>
            <Text style={styles.detailValue}>{formatDeadline(scholarship.deadline)}</Text>
          </View>

          {scholarship.state && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>State</Text>
              <Text style={styles.detailValue}>{scholarship.state}</Text>
            </View>
          )}

          {scholarship.source && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Source</Text>
              <Text style={styles.detailValue}>{scholarship.source}</Text>
            </View>
          )}
        </View>

        {scholarship.tags && scholarship.tags.length > 0 && (
          <View style={styles.tagsSection}>
            <Text style={styles.sectionTitle}>Tags</Text>
            <View style={styles.tagsContainer}>
              {scholarship.tags.map((tag, index) => (
                <View key={index} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.actionsSection}>
          <TouchableOpacity 
            style={styles.primaryButton}
            onPress={handleApply}
          >
            <Text style={styles.primaryButtonText}>Apply Now</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.secondaryButton, addingToPlanner && styles.buttonDisabled]}
            onPress={handleAddToPlanner}
            disabled={addingToPlanner}
          >
              {addingToPlanner ? (
                <ActivityIndicator size="small" color={ui.primary} />
              ) : (
                <Text style={styles.secondaryButtonText}>Add to Planner</Text>
              )}
          </TouchableOpacity>

          <View style={styles.buttonRow}>
            <TouchableOpacity 
              style={[styles.halfButton, savedStatus && styles.halfButtonActive]}
              onPress={handleSaveToggle}
            >
              <Text style={[styles.halfButtonText, savedStatus && styles.halfButtonTextActive]}>
                {savedStatus ? 'Unsave' : 'Save'}
              </Text>
            </TouchableOpacity>

            {savedStatus !== 'applied' && (
              <TouchableOpacity 
                style={styles.halfButton}
                onPress={handleMarkApplied}
              >
                <Text style={styles.halfButtonText}>Mark Applied</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  )
}

function normalizeDeadline(d: string): string | null {
  try {
    if (/\d{4}-\d{2}-\d{2}/.test(d)) return d
    const date = new Date(d + ' ' + new Date().getFullYear())
    if (!isNaN(date.getTime())) return date.toISOString().slice(0, 10)
  } catch {}
  return null
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
  backButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: ui.primary,
    borderRadius: radius.sm,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  backLink: {
    fontSize: 16,
    color: ui.primary,
  },
  homeButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ui.text,
    marginBottom: 12,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    backgroundColor: ui.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: ui.border,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  detailsCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    color: ui.textMuted,
  },
  detailValue: {
    fontSize: 14,
    color: ui.text,
    fontWeight: '600',
  },
  tagsSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 12,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: ui.backgroundSecondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: ui.border,
  },
  tagText: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  actionsSection: {
    marginTop: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: ui.primary,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: ui.card,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.primary,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.primary,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfButton: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.border,
  },
  halfButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  halfButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  halfButtonTextActive: {
    color: colors.white,
  },
})
