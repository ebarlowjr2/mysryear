import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import { colors, ui, radius, shadow } from '../../src/theme'

type TestInfo = {
  id: string
  name: string
  fullName: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
  features: string[]
}

const TESTS: Record<string, TestInfo> = {
  sat: {
    id: 'sat',
    name: 'SAT',
    fullName: 'SAT (Scholastic Assessment Test)',
    description: 'The SAT is a standardized test widely used for college admissions in the United States. It tests reading, writing, and math skills.',
    icon: 'school-outline',
    color: '#1976D2',
    bgColor: '#E3F2FD',
    features: [
      'Practice questions for Reading & Writing',
      'Math section practice with explanations',
      'Full-length practice tests',
      'Score tracking and analytics',
      'Study schedule generator',
    ],
  },
  act: {
    id: 'act',
    name: 'ACT',
    fullName: 'ACT (American College Testing)',
    description: 'The ACT is a standardized test used for college admissions. It covers English, mathematics, reading, and science reasoning.',
    icon: 'document-text-outline',
    color: '#388E3C',
    bgColor: '#E8F5E9',
    features: [
      'English section practice',
      'Math practice with step-by-step solutions',
      'Reading comprehension exercises',
      'Science reasoning practice',
      'Optional writing section prep',
    ],
  },
  psat: {
    id: 'psat',
    name: 'PSAT',
    fullName: 'PSAT/NMSQT',
    description: 'The PSAT/NMSQT is a preliminary test that prepares students for the SAT and qualifies them for the National Merit Scholarship Program.',
    icon: 'ribbon-outline',
    color: '#7B1FA2',
    bgColor: '#F3E5F5',
    features: [
      'SAT-style practice questions',
      'National Merit Scholarship info',
      'Score prediction tools',
      'Personalized study plans',
      'Progress tracking',
    ],
  },
  ap: {
    id: 'ap',
    name: 'AP Exams',
    fullName: 'Advanced Placement Exams',
    description: 'AP Exams are standardized exams designed to measure how well you\'ve mastered the content and skills of a specific AP course.',
    icon: 'trophy-outline',
    color: '#F57C00',
    bgColor: '#FFF3E0',
    features: [
      'Subject-specific practice tests',
      'Free response question practice',
      'Multiple choice drills',
      'Scoring guidelines and rubrics',
      'Study guides for all AP subjects',
    ],
  },
  clep: {
    id: 'clep',
    name: 'CLEP',
    fullName: 'College Level Examination Program',
    description: 'CLEP exams allow you to earn college credit by demonstrating mastery of college-level material in various subjects.',
    icon: 'medal-outline',
    color: '#C2185B',
    bgColor: '#FCE4EC',
    features: [
      'Practice exams for all CLEP subjects',
      'Credit equivalency information',
      'Study materials and guides',
      'Test-taking strategies',
      'Score requirements by college',
    ],
  },
  toefl: {
    id: 'toefl',
    name: 'TOEFL',
    fullName: 'Test of English as a Foreign Language',
    description: 'TOEFL measures the English language ability of non-native speakers wishing to enroll in English-speaking universities.',
    icon: 'globe-outline',
    color: '#00796B',
    bgColor: '#E0F2F1',
    features: [
      'Reading section practice',
      'Listening comprehension exercises',
      'Speaking practice with feedback',
      'Writing section practice',
      'Full-length practice tests',
    ],
  },
}

export default function TestDetailScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>()
  const router = useRouter()
  
  const test = TESTS[testId || '']
  
  if (!test) {
    return (
      <View style={styles.container}>
        <Stack.Screen options={{ title: 'Test Not Found' }} />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={ui.textMuted} />
          <Text style={styles.errorText}>Test not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen options={{ title: test.name }} />
      
      <View style={styles.heroSection}>
        <View style={[styles.heroIcon, { backgroundColor: test.bgColor }]}>
          <Ionicons name={test.icon} size={48} color={test.color} />
        </View>
        <Text style={styles.heroTitle}>{test.fullName}</Text>
        <Text style={styles.heroDescription}>{test.description}</Text>
      </View>

      <View style={styles.comingSoonCard}>
        <View style={styles.comingSoonIcon}>
          <Ionicons name="construct-outline" size={32} color={ui.primary} />
        </View>
        <Text style={styles.comingSoonTitle}>Coming Soon!</Text>
        <Text style={styles.comingSoonText}>
          We're working hard to bring you comprehensive {test.name} prep resources. Check back soon!
        </Text>
      </View>

      <View style={styles.featuresSection}>
        <Text style={styles.sectionTitle}>What's Coming</Text>
        <View style={styles.featuresList}>
          {test.features.map((feature, index) => (
            <View key={index} style={styles.featureItem}>
              <View style={styles.featureCheck}>
                <Ionicons name="time-outline" size={16} color={ui.textMuted} />
              </View>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.notifyCard}>
        <Ionicons name="notifications-outline" size={24} color={ui.primary} />
        <View style={styles.notifyContent}>
          <Text style={styles.notifyTitle}>Get Notified</Text>
          <Text style={styles.notifyText}>We'll let you know when {test.name} prep is available.</Text>
        </View>
      </View>
    </ScrollView>
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 18,
    color: ui.textSecondary,
    marginTop: 16,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: ui.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: radius.md,
  },
  backButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  heroSection: {
    alignItems: 'center',
    padding: 32,
    paddingTop: 24,
  },
  heroIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ui.text,
    textAlign: 'center',
  },
  heroDescription: {
    fontSize: 15,
    color: ui.textSecondary,
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  comingSoonCard: {
    alignItems: 'center',
    backgroundColor: ui.primaryLight,
    marginHorizontal: 24,
    padding: 32,
    borderRadius: radius.lg,
  },
  comingSoonIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  comingSoonTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: ui.primary,
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: ui.primaryText,
    textAlign: 'center',
    lineHeight: 20,
  },
  featuresSection: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 16,
  },
  featuresList: {
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
  },
  featureCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: ui.text,
  },
  notifyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    marginHorizontal: 24,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    gap: 16,
    ...shadow.card,
  },
  notifyContent: {
    flex: 1,
  },
  notifyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  notifyText: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 2,
  },
})
