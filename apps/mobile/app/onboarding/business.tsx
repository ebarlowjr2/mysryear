import React, { useState } from 'react'
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
import { colors, ui, radius } from '../../src/theme'
import { US_STATES } from '../../src/data/opportunities'

export default function BusinessOnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  
  // Business profile fields
  const [orgName, setOrgName] = useState('')
  const [orgState, setOrgState] = useState('')
  const [orgCounties, setOrgCounties] = useState('')
  
  // State picker
  const [statePickerVisible, setStatePickerVisible] = useState(false)

  const handleComplete = async (createOpportunity: boolean) => {
    if (!user?.id) return
    if (!orgName.trim()) return

    setLoading(true)
    try {
      // Parse counties (comma-separated, max 4)
      const countiesArray = orgCounties
        .split(',')
        .map(c => c.trim())
        .filter(c => c.length > 0)
        .slice(0, 4)

      await updateProfile(user.id, {
        org_name: orgName.trim(),
        org_state: orgState || null,
        org_counties: countiesArray.length > 0 ? countiesArray : null,
      })
      
      await completeOnboarding(user.id)
      await refreshProfile()
      
      if (createOpportunity) {
        // Go to create opportunity modal
        router.replace('/(modals)/opportunity-new' as Href)
      } else {
        // Go to dashboard
        router.replace('/(tabs)' as Href)
      }
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const canComplete = orgName.trim().length > 0

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Ionicons name="business-outline" size={48} color={ui.primary} />
            <Text style={styles.title}>Business Setup</Text>
            <Text style={styles.subtitle}>
              Post opportunities and connect with students in your area.
            </Text>
          </View>

          {/* Organization Name */}
          <View style={styles.section}>
            <Text style={styles.label}>Organization Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your organization name"
              placeholderTextColor={ui.inputPlaceholder}
              value={orgName}
              onChangeText={setOrgName}
              autoCapitalize="words"
            />
          </View>

          {/* State */}
          <View style={styles.section}>
            <Text style={styles.label}>State (recommended)</Text>
            <Text style={styles.labelHint}>
              Helps students in your area find your opportunities
            </Text>
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setStatePickerVisible(true)}
            >
              <Text style={orgState ? styles.selectButtonText : styles.selectButtonPlaceholder}>
                {orgState || 'Select your state'}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Counties */}
          <View style={styles.section}>
            <Text style={styles.label}>Counties (optional, max 4)</Text>
            <Text style={styles.labelHint}>
              Target specific counties for local opportunities
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Jefferson, Shelby, Madison"
              placeholderTextColor={ui.inputPlaceholder}
              value={orgCounties}
              onChangeText={setOrgCounties}
              autoCapitalize="words"
            />
          </View>

          {/* Verification Note */}
          <View style={styles.verificationNote}>
            <View style={styles.verificationNoteIcon}>
              <Ionicons name="shield-checkmark-outline" size={24} color="#B45309" />
            </View>
            <View style={styles.verificationNoteContent}>
              <Text style={styles.verificationNoteTitle}>Get Verified</Text>
              <Text style={styles.verificationNoteText}>
                After setup, request verification in your Profile. Verified businesses appear more prominently and build trust with students.
              </Text>
            </View>
          </View>

          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.primaryButton, (!canComplete || loading) && styles.buttonDisabled]}
              onPress={() => handleComplete(true)}
              disabled={!canComplete || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={colors.white} />
                  <Text style={styles.primaryButtonText}>Create First Opportunity</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryButton, (!canComplete || loading) && styles.buttonDisabled]}
              onPress={() => handleComplete(false)}
              disabled={!canComplete || loading}
            >
              <Text style={styles.secondaryButtonText}>Finish Setup</Text>
            </TouchableOpacity>

            {!canComplete && (
              <Text style={styles.requiredNote}>
                * Organization name is required
              </Text>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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
                  setOrgState(item)
                  setStatePickerVisible(false)
                }}
              >
                <Text style={styles.stateItemText}>{item}</Text>
                {orgState === item && (
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
    marginBottom: 4,
  },
  labelHint: {
    fontSize: 13,
    color: ui.textMuted,
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
  verificationNote: {
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: radius.lg,
    padding: 16,
    marginBottom: 24,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  verificationNoteIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FDE68A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  verificationNoteContent: {
    flex: 1,
  },
  verificationNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#92400E',
    marginBottom: 4,
  },
  verificationNoteText: {
    fontSize: 13,
    color: '#B45309',
    lineHeight: 18,
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 24,
  },
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
    borderWidth: 1,
    borderColor: ui.border,
  },
  secondaryButtonText: {
    color: ui.text,
    fontSize: 16,
    fontWeight: '600',
  },
  requiredNote: {
    fontSize: 13,
    color: ui.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
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
