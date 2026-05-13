import React, { useEffect, useState, useCallback } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  RefreshControl, 
  ActivityIndicator, 
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { getMyOpportunities, createOpportunity, deleteOpportunity, type Opportunity, type OpportunityType, OPPORTUNITY_TYPES } from '../../src/data/opportunities'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function ListingsScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [listings, setListings] = useState<Opportunity[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newListing, setNewListing] = useState({
    org_name: '',
    title: '',
    description: '',
    type: 'internship' as OpportunityType,
    apply_url: '',
  })

  const fetchListings = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getMyOpportunities(user.id)
      setListings(data)
    } catch (err) {
      console.warn('Failed to fetch listings:', err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [user?.id])

  useEffect(() => {
    if (sessionLoading) return
    if (!user?.id) {
      setLoading(false)
      return
    }
    fetchListings()
  }, [sessionLoading, user?.id, fetchListings])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchListings()
  }, [fetchListings])

  const handleCreate = async () => {
    if (!user?.id) return
    if (!newListing.org_name.trim() || !newListing.title.trim() || !newListing.description.trim()) {
      Alert.alert('Error', 'Please fill in all required fields')
      return
    }

    setCreating(true)
    try {
      const { opportunity, error } = await createOpportunity(user.id, newListing)
      if (opportunity) {
        Alert.alert('Success', 'Listing created successfully!', [
          { text: 'OK', onPress: () => {
            setShowCreateModal(false)
            setNewListing({ org_name: '', title: '', description: '', type: 'internship', apply_url: '' })
            fetchListings()
          }}
        ])
      } else {
        Alert.alert('Error', error || 'Failed to create listing')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create listing. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = (listing: Opportunity) => {
    Alert.alert(
      'Delete Listing',
      `Are you sure you want to delete "${listing.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            const { success, error } = await deleteOpportunity(listing.id)
            if (success) {
              fetchListings()
            } else {
              Alert.alert('Error', error || 'Failed to delete listing')
            }
          }
        }
      ]
    )
  }

  const getTypeIcon = (type: OpportunityType) => {
    const typeInfo = OPPORTUNITY_TYPES.find(t => t.value === type)
    return typeInfo?.icon || 'briefcase-outline'
  }

  const getTypeColor = (type: OpportunityType) => {
    switch (type) {
      case 'internship': return { bg: '#E8F5E9', color: '#4CAF50' }
      case 'webinar': return { bg: '#E3F2FD', color: '#2196F3' }
      case 'seminar': return { bg: '#FFF3E0', color: '#FF9800' }
      default: return { bg: ui.primaryLight, color: ui.primary }
    }
  }

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <>
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
        <View style={styles.header}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.title}>My Listings</Text>
              <Text style={styles.subtitle}>Post internships, webinars, and opportunities</Text>
            </View>
            <TouchableOpacity 
              style={styles.addIconButton}
              onPress={() => setShowCreateModal(true)}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {listings.length === 0 ? (
          <>
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Ionicons name="briefcase-outline" size={48} color={ui.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>No listings yet</Text>
              <Text style={styles.emptyDescription}>
                Create your first listing to connect with students looking for opportunities.
              </Text>
              <TouchableOpacity 
                style={styles.addButton}
                onPress={() => setShowCreateModal(true)}
              >
                <Ionicons name="add" size={20} color={colors.white} />
                <Text style={styles.addButtonText}>Create Listing</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Listing Types</Text>
              <View style={styles.typeList}>
                <View style={styles.typeCard}>
                  <View style={[styles.typeIcon, { backgroundColor: '#E8F5E9' }]}>
                    <Ionicons name="briefcase-outline" size={24} color="#4CAF50" />
                  </View>
                  <Text style={styles.typeTitle}>Internships</Text>
                  <Text style={styles.typeDesc}>Paid or unpaid work experience opportunities</Text>
                </View>
                <View style={styles.typeCard}>
                  <View style={[styles.typeIcon, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="videocam-outline" size={24} color="#2196F3" />
                  </View>
                  <Text style={styles.typeTitle}>Webinars</Text>
                  <Text style={styles.typeDesc}>Virtual events and educational sessions</Text>
                </View>
                <View style={styles.typeCard}>
                  <View style={[styles.typeIcon, { backgroundColor: '#FFF3E0' }]}>
                    <Ionicons name="people-outline" size={24} color="#FF9800" />
                  </View>
                  <Text style={styles.typeTitle}>Seminars</Text>
                  <Text style={styles.typeDesc}>In-person workshops and presentations</Text>
                </View>
              </View>
            </View>
          </>
        ) : (
          <View style={styles.listingsSection}>
            {listings.map((listing) => {
              const typeColors = getTypeColor(listing.type)
              return (
                <View key={listing.id} style={styles.listingCard}>
                  <View style={styles.listingHeader}>
                    <View style={[styles.listingTypeIcon, { backgroundColor: typeColors.bg }]}>
                      <Ionicons name={getTypeIcon(listing.type) as keyof typeof Ionicons.glyphMap} size={20} color={typeColors.color} />
                    </View>
                    <View style={styles.listingInfo}>
                      <Text style={styles.listingTitle}>{listing.title}</Text>
                      <Text style={styles.listingOrg}>{listing.org_name}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleDelete(listing)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.listingDesc} numberOfLines={2}>{listing.description}</Text>
                  <View style={styles.listingMeta}>
                    <View style={[styles.typeBadge, { backgroundColor: typeColors.bg }]}>
                      <Text style={[styles.typeBadgeText, { color: typeColors.color }]}>
                        {listing.type.charAt(0).toUpperCase() + listing.type.slice(1)}
                      </Text>
                    </View>
                    {listing.is_remote && (
                      <View style={styles.remoteBadge}>
                        <Text style={styles.remoteBadgeText}>Remote</Text>
                      </View>
                    )}
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <View style={styles.infoCard}>
          <Ionicons name="location-outline" size={20} color={ui.primary} />
          <Text style={styles.infoText}>
            Target up to 4 counties to reach students in specific areas. Your listings will appear in their Opportunities feed.
          </Text>
        </View>
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowCreateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Create Listing</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Organization Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Your company or organization"
                placeholderTextColor={ui.inputPlaceholder}
                value={newListing.org_name}
                onChangeText={(text) => setNewListing(prev => ({ ...prev, org_name: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Summer Marketing Internship"
                placeholderTextColor={ui.inputPlaceholder}
                value={newListing.title}
                onChangeText={(text) => setNewListing(prev => ({ ...prev, title: text }))}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeSelector}>
                {OPPORTUNITY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.typeSelectorItem,
                      newListing.type === type.value && styles.typeSelectorItemActive
                    ]}
                    onPress={() => setNewListing(prev => ({ ...prev, type: type.value }))}
                  >
                    <Ionicons 
                      name={type.icon as keyof typeof Ionicons.glyphMap} 
                      size={20} 
                      color={newListing.type === type.value ? colors.white : ui.textSecondary} 
                    />
                    <Text style={[
                      styles.typeSelectorText,
                      newListing.type === type.value && styles.typeSelectorTextActive
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe the opportunity..."
                placeholderTextColor={ui.inputPlaceholder}
                value={newListing.description}
                onChangeText={(text) => setNewListing(prev => ({ ...prev, description: text }))}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Apply URL (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="https://..."
                placeholderTextColor={ui.inputPlaceholder}
                value={newListing.apply_url}
                onChangeText={(text) => setNewListing(prev => ({ ...prev, apply_url: text }))}
                keyboardType="url"
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity 
              style={[styles.submitButton, creating && styles.buttonDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>Create Listing</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>
    </>
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
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 4,
  },
  addIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingsSection: {
    paddingHorizontal: 24,
  },
  listingCard: {
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginBottom: 12,
    ...shadow.card,
  },
  listingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listingTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listingInfo: {
    flex: 1,
  },
  listingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  listingOrg: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  listingDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  listingMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  typeBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  remoteBadge: {
    backgroundColor: ui.backgroundSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  remoteBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 24,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 16,
  },
  typeList: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  typeDesc: {
    fontSize: 14,
    color: ui.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 16,
    marginHorizontal: 24,
    marginTop: 24,
    borderRadius: radius.md,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: ui.primaryText,
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: ui.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  modalCancel: {
    fontSize: 16,
    color: ui.primary,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: ui.text,
  },
  modalContent: {
    padding: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 16,
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeSelectorItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ui.backgroundSecondary,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.border,
  },
  typeSelectorItemActive: {
    backgroundColor: ui.primary,
    borderColor: ui.primary,
  },
  typeSelectorText: {
    fontSize: 13,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  typeSelectorTextActive: {
    color: colors.white,
  },
  submitButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})
