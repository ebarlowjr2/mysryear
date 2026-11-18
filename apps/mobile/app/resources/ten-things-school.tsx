import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import { SCHOOL_RESOURCE_CHECKS } from '@mysryear/shared'
import { colors, radius, shadow, ui } from '../../src/theme'

export default function TenThingsSchoolScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to resources"
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={ui.primary} />
        <Text style={styles.backText}>Resources</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="school-outline" size={25} color={colors.white} />
        </View>
        <Text style={styles.kicker}>STARTING COLLEGE</Text>
        <Text style={styles.title}>10 Things to Check at Your School</Text>
        <Text style={styles.subtitle}>
          Tuition and student fees may already cover tools, training, technology, and support. Check
          what your school provides before you pay for it elsewhere.
        </Text>
      </View>

      <View style={styles.checkList}>
        {SCHOOL_RESOURCE_CHECKS.map((item, index) => (
          <View key={item.title} style={styles.checkCard}>
            <View style={styles.numberCircle}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.checkCopy}>
              <Text style={styles.checkTitle}>{item.title}</Text>
              <Text style={styles.checkDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.reminder}>
        <Ionicons name="bulb-outline" size={23} color={colors.accent[500]} />
        <Text style={styles.reminderText}>
          Start with your student portal, library, IT department, career center, and student services
          office. Ask what is included with tuition and student fees.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.backgroundSecondary },
  content: { padding: 20, paddingBottom: 48 },
  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    marginBottom: 8,
  },
  backText: { color: ui.primary, fontSize: 15, fontWeight: '700' },
  hero: {
    backgroundColor: colors.brand[900],
    borderRadius: radius.xl,
    padding: 22,
    marginBottom: 16,
    ...shadow.soft,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    backgroundColor: colors.brand[600],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  kicker: { color: '#67E8F9', fontSize: 11, fontWeight: '900', letterSpacing: 1.7 },
  title: { color: colors.white, fontSize: 26, lineHeight: 32, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#DCEAF8', fontSize: 14, lineHeight: 21, marginTop: 12 },
  checkList: { gap: 12 },
  checkCard: {
    flexDirection: 'row',
    gap: 13,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
  numberCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberText: { color: ui.primaryText, fontWeight: '900', fontSize: 14 },
  checkCopy: { flex: 1 },
  checkTitle: { color: ui.text, fontSize: 16, lineHeight: 21, fontWeight: '800' },
  checkDescription: { color: ui.textSecondary, fontSize: 14, lineHeight: 21, marginTop: 6 },
  reminder: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FDE3A7',
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 18,
  },
  reminderText: { flex: 1, color: colors.slate[700], fontSize: 14, lineHeight: 21 },
})
