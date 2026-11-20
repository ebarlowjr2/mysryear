import React from 'react'
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router, useLocalSearchParams } from 'expo-router'
import {
  GUIDE_AUDIENCE_LABELS,
  GUIDE_STAGE_LABELS,
  getGuideBySlug,
  getGuideCategory,
  getRelatedGuides,
} from '@mysryear/shared'
import { colors, radius, shadow, ui } from '../../src/theme'

export default function GuideDetailScreen() {
  const params = useLocalSearchParams<{ slug: string }>()
  const slug = typeof params.slug === 'string' ? params.slug : ''
  const guide = getGuideBySlug(slug)

  if (!guide) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={40} color={ui.textSecondary} />
        <Text style={styles.notFoundTitle}>Guide not found</Text>
        <Text style={styles.notFoundText}>That guide may have moved or the link is incorrect.</Text>
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.notFoundButton}
          onPress={() => router.replace('/resources')}
        >
          <Text style={styles.notFoundButtonText}>Back to the Hub</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const category = getGuideCategory(guide.category)
  const related = getRelatedGuides(guide.slug)

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back"
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={ui.primary} />
        <Text style={styles.backText}>All guides</Text>
      </TouchableOpacity>

      <Text style={styles.kicker}>
        GUIDE {guide.number} · {category?.title ?? 'Guide'}
      </Text>
      <Text style={styles.title}>{guide.title}</Text>
      <Text style={styles.summary}>{guide.shortSummary}</Text>

      <View style={styles.badgeRow}>
        {guide.audiences.map((audience) => (
          <View key={audience} style={styles.badge}>
            <Text style={styles.badgeText}>{GUIDE_AUDIENCE_LABELS[audience]}</Text>
          </View>
        ))}
        {guide.gradesOrStages.map((stage) => (
          <View key={stage} style={styles.badge}>
            <Text style={styles.badgeText}>{GUIDE_STAGE_LABELS[stage]}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionHeading}>Why it matters</Text>
      <Text style={styles.paragraph}>{guide.whyItMatters}</Text>

      <Text style={styles.sectionHeading}>Do this</Text>
      <View style={styles.steps}>
        {guide.actionSteps.map((step, index) => (
          <View key={index} style={styles.step}>
            <View style={styles.stepNumber}>
              <Text style={styles.stepNumberText}>{index + 1}</Text>
            </View>
            <Text style={styles.stepText}>{step}</Text>
          </View>
        ))}
      </View>

      {guide.studentTip ? (
        <View style={styles.tipCard}>
          <Text style={styles.tipLabel}>For students</Text>
          <Text style={styles.tipText}>{guide.studentTip}</Text>
        </View>
      ) : null}
      {guide.familyTip ? (
        <View style={styles.tipCardAlt}>
          <Text style={styles.tipLabel}>For parents & guardians</Text>
          <Text style={styles.tipText}>{guide.familyTip}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>Official sources</Text>
      {guide.officialSources.map((source) => (
        <TouchableOpacity
          key={source.url}
          accessibilityRole="link"
          accessibilityLabel={`${source.label}, opens in browser`}
          style={styles.sourceRow}
          onPress={() => Linking.openURL(source.url)}
        >
          <Ionicons name="open-outline" size={16} color={ui.primary} />
          <Text style={styles.sourceText}>{source.label}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.reviewed}>Last reviewed {guide.lastReviewedAt}</Text>

      {related.length > 0 ? (
        <>
          <Text style={styles.sectionHeading}>Related guides</Text>
          {related.map((item) => (
            <TouchableOpacity
              key={item.slug}
              accessibilityRole="button"
              style={styles.relatedRow}
              onPress={() => router.push(`/resources/${item.slug}`)}
            >
              <Text style={styles.relatedText}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={18} color={ui.textSecondary} />
            </TouchableOpacity>
          ))}
        </>
      ) : null}
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
  kicker: {
    color: ui.primary,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  title: { color: ui.text, fontSize: 24, lineHeight: 30, fontWeight: '900', marginTop: 8 },
  summary: { color: ui.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10 },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  badge: {
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: { color: ui.textSecondary, fontSize: 12, fontWeight: '700' },
  sectionHeading: { color: ui.text, fontSize: 18, fontWeight: '900', marginTop: 24 },
  paragraph: { color: ui.textSecondary, fontSize: 15, lineHeight: 23, marginTop: 8 },
  steps: { gap: 10, marginTop: 12 },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: ui.textSecondary, fontWeight: '900', fontSize: 13 },
  stepText: { flex: 1, color: ui.text, fontSize: 15, lineHeight: 22 },
  tipCard: {
    backgroundColor: ui.primaryLight,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 16,
  },
  tipCardAlt: {
    backgroundColor: colors.slate[50],
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 12,
  },
  tipLabel: {
    color: ui.primaryText,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  tipText: { color: ui.text, fontSize: 14, lineHeight: 21, marginTop: 6 },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: ui.cardBorder,
  },
  sourceText: { flex: 1, color: ui.primary, fontSize: 14, fontWeight: '700' },
  reviewed: { color: ui.textSecondary, fontSize: 12, marginTop: 16 },
  relatedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 14,
    marginTop: 10,
    ...shadow.card,
  },
  relatedText: { flex: 1, color: ui.text, fontSize: 14, fontWeight: '800' },
  notFound: {
    flex: 1,
    backgroundColor: ui.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
  },
  notFoundTitle: { color: ui.text, fontSize: 20, fontWeight: '900' },
  notFoundText: { color: ui.textSecondary, fontSize: 14, textAlign: 'center' },
  notFoundButton: {
    marginTop: 10,
    backgroundColor: ui.primary,
    borderRadius: radius.lg,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  notFoundButtonText: { color: colors.white, fontWeight: '800', fontSize: 15 },
})
