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
import { completeCanonicalOnboarding, type CanonicalRole } from '../../src/data/identity'
import { searchSchools, type School } from '../../src/data/schools'
import { colors, ui, radius } from '../../src/theme'

type OnboardingStep = 1 | 2 | 3

type RoleOption = {
  value: CanonicalRole
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
    value: 'guardian',
    label: 'Guardian',
    description: 'Support and manage a student profile',
    icon: 'people-outline',
  },
  {
    value: 'counselor',
    label: 'Counselor',
    description: 'Support students by invitation',
    icon: 'briefcase-outline',
  },
]

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [loading, setLoading] = useState(false)
  
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [schoolQuery, setSchoolQuery] = useState('')
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [schoolResults, setSchoolResults] = useState<School[]>([])
  const [searchingSchools, setSearchingSchools] = useState(false)
  const [graduationYear, setGraduationYear] = useState('')
  const [role, setRole] = useState<CanonicalRole | null>(null)

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
      const result = await completeCanonicalOnboarding({
        userId: user.id,
        email: user.email || undefined,
        role: role || 'student',
        firstName: firstName || null,
        lastName: lastName || null,
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : null,
        schoolId,
      })
      if (!result.success) throw new Error(result.error || 'Failed to complete onboarding')
      await refreshProfile()
      
      router.replace('/(app)')
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
      await completeCanonicalOnboarding({ userId: user.id, email: user.email || undefined, role: 'student' })
      await refreshProfile()
      router.replace('/(app)')
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

  const handleSchoolSearch = async (text: string) => {
    setSchoolQuery(text)
    setSchoolId(null)
    if (text.trim().length < 2) {
      setSchoolResults([])
      return
    }
    setSearchingSchools(true)
    try {
      setSchoolResults(await searchSchools(text))
    } finally {
      setSearchingSchools(false)
    }
  }

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <Text style={styles.stepTitle}>{role === 'counselor' ? 'Counselor Setup' : 'Student Profile'}</Text>
      <Text style={styles.stepDescription}>
        {role === 'counselor'
          ? 'Counselor access starts after a student or parent invites you.'
          : 'Create the student planning profile used across web and mobile.'}
      </Text>

      {role !== 'counselor' && (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Student First Name</Text>
            <TextInput style={styles.input} placeholder="First name" placeholderTextColor={ui.inputPlaceholder} value={firstName} onChangeText={setFirstName} autoCapitalize="words" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Student Last Name</Text>
            <TextInput style={styles.input} placeholder="Last name" placeholderTextColor={ui.inputPlaceholder} value={lastName} onChangeText={setLastName} autoCapitalize="words" />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>High School</Text>
            <TextInput style={styles.input} placeholder="Search your school" placeholderTextColor={ui.inputPlaceholder} value={schoolQuery} onChangeText={handleSchoolSearch} autoCapitalize="words" />
            {searchingSchools && <Text style={styles.helperText}>Searching...</Text>}
            {schoolResults.slice(0, 6).map((school) => (
              <TouchableOpacity key={school.id} style={styles.schoolResult} onPress={() => { setSchoolId(school.id); setSchoolQuery(`${school.name}${school.city ? `, ${school.city}` : ''}${school.state ? `, ${school.state}` : ''}`); setSchoolResults([]) }}>
                <Text style={styles.schoolResultName}>{school.name}</Text>
                <Text style={styles.schoolResultMeta}>{[school.city, school.state].filter(Boolean).join(', ')}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Graduation Year</Text>
            <TextInput style={styles.input} placeholder="e.g., 2030" placeholderTextColor={ui.inputPlaceholder} value={graduationYear} onChangeText={setGraduationYear} keyboardType="number-pad" maxLength={4} />
          </View>
        </>
      )}
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
  helperText: {
    color: ui.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  schoolResult: {
    backgroundColor: ui.backgroundSecondary,
    borderRadius: radius.md,
    padding: 12,
    marginTop: 8,
    borderWidth: 1,
    borderColor: ui.border,
  },
  schoolResultName: {
    color: ui.text,
    fontWeight: '600',
  },
  schoolResultMeta: {
    color: ui.textSecondary,
    fontSize: 12,
    marginTop: 2,
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
