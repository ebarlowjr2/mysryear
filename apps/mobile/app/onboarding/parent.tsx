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
  Alert,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Href } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { completeOnboarding } from '../../src/data/profile'
import { linkStudent } from '../../src/api/edge'
import { colors, ui, radius } from '../../src/theme'

export default function ParentOnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [linkMode, setLinkMode] = useState(false)
  const [studentEmail, setStudentEmail] = useState('')
  const [linkError, setLinkError] = useState<string | null>(null)
  const [linkSuccess, setLinkSuccess] = useState(false)

  const handleLinkStudent = async () => {
    if (!user?.id || !studentEmail.trim()) return
    
    setLoading(true)
    setLinkError(null)
    
    try {
      const result = await linkStudent(studentEmail.trim())
      
      if (!result.success) {
        setLinkError(result.message || 'Failed to send link request')
      } else {
        setLinkSuccess(true)
        // Complete onboarding after successful link
        await completeOnboarding(user.id)
        await refreshProfile()
        
        Alert.alert(
          'Link Request Sent',
          result.message || 'Your student will need to accept the link request in their app.',
          [{ text: 'Continue', onPress: () => router.replace('/(tabs)' as Href) }]
        )
      }
    } catch (error: unknown) {
      console.error('Failed to link student:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to send link request. Please try again.'
      setLinkError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!user?.id) return

    setLoading(true)
    try {
      await completeOnboarding(user.id)
      await refreshProfile()
      router.replace('/(tabs)' as Href)
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  if (linkMode) {
    return (
      <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setLinkMode(false)}
              >
                <Ionicons name="arrow-back" size={24} color={ui.text} />
              </TouchableOpacity>
              <Ionicons name="link-outline" size={48} color={ui.primary} />
              <Text style={styles.title}>Link Your Student</Text>
              <Text style={styles.subtitle}>
                Enter your student's email address to send them a link request.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Student's Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="student@email.com"
                placeholderTextColor={ui.inputPlaceholder}
                value={studentEmail}
                onChangeText={(text) => {
                  setStudentEmail(text)
                  setLinkError(null)
                }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {linkError && (
                <Text style={styles.errorText}>{linkError}</Text>
              )}
            </View>

            <View style={styles.infoBox}>
              <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
              <Text style={styles.infoText}>
                Your student will receive a notification to accept your link request. Once accepted, you'll be able to view their tasks, applications, and deadlines.
              </Text>
            </View>

            <View style={styles.footer}>
              <TouchableOpacity
                style={[styles.primaryButton, (!studentEmail.trim() || loading) && styles.buttonDisabled]}
                onPress={handleLinkStudent}
                disabled={!studentEmail.trim() || loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Send Link Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons name="people-outline" size={48} color={ui.primary} />
          <Text style={styles.title}>Parent Setup</Text>
          <Text style={styles.subtitle}>
            Monitor and support your student's college prep journey.
          </Text>
        </View>

        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>What you can do as a parent:</Text>
          
          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="eye-outline" size={24} color={ui.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>View Progress</Text>
              <Text style={styles.featureDescription}>
                See your student's tasks, applications, and scholarship progress
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={24} color={ui.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Track Deadlines</Text>
              <Text style={styles.featureDescription}>
                Stay informed about upcoming application and scholarship deadlines
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <View style={styles.featureIcon}>
              <Ionicons name="add-circle-outline" size={24} color={ui.primary} />
            </View>
            <View style={styles.featureContent}>
              <Text style={styles.featureTitle}>Assign Tasks</Text>
              <Text style={styles.featureDescription}>
                Help your student stay on track by assigning tasks to their planner
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setLinkMode(true)}
          >
            <Ionicons name="link-outline" size={20} color={colors.white} />
            <Text style={styles.primaryButtonText}>Link a Student Now</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleSkip}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={ui.text} />
            ) : (
              <Text style={styles.secondaryButtonText}>Do This Later</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.laterNote}>
            You can link a student anytime from your Profile
          </Text>
        </View>
      </ScrollView>
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
  backButton: {
    position: 'absolute',
    top: 32,
    left: 0,
    padding: 8,
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
  errorText: {
    fontSize: 13,
    color: colors.error,
    marginTop: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: ui.primaryLight,
    borderRadius: radius.md,
    padding: 16,
    gap: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: ui.primary,
    lineHeight: 20,
  },
  featuresSection: {
    marginBottom: 32,
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 20,
  },
  featureItem: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 16,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    lineHeight: 20,
  },
  actionSection: {
    marginTop: 'auto',
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
  laterNote: {
    fontSize: 13,
    color: ui.textMuted,
    textAlign: 'center',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
})
