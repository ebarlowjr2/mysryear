import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Href } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'
import { updateProfile, type UserRole } from '../../src/data/profile'
import { colors, ui, radius } from '../../src/theme'

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

// Sprint 10: Onboarding Router - routes to role-specific onboarding screens
export default function OnboardingRouterScreen() {
  const { user, profile, refreshProfile } = useAuth()
  const [step, setStep] = useState<1 | 2>(1)
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null)

  // Check if user already has a role and route accordingly
  useEffect(() => {
    if (profile?.role && !profile.onboarding_complete) {
      // User has role but hasn't completed onboarding - route to role-specific screen
      routeToRoleOnboarding(profile.role)
    } else if (profile?.onboarding_complete) {
      // Already completed onboarding - go to dashboard
      router.replace('/(tabs)')
    }
  }, [profile])

  const routeToRoleOnboarding = (role: UserRole) => {
    switch (role) {
      case 'student':
        router.replace('/onboarding/student' as Href)
        break
      case 'teacher':
        router.replace('/onboarding/teacher' as Href)
        break
      case 'parent':
        router.replace('/onboarding/parent' as Href)
        break
      case 'business':
        router.replace('/onboarding/business' as Href)
        break
    }
  }

  const handleNext = () => {
    if (step === 1) {
      setStep(2)
    }
  }

  const handleSelectRole = async () => {
    if (!user || !selectedRole) return

    setLoading(true)
    try {
      // Save the role to profile
      await updateProfile(user.id, { role: selectedRole })
      await refreshProfile()
      
      // Route to role-specific onboarding
      routeToRoleOnboarding(selectedRole)
    } catch (err) {
      console.error('Failed to set role:', err)
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
            style={[styles.roleCard, selectedRole === option.value && styles.roleCardActive]}
            onPress={() => setSelectedRole(option.value)}
          >
            <View style={[styles.roleIconContainer, selectedRole === option.value && styles.roleIconContainerActive]}>
              <Ionicons 
                name={option.icon} 
                size={24} 
                color={selectedRole === option.value ? ui.primary : ui.textSecondary} 
              />
            </View>
            <View style={styles.roleCardContent}>
              <Text style={[styles.roleCardTitle, selectedRole === option.value && styles.roleCardTitleActive]}>
                {option.label}
              </Text>
              <Text style={styles.roleCardDescription}>{option.description}</Text>
            </View>
            {selectedRole === option.value && (
              <Ionicons name="checkmark-circle" size={24} color={ui.primary} />
            )}
          </TouchableOpacity>
        ))}
      </View>
    </View>
  )

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.progressContainer}>
          {[1, 2].map((s) => (
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

        <View style={styles.footer}>
          {step === 1 ? (
            <TouchableOpacity
              style={styles.nextButton}
              onPress={handleNext}
            >
              <Text style={styles.nextButtonText}>Let's Go</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.nextButton, (!selectedRole || loading) && styles.buttonDisabled]}
              onPress={handleSelectRole}
              disabled={!selectedRole || loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.nextButtonText}>Continue</Text>
              )}
            </TouchableOpacity>
          )}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
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
    paddingVertical: 24,
  },
  nextButton: {
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
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
