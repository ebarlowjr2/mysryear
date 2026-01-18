import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Href } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { updateProfile, completeOnboarding } from '../../src/data/profile'
import { searchSchools, joinSchool, createSchool, type School } from '../../src/data/schools'
import { colors, ui, radius } from '../../src/theme'
import { US_STATES } from '../../src/data/opportunities'

// Common Alabama counties for quick selection
const COMMON_COUNTIES = [
  'Jefferson', 'Mobile', 'Madison', 'Montgomery', 'Shelby',
  'Baldwin', 'Tuscaloosa', 'Lee', 'Morgan', 'Calhoun'
]

export default function StudentOnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // School selection
  const [schoolModalVisible, setSchoolModalVisible] = useState(false)
  const [schoolSearch, setSchoolSearch] = useState('')
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [searchingSchools, setSearchingSchools] = useState(false)
  const [selectedSchool, setSelectedSchool] = useState<School | null>(null)
  
  // Manual school entry
  const [manualEntryMode, setManualEntryMode] = useState(false)
  const [manualSchoolName, setManualSchoolName] = useState('')
  const [manualSchoolCity, setManualSchoolCity] = useState('')
  const [manualSchoolState, setManualSchoolState] = useState('')
  
  // Profile fields
  const [graduationYear, setGraduationYear] = useState('')
  const [state, setState] = useState('')
  const [county, setCounty] = useState('')
  
  // State picker
  const [statePickerVisible, setStatePickerVisible] = useState(false)

  // Search schools when query changes
  useEffect(() => {
    const searchTimer = setTimeout(async () => {
      if (schoolSearch.length >= 2) {
        setSearchingSchools(true)
        try {
          const results = await searchSchools(schoolSearch)
          setSchoolResults(results)
        } catch (error) {
          console.error('School search error:', error)
        } finally {
          setSearchingSchools(false)
        }
      } else {
        setSchoolResults([])
      }
    }, 300)

    return () => clearTimeout(searchTimer)
  }, [schoolSearch])

  const handleSelectSchool = async (school: School) => {
    if (!user?.id) return
    
    setLoading(true)
    try {
      await joinSchool(user.id, school.id, 'student')
      setSelectedSchool(school)
      setSchoolModalVisible(false)
      
      // Auto-fill state if school has it
      if (school.state && !state) {
        setState(school.state)
      }
    } catch (error) {
      console.error('Failed to join school:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleManualSchoolEntry = async () => {
    if (!user?.id || !manualSchoolName.trim()) return
    
    setLoading(true)
    try {
      const result = await createSchool({
        name: manualSchoolName.trim(),
        city: manualSchoolCity.trim() || undefined,
        state: manualSchoolState || undefined,
      })
      
      if (result.error || !result.school) {
        console.error('Failed to create school:', result.error)
        return
      }
      
      await joinSchool(user.id, result.school.id, 'student')
      setSelectedSchool(result.school)
      setManualEntryMode(false)
      setSchoolModalVisible(false)
      
      // Auto-fill state if provided
      if (manualSchoolState && !state) {
        setState(manualSchoolState)
      }
    } catch (error) {
      console.error('Failed to create school:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    if (!user?.id) return
    if (!selectedSchool) {
      // School is required for students
      return
    }
    if (!graduationYear) {
      // Graduation year is required
      return
    }

    setLoading(true)
    try {
      await updateProfile(user.id, {
        graduation_year: parseInt(graduationYear, 10),
        state: state || null,
        county: county || null,
      })
      
      await completeOnboarding(user.id)
      await refreshProfile()
      
      router.replace('/(tabs)' as Href)
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const canComplete = selectedSchool && graduationYear.length === 4

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="school-outline" size={48} color={ui.primary} />
            <Text style={styles.title}>Student Setup</Text>
            <Text style={styles.subtitle}>
              Help us find scholarships and opportunities relevant to you.
            </Text>
          </View>

          {/* School Selection */}
          <View style={styles.section}>
            <Text style={styles.label}>Your School *</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setSchoolModalVisible(true)}
            >
              {selectedSchool ? (
                <View style={styles.selectedSchool}>
                  <Ionicons name="checkmark-circle" size={20} color={colors.success} />
                  <Text style={styles.selectedSchoolText} numberOfLines={1}>
                    {selectedSchool.name}
                  </Text>
                </View>
              ) : (
                <Text style={styles.selectButtonPlaceholder}>Select your school</Text>
              )}
              <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Graduation Year */}
          <View style={styles.section}>
            <Text style={styles.label}>Graduation Year *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 2025"
              placeholderTextColor={ui.inputPlaceholder}
              value={graduationYear}
              onChangeText={setGraduationYear}
              keyboardType="number-pad"
              maxLength={4}
            />
          </View>

          {/* State */}
          <View style={styles.section}>
            <Text style={styles.label}>State (recommended)</Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setStatePickerVisible(true)}
            >
              <Text style={state ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {state || 'Select your state'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
            </TouchableOpacity>
          </View>

          {/* County */}
          <View style={styles.section}>
            <Text style={styles.label}>County (recommended)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Jefferson"
              placeholderTextColor={ui.inputPlaceholder}
              value={county}
              onChangeText={setCounty}
              autoCapitalize="words"
            />
            {state === 'Alabama' && (
              <View style={styles.quickCounties}>
                {COMMON_COUNTIES.slice(0, 5).map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.quickCountyChip, county === c && styles.quickCountyChipActive]}
                    onPress={() => setCounty(c)}
                  >
                    <Text style={[styles.quickCountyText, county === c && styles.quickCountyTextActive]}>
                      {c}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.completeButton, !canComplete && styles.buttonDisabled]}
              onPress={handleComplete}
              disabled={!canComplete || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.completeButtonText}>Get Started</Text>
              )}
            </TouchableOpacity>
            {!canComplete && (
              <Text style={styles.requiredNote}>
                * School and graduation year are required
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* School Search Modal */}
      <Modal
        visible={schoolModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSchoolModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Find Your School</Text>
            <TouchableOpacity onPress={() => setSchoolModalVisible(false)}>
              <Ionicons name="close" size={24} color={ui.text} />
            </TouchableOpacity>
          </View>

          {!manualEntryMode ? (
            <>
              <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color={ui.textMuted} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search by school name..."
                  placeholderTextColor={ui.inputPlaceholder}
                  value={schoolSearch}
                  onChangeText={setSchoolSearch}
                  autoFocus
                />
              </View>

              {searchingSchools ? (
                <View style={styles.searchLoading}>
                  <ActivityIndicator size="small" color={ui.primary} />
                  <Text style={styles.searchLoadingText}>Searching...</Text>
                </View>
              ) : (
                <FlatList
                  data={schoolResults}
                  keyExtractor={(item) => item.id}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.schoolItem}
                      onPress={() => handleSelectSchool(item)}
                    >
                      <View style={styles.schoolItemContent}>
                        <Text style={styles.schoolItemName}>{item.name}</Text>
                        {(item.city || item.state) && (
                          <Text style={styles.schoolItemLocation}>
                            {[item.city, item.state].filter(Boolean).join(', ')}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
                    </TouchableOpacity>
                  )}
                  ListEmptyComponent={
                    schoolSearch.length >= 2 ? (
                      <View style={styles.emptyResults}>
                        <Text style={styles.emptyResultsText}>No schools found</Text>
                        <TouchableOpacity
                          style={styles.manualEntryLink}
                          onPress={() => setManualEntryMode(true)}
                        >
                          <Text style={styles.manualEntryLinkText}>
                            Can't find your school? Add it manually
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.emptyResults}>
                        <Text style={styles.emptyResultsText}>
                          Type at least 2 characters to search
                        </Text>
                      </View>
                    )
                  }
                />
              )}

              {schoolResults.length > 0 && (
                <TouchableOpacity
                  style={styles.manualEntryButton}
                  onPress={() => setManualEntryMode(true)}
                >
                  <Text style={styles.manualEntryButtonText}>
                    Can't find your school? Add it manually
                  </Text>
                </TouchableOpacity>
              )}
            </>
          ) : (
            <View style={styles.manualEntryForm}>
              <Text style={styles.manualEntryTitle}>Add Your School</Text>
              
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>School Name *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter school name"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={manualSchoolName}
                  onChangeText={setManualSchoolName}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>City (optional)</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="Enter city"
                  placeholderTextColor={ui.inputPlaceholder}
                  value={manualSchoolCity}
                  onChangeText={setManualSchoolCity}
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>State (optional)</Text>
                <TouchableOpacity
                  style={styles.formSelect}
                  onPress={() => setStatePickerVisible(true)}
                >
                  <Text style={manualSchoolState ? styles.formSelectText : styles.formSelectPlaceholder}>
                    {manualSchoolState || 'Select state'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={ui.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.manualEntryButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={() => setManualEntryMode(false)}
                >
                  <Text style={styles.cancelButtonText}>Back to Search</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addButton, !manualSchoolName.trim() && styles.buttonDisabled]}
                  onPress={handleManualSchoolEntry}
                  disabled={!manualSchoolName.trim() || loading}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={styles.addButtonText}>Add & Join School</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </SafeAreaView>
      </Modal>

      {/* State Picker Modal */}
      <Modal
        visible={statePickerVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setStatePickerVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select State</Text>
            <TouchableOpacity onPress={() => setStatePickerVisible(false)}>
              <Ionicons name="close" size={24} color={ui.text} />
            </TouchableOpacity>
          </View>
          <FlatList
            data={US_STATES}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.stateItem}
                onPress={() => {
                  if (manualEntryMode) {
                    setManualSchoolState(item)
                  } else {
                    setState(item)
                  }
                  setStatePickerVisible(false)
                }}
              >
                <Text style={styles.stateItemText}>{item}</Text>
                {(manualEntryMode ? manualSchoolState : state) === item && (
                  <Ionicons name="checkmark" size={20} color={ui.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    marginTop: 16,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  section: {
    marginBottom: 24,
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
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  selectButtonText: {
    fontSize: 16,
    color: ui.inputText,
  },
  selectButtonPlaceholder: {
    fontSize: 16,
    color: ui.inputPlaceholder,
  },
  selectedSchool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  selectedSchoolText: {
    fontSize: 16,
    color: ui.inputText,
    flex: 1,
  },
  quickCounties: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 12,
  },
  quickCountyChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: ui.backgroundSecondary,
    borderWidth: 1,
    borderColor: ui.border,
  },
  quickCountyChipActive: {
    backgroundColor: ui.primaryLight,
    borderColor: ui.primary,
  },
  quickCountyText: {
    fontSize: 13,
    color: ui.textSecondary,
  },
  quickCountyTextActive: {
    color: ui.primary,
    fontWeight: '600',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  completeButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  completeButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  requiredNote: {
    fontSize: 13,
    color: ui.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: ui.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    margin: 16,
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    padding: 12,
    fontSize: 16,
    color: ui.inputText,
  },
  searchLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 14,
    color: ui.textSecondary,
  },
  schoolItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  schoolItemContent: {
    flex: 1,
  },
  schoolItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: ui.text,
  },
  schoolItemLocation: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
  emptyResults: {
    padding: 24,
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
  },
  manualEntryLink: {
    marginTop: 16,
  },
  manualEntryLinkText: {
    fontSize: 14,
    color: ui.primary,
    fontWeight: '500',
  },
  manualEntryButton: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: ui.border,
    alignItems: 'center',
  },
  manualEntryButtonText: {
    fontSize: 14,
    color: ui.primary,
    fontWeight: '500',
  },
  manualEntryForm: {
    padding: 24,
  },
  manualEntryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: ui.textSecondary,
    marginBottom: 8,
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
  formSelect: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: ui.inputBackground,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.inputBorder,
  },
  formSelectText: {
    fontSize: 16,
    color: ui.inputText,
  },
  formSelectPlaceholder: {
    fontSize: 16,
    color: ui.inputPlaceholder,
  },
  manualEntryButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.border,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  addButton: {
    flex: 1,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.white,
  },
  stateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: ui.border,
  },
  stateItemText: {
    fontSize: 16,
    color: ui.text,
  },
})
