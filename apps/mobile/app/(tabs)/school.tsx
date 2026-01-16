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
import { getUserSchoolMembership, searchSchools, joinSchool, createSchool, type School, type SchoolMembership } from '../../src/data/schools'
import { colors, ui, radius, shadow } from '../../src/theme'

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut',
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan',
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota',
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
  'Wisconsin', 'Wyoming'
]

export default function SchoolScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [membership, setMembership] = useState<SchoolMembership | null>(null)
  const [showSearchModal, setShowSearchModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<School[]>([])
  const [searching, setSearching] = useState(false)
  const [joining, setJoining] = useState(false)
  
  // Manual entry state
  const [showManualEntry, setShowManualEntry] = useState(false)
  const [manualSchoolName, setManualSchoolName] = useState('')
  const [manualCity, setManualCity] = useState('')
  const [manualState, setManualState] = useState('')
  const [showStatePicker, setShowStatePicker] = useState(false)
  const [creatingSchool, setCreatingSchool] = useState(false)

  const fetchMembership = useCallback(async () => {
    if (!user?.id) return
    try {
      const data = await getUserSchoolMembership(user.id)
      setMembership(data)
    } catch (err) {
      console.warn('Failed to fetch membership:', err)
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
    fetchMembership()
  }, [sessionLoading, user?.id, fetchMembership])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    fetchMembership()
  }, [fetchMembership])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const results = await searchSchools(searchQuery)
      setSearchResults(results)
    } catch (err) {
      console.warn('Search failed:', err)
    } finally {
      setSearching(false)
    }
  }

  const handleJoinSchool = async (school: School) => {
    if (!user?.id) return
    setJoining(true)
    try {
      const { success, error } = await joinSchool(user.id, school.id, 'student')
      if (success) {
        Alert.alert('Success', `You have joined ${school.name}!`, [
          { text: 'OK', onPress: () => {
            setShowSearchModal(false)
            setSearchQuery('')
            setSearchResults([])
            fetchMembership()
          }}
        ])
      } else {
        Alert.alert('Error', error || 'Failed to join school')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to join school. Please try again.')
    } finally {
      setJoining(false)
    }
  }

  const handleCreateAndJoinSchool = async () => {
    if (!user?.id || !manualSchoolName.trim()) {
      Alert.alert('Error', 'Please enter a school name')
      return
    }
    
    setCreatingSchool(true)
    try {
      // Create the school
      const { school, error: createError } = await createSchool({
        name: manualSchoolName.trim(),
        city: manualCity.trim() || undefined,
        state: manualState || undefined,
      })
      
      if (createError || !school) {
        Alert.alert('Error', createError || 'Failed to create school')
        return
      }
      
      // Join the school
      const { success, error: joinError } = await joinSchool(user.id, school.id, 'student')
      if (success) {
        Alert.alert('Success', `You have joined ${school.name}!`, [
          { text: 'OK', onPress: () => {
            setShowSearchModal(false)
            setShowManualEntry(false)
            setManualSchoolName('')
            setManualCity('')
            setManualState('')
            fetchMembership()
          }}
        ])
      } else {
        Alert.alert('Error', joinError || 'Failed to join school')
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to create school. Please try again.')
    } finally {
      setCreatingSchool(false)
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
          <Text style={styles.title}>My School</Text>
          <Text style={styles.subtitle}>Connect with students and share opportunities</Text>
        </View>

        {membership?.school ? (
          <View style={styles.schoolCard}>
            <View style={styles.schoolIcon}>
              <Ionicons name="business" size={32} color={ui.primary} />
            </View>
            <Text style={styles.schoolName}>{membership.school.name}</Text>
            <Text style={styles.schoolLocation}>
              {[membership.school.city, membership.school.state].filter(Boolean).join(', ')}
            </Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>{membership.role}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="business-outline" size={48} color={ui.textMuted} />
            </View>
            <Text style={styles.emptyTitle}>No school joined yet</Text>
            <Text style={styles.emptyDescription}>
              Search and join your school to connect with students and share opportunities.
            </Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowSearchModal(true)}
            >
              <Ionicons name="search" size={20} color={colors.white} />
              <Text style={styles.addButtonText}>Find My School</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Coming Soon</Text>
          <View style={styles.featureList}>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="megaphone-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>School Announcements</Text>
                <Text style={styles.featureDesc}>Post updates and reminders for students</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="calendar-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Events Calendar</Text>
                <Text style={styles.featureDesc}>Share important dates and deadlines</Text>
              </View>
            </View>
            <View style={styles.featureItem}>
              <View style={styles.featureIcon}>
                <Ionicons name="people-outline" size={20} color={ui.primary} />
              </View>
              <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>Student Directory</Text>
                <Text style={styles.featureDesc}>View students at your school</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowSearchModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowSearchModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Find Your School</Text>
            <View style={{ width: 60 }} />
          </View>

          <View style={styles.modalContent}>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by school name..."
                placeholderTextColor={ui.inputPlaceholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={handleSearch}
                disabled={searching}
              >
                {searching ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <Ionicons name="search" size={20} color={colors.white} />
                )}
              </TouchableOpacity>
            </View>

            {searchResults.length > 0 && (
              <ScrollView style={styles.resultsList}>
                {searchResults.map((school) => (
                  <TouchableOpacity
                    key={school.id}
                    style={styles.resultItem}
                    onPress={() => handleJoinSchool(school)}
                    disabled={joining}
                  >
                    <View style={styles.resultIcon}>
                      <Ionicons name="business-outline" size={24} color={ui.primary} />
                    </View>
                    <View style={styles.resultContent}>
                      <Text style={styles.resultName}>{school.name}</Text>
                      <Text style={styles.resultLocation}>
                        {[school.city, school.state].filter(Boolean).join(', ')}
                      </Text>
                    </View>
                    <Ionicons name="add-circle-outline" size={24} color={ui.primary} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            {searchQuery && searchResults.length === 0 && !searching && !showManualEntry && (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No schools found. Try a different search term.</Text>
                <TouchableOpacity 
                  style={styles.manualEntryLink}
                  onPress={() => setShowManualEntry(true)}
                >
                  <Text style={styles.manualEntryLinkText}>Can't find your school? Add it manually</Text>
                </TouchableOpacity>
              </View>
            )}

            {!showManualEntry && !searchQuery && (
              <View style={styles.noResults}>
                <TouchableOpacity 
                  style={styles.manualEntryLink}
                  onPress={() => setShowManualEntry(true)}
                >
                  <Text style={styles.manualEntryLinkText}>Can't find your school? Add it manually</Text>
                </TouchableOpacity>
              </View>
            )}

            {showManualEntry && (
              <View style={styles.manualEntryForm}>
                <Text style={styles.manualEntryTitle}>Add Your School</Text>
                
                <Text style={styles.inputLabel}>School Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter school name"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={manualSchoolName}
                  onChangeText={setManualSchoolName}
                />
                
                <Text style={styles.inputLabel}>City (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter city"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={manualCity}
                  onChangeText={setManualCity}
                />
                
                <Text style={styles.inputLabel}>State (optional)</Text>
                <TouchableOpacity 
                  style={styles.formInput}
                  onPress={() => setShowStatePicker(!showStatePicker)}
                >
                  <Text style={manualState ? styles.formInputText : styles.formInputPlaceholder}>
                    {manualState || 'Select state'}
                  </Text>
                </TouchableOpacity>
                
                {showStatePicker && (
                  <ScrollView style={styles.statePicker} nestedScrollEnabled>
                    {US_STATES.map((state) => (
                      <TouchableOpacity
                        key={state}
                        style={styles.stateOption}
                        onPress={() => {
                          setManualState(state)
                          setShowStatePicker(false)
                        }}
                      >
                        <Text style={[
                          styles.stateOptionText,
                          manualState === state && styles.stateOptionSelected
                        ]}>{state}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
                
                <View style={styles.manualEntryButtons}>
                  <TouchableOpacity 
                    style={styles.cancelEntryButton}
                    onPress={() => {
                      setShowManualEntry(false)
                      setManualSchoolName('')
                      setManualCity('')
                      setManualState('')
                    }}
                  >
                    <Text style={styles.cancelEntryButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.addSchoolButton, creatingSchool && styles.addSchoolButtonDisabled]}
                    onPress={handleCreateAndJoinSchool}
                    disabled={creatingSchool || !manualSchoolName.trim()}
                  >
                    {creatingSchool ? (
                      <ActivityIndicator color={colors.white} size="small" />
                    ) : (
                      <Text style={styles.addSchoolButtonText}>Add & Join School</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
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
  schoolCard: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 24,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  schoolIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: '600',
    color: ui.text,
    textAlign: 'center',
  },
  schoolLocation: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  roleBadge: {
    backgroundColor: ui.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: 12,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: ui.primary,
    textTransform: 'capitalize',
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
  featureList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    gap: 12,
  },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: ui.text,
  },
  featureDesc: {
    fontSize: 13,
    color: ui.textSecondary,
    marginTop: 2,
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
    flex: 1,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  searchInput: {
    flex: 1,
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  searchButton: {
    width: 52,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsList: {
    flex: 1,
  },
  resultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginBottom: 12,
    gap: 12,
  },
  resultIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultContent: {
    flex: 1,
  },
  resultName: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  resultLocation: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  noResults: {
    alignItems: 'center',
    padding: 32,
  },
  noResultsText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
  },
  manualEntryLink: {
    marginTop: 16,
    padding: 8,
  },
  manualEntryLinkText: {
    fontSize: 14,
    color: ui.primary,
    textDecorationLine: 'underline',
  },
  manualEntryForm: {
    flex: 1,
  },
  manualEntryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: ui.text,
    marginBottom: 8,
    marginTop: 16,
  },
  formInput: {
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    fontSize: 16,
    color: ui.inputText,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  formInputText: {
    fontSize: 16,
    color: ui.inputText,
  },
  formInputPlaceholder: {
    fontSize: 16,
    color: ui.inputPlaceholder,
  },
  statePicker: {
    maxHeight: 200,
    backgroundColor: ui.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    marginTop: 8,
  },
  stateOption: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  stateOptionText: {
    fontSize: 16,
    color: ui.text,
  },
  stateOptionSelected: {
    color: ui.primary,
    fontWeight: '600',
  },
  manualEntryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelEntryButton: {
    flex: 1,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.border,
    alignItems: 'center',
  },
  cancelEntryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.textSecondary,
  },
  addSchoolButton: {
    flex: 1,
    padding: 16,
    borderRadius: radius.md,
    backgroundColor: ui.primary,
    alignItems: 'center',
  },
  addSchoolButtonDisabled: {
    opacity: 0.5,
  },
  addSchoolButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
})
