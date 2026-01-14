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
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { updateProfile, completeOnboarding, type UserRole } from '../../src/data/profile'
import { colors, ui, radius } from '../../src/theme'

type OnboardingStep = 1 | 2 | 3

type RoleOption = {
  value: UserRole
  label: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: 'student',
    label: 'Student',
    description: 'Track scholarships, deadlines, and college prep',
    icon: 'school-outline',
  },
  {
    value: 'parent',
    label: 'Parent',
    description: 'Monitor and support your student\'s journey',
    icon: 'people-outline',
  },
  {
    value: 'teacher',
    label: 'Teacher / Staff',
    description: 'Connect with students and share opportunities',
    icon: 'briefcase-outline',
  },
  {
    value: 'business',
    label: 'Business',
    description: 'Post internships, webinars, and opportunities',
    icon: 'business-outline',
  },
]

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [loading, setLoading] = useState(false)
  
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [role, setRole] = useState<UserRole | null>(null)

  const handleNext = () => {
    if (step < 3) {
      setStep((step + 1) as OnboardingStep)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep((step - 1) as OnboardingStep)
    }
  }

  const handleComplete = async () => {
    if (!user) return

    setLoading(true)
    try {
      await updateProfile(user.id, {
        full_name: fullName || null,
        school: school || null,
        graduation_year: graduationYear ? parseInt(graduationYear, 10) : null,
        role: role || null,
      })
      
      await completeOnboarding(user.id)
      await refreshProfile()
      
      router.replace('/(tabs)')
    } catch (err) {
      console.error('Failed to complete onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    if (!user) return

    setLoading(true)
    try {
      await completeOnboarding(user.id)
      await refreshProfile()
      router.replace('/(tabs)')
    } catch (err) {
      console.error('Failed to skip onboarding:', err)
    } finally {
      setLoading(false)
    }
  }

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Welcome to My SR Year!</Text>
      <Text style={styles.stepDescription}>
        Let's personalize your experience. We'll ask a few quick questions to help you get the most out of the app.
      </Text>
      <View style={styles.illustration}>
        <Text style={styles.illustrationEmoji}>🎓</Text>
      </View>
    </View>
  )

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>Choose your account type</Text>
      <Text style={styles.stepDescription}>
        This helps us customize your experience.
      </Text>
      
      <View style={styles.roleCardsContainer}>
        {ROLE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[styles.roleCard, role === option.value && styles.roleCardActive]}
            onPress={() => setRole(option.value)}
          >
            <View style={[styles.roleIconContainer, role === option.value && styles.roleIconContainerActive]}>
              <Ionicons 
                name={option.icon} 
                size={24} 
                color={role === option.value ? ui.primary : ui.textSecondary} 
              />
            </View>
            <View style={styles.roleCardContent}>
              <Text style={[styles.roleCardTitle, role === option.value && styles.roleCardTitleActive]}>
                {option.label}
              </Text>
              <Text style={styles.roleCardDescription}>{option.description}</Text>
            </View>
            {role === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={ui.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>School Information</Text>
      <Text style={styles.stepDescription}>
        Help us find scholarships and deadlines relevant to you.
      </Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>School Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your school name"
          placeholderTextColor={ui.inputPlaceholder}
          value={school}
          onChangeText={setSchool}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Graduation Year</Text>
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
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity onPress={handleSkip} disabled={loading}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.progressContainer}>
            {[1, 2, 3].map((s) => (
              <View
                key={s}
                style={[
                  styles.progressDot,
                  s === step && styles.progressDotActive,
                  s < step && styles.progressDotCompleted,
                ]}
              />
            ))}
          </View>

          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}

          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity style={styles.backButton} onPress={handleBack} disabled={loading}>
                <Text style={styles.backButtonText}>Back</Text>
              </TouchableOpacity>
            )}
            
            {step < 3 ? (
              <TouchableOpacity
                style={[styles.nextButton, step === 1 && styles.nextButtonFull]}
                onPress={handleNext}
              >
                <Text style={styles.nextButtonText}>
                  {step === 1 ? "Let's Go" : 'Next'}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.nextButton, loading && styles.buttonDisabled]}
                onPress={handleComplete}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.nextButtonText}>Get Started</Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 16,
  },
  skipText: {
    color: ui.textMuted,
    fontSize: 16,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 32,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: ui.border,
  },
  progressDotActive: {
    backgroundColor: ui.primary,
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: ui.primary,
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  illustration: {
    alignItems: 'center',
    marginVertical: 40,
  },
  illustrationEmoji: {
    fontSize: 80,
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
  roleCardsContainer: {
    gap: 12,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    borderWidth: 1,
    borderColor: ui.border,
    gap: 12,
  },
  roleCardActive: {
    backgroundColor: ui.primaryLight,
    borderColor: ui.primary,
  },
  roleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleIconContainerActive: {
    backgroundColor: colors.white,
  },
  roleCardContent: {
    flex: 1,
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 2,
  },
  roleCardTitleActive: {
    color: ui.primary,
  },
  roleCardDescription: {
    fontSize: 13,
    color: ui.textSecondary,
    lineHeight: 18,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: ui.border,
  },
  backButtonText: {
    color: ui.text,
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})
