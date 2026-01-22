import React from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import type { Href } from 'expo-router'
import { ui, radius, shadow } from '../../src/theme'
import { TESTS } from '../../src/content/testPrep'

export default function TestPrepScreen() {
  const router = useRouter()

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.header}>
        <Text style={styles.title}>Test Prep</Text>
        <Text style={styles.subtitle}>Plan and prepare for standardized tests</Text>
      </View>

      <View style={styles.infoBanner}>
        <Ionicons name="information-circle-outline" size={20} color={ui.primary} />
        <Text style={styles.infoBannerText}>
          These pages help you plan. Exact dates vary by school and district.
        </Text>
      </View>

      <View style={styles.testList}>
        {TESTS.map((test) => (
          <TouchableOpacity
            key={test.id}
            style={styles.testCard}
            onPress={() => router.push(`/test-prep/${test.id}` as Href)}
          >
            <View style={[styles.testIcon, { backgroundColor: test.bgColor }]}>
              <Ionicons name={test.icon as keyof typeof Ionicons.glyphMap} size={28} color={test.color} />
            </View>
            <View style={styles.testInfo}>
              <Text style={styles.testName}>{test.name}</Text>
              <Text style={styles.testDesc} numberOfLines={2}>{test.shortDescription}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
        ))}
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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 16,
    marginHorizontal: 24,
    marginBottom: 16,
    borderRadius: radius.md,
    gap: 12,
  },
  infoBannerText: {
    flex: 1,
    fontSize: 14,
    color: ui.primaryText,
    lineHeight: 20,
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
})
