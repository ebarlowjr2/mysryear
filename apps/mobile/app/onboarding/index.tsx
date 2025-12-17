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
import { router } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { updateProfile, completeOnboarding } from '../../src/data/profile'

type OnboardingStep = 1 | 2 | 3

export default function OnboardingScreen() {
  const { user, refreshProfile } = useAuth()
  const [step, setStep] = useState<OnboardingStep>(1)
  const [loading, setLoading] = useState(false)
  
  const [fullName, setFullName] = useState('')
  const [school, setSchool] = useState('')
  const [graduationYear, setGraduationYear] = useState('')
  const [role, setRole] = useState<'student' | 'parent' | 'counselor' | ''>('')

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
      await completeOnboarding(user.id)
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
      <Text style={styles.stepTitle}>Tell us about yourself</Text>
      <Text style={styles.stepDescription}>
        This helps us customize your dashboard and recommendations.
      </Text>
      
      <View style={styles.formGroup}>
        <Text style={styles.label}>Your Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor="#666"
          value={fullName}
          onChangeText={setFullName}
          autoCapitalize="words"
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleButtons}>
          {(['student', 'parent', 'counselor'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleButton, role === r && styles.roleButtonActive]}
              onPress={() => setRole(r)}
            >
              <Text style={[styles.roleButtonText, role === r && styles.roleButtonTextActive]}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
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
          placeholderTextColor="#666"
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
          placeholderTextColor="#666"
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
    backgroundColor: '#0f172a',
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
    color: '#64748b',
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
    backgroundColor: '#334155',
  },
  progressDotActive: {
    backgroundColor: '#3b82f6',
    width: 24,
  },
  progressDotCompleted: {
    backgroundColor: '#3b82f6',
  },
  stepContent: {
    flex: 1,
    justifyContent: 'center',
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#94a3b8',
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
    color: '#94a3b8',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  roleButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#334155',
  },
  roleButtonActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  roleButtonText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  roleButtonTextActive: {
    color: '#3b82f6',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 24,
  },
  backButton: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  nextButton: {
    flex: 2,
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonFull: {
    flex: 1,
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
})
