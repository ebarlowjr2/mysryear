import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { colors, ui, radius, shadow } from '../../src/theme'

type TestInfo = {
  id: string
  name: string
  fullName: string
  description: string
  icon: keyof typeof Ionicons.glyphMap
  color: string
  bgColor: string
}

const TESTS: TestInfo[] = [
  {
    id: 'sat',
    name: 'SAT',
    fullName: 'SAT (Scholastic Assessment Test)',
    description: 'College admission test covering reading, writing, and math',
    icon: 'school-outline',
    color: '#1976D2',
    bgColor: '#E3F2FD',
  },
  {
    id: 'act',
    name: 'ACT',
    fullName: 'ACT (American College Testing)',
    description: 'College readiness assessment with English, math, reading, and science',
    icon: 'document-text-outline',
    color: '#388E3C',
    bgColor: '#E8F5E9',
  },
  {
    id: 'psat',
    name: 'PSAT',
    fullName: 'PSAT/NMSQT',
    description: 'Preliminary SAT and National Merit Scholarship Qualifying Test',
    icon: 'ribbon-outline',
    color: '#7B1FA2',
    bgColor: '#F3E5F5',
  },
  {
    id: 'ap',
    name: 'AP Exams',
    fullName: 'Advanced Placement Exams',
    description: 'College-level exams for various subjects',
    icon: 'trophy-outline',
    color: '#F57C00',
    bgColor: '#FFF3E0',
  },
  {
    id: 'clep',
    name: 'CLEP',
    fullName: 'College Level Examination Program',
    description: 'Earn college credit by demonstrating subject mastery',
    icon: 'medal-outline',
    color: '#C2185B',
    bgColor: '#FCE4EC',
  },
  {
    id: 'toefl',
    name: 'TOEFL',
    fullName: 'Test of English as a Foreign Language',
    description: 'English proficiency test for non-native speakers',
    icon: 'globe-outline',
    color: '#00796B',
    bgColor: '#E0F2F1',
  },
]

export default function TestPrepScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Prep</Text>
        <Text style={styles.subtitle}>Prepare for standardized tests and college admissions</Text>
      </View>

      <View style={styles.testList}>
        {TESTS.map((test) => (
          <TouchableOpacity
            key={test.id}
            style={styles.testCard}
            onPress={() => router.push(`/test-prep/${test.id}` as never)}
          >
            <View style={[styles.testIcon, { backgroundColor: test.bgColor }]}>
              <Ionicons name={test.icon} size={28} color={test.color} />
            </View>
            <View style={styles.testInfo}>
              <Text style={styles.testName}>{test.name}</Text>
              <Text style={styles.testDesc} numberOfLines={2}>{test.description}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
        <Text style={styles.infoText}>
          Test prep resources are coming soon! We're working on practice questions, study guides, and progress tracking for each test.
        </Text>
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
  testList: {
    paddingHorizontal: 24,
    gap: 12,
  },
  testCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  testIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  testInfo: {
    flex: 1,
  },
  testName: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
  },
  testDesc: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
    lineHeight: 20,
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
})
