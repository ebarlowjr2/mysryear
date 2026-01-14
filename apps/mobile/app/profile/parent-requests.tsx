import React, { useState, useEffect, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native'
import { useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius } from '../../src/theme'
import {
  getPendingLinkRequests,
  respondToLinkRequest,
  ParentStudentLink,
} from '../../src/data/parent-student'
import { supabase } from '../../src/lib/supabase'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'

type ParentRequestWithName = ParentStudentLink & {
  parent_name?: string | null
}

export default function ParentRequestsScreen() {
  const router = useRouter()
  const { user } = useAuth()
  const [requests, setRequests] = useState<ParentRequestWithName[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)
  
  // Tap guards to prevent rapid double-taps on navigation buttons
  const guardedBack = useTapGuard(() => safeBack('profile'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  const fetchRequests = useCallback(async () => {
    if (!user?.id) return
    try {
      const pendingRequests = await getPendingLinkRequests(user.id)
      
      // Fetch parent names for each request
      const requestsWithNames = await Promise.all(
        pendingRequests.map(async (request) => {
          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('user_id', request.parent_user_id)
            .single()
          
          return {
            ...request,
            parent_name: parentProfile?.full_name || null,
          }
        })
      )
      
      setRequests(requestsWithNames)
    } catch (error) {
      console.error('Failed to fetch parent requests:', error)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const onRefresh = async () => {
    setRefreshing(true)
    await fetchRequests()
    setRefreshing(false)
  }

  const handleRespond = async (linkId: string, accept: boolean) => {
    setRespondingTo(linkId)
    try {
      const result = await respondToLinkRequest(linkId, accept)
      if (result.success) {
        Alert.alert(
          'Success',
          accept
            ? 'Parent link request accepted'
            : 'Parent link request declined'
        )
        await fetchRequests()
      } else {
        Alert.alert('Error', result.error || 'Failed to respond to request')
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to respond to request')
    } finally {
      setRespondingTo(null)
    }
  }


  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading parent requests...</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Info Section */}
      <View style={styles.infoSection}>
        <Ionicons name="information-circle" size={24} color={ui.primary} />
        <Text style={styles.infoText}>
          Parents can send you link requests to view your progress and help manage your tasks.
          Accept requests only from parents or guardians you trust.
        </Text>
      </View>

      {/* Requests List */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pending Requests</Text>
        {requests.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="checkmark-circle" size={48} color={ui.textMuted} />
            <Text style={styles.emptyText}>
              No pending parent requests
            </Text>
          </View>
        ) : (
          requests.map((request) => (
            <View key={request.id} style={styles.requestCard}>
              <View style={styles.requestInfo}>
                <Text style={styles.requestTitle}>
                  {request.parent_name || 'A parent'}
                </Text>
                <Text style={styles.requestSubtitle}>
                  wants to link with your account
                </Text>
                <Text style={styles.requestDate}>
                  Requested {new Date(request.created_at).toLocaleDateString()}
                </Text>
              </View>
              <View style={styles.requestActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.acceptButton]}
                  onPress={() => handleRespond(request.id, true)}
                  disabled={respondingTo === request.id}
                >
                  {respondingTo === request.id ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={18} color={colors.white} />
                      <Text style={styles.acceptButtonText}>Accept</Text>
                    </>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.declineButton]}
                  onPress={() => handleRespond(request.id, false)}
                  disabled={respondingTo === request.id}
                >
                  <Ionicons name="close" size={18} color={ui.textSecondary} />
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </View>

            {/* Home Button (escape hatch) */}
            <TouchableOpacity
              style={styles.homeButton}
              onPress={guardedHome}
            >
              <Ionicons name="home" size={20} color={ui.primary} />
              <Text style={styles.homeButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  contentContainer: {
    padding: 20,
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
  infoSection: {
    flexDirection: 'row',
    backgroundColor: `${ui.primary}10`,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    alignItems: 'flex-start',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: ui.text,
    lineHeight: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 16,
  },
  emptyContainer: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  emptyText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  requestCard: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  requestInfo: {
    marginBottom: 16,
  },
  requestTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  requestSubtitle: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  requestDate: {
    fontSize: 12,
    color: ui.textMuted,
    marginTop: 8,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 6,
  },
  acceptButton: {
    backgroundColor: '#10B981',
  },
  acceptButtonText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  declineButton: {
    backgroundColor: ui.backgroundSecondary,
  },
  declineButtonText: {
    color: ui.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: ui.primary,
  },
  homeButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
})
