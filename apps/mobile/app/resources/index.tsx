import React, { useMemo, useState } from 'react'
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import {
  COLLEGE_GUIDES,
  GUIDE_AUDIENCE_LABELS,
  GUIDE_CATEGORIES,
  GUIDE_STAGE_LABELS,
  GUIDE_STAGE_ORDER,
  filterGuides,
  getGuidesByCategory,
  type GuideAudience,
  type GuideCategorySlug,
  type GuideStage,
} from '@mysryear/shared'
import { colors, radius, shadow, ui } from '../../src/theme'

const AUDIENCES: GuideAudience[] = ['student', 'family']

export default function ResourcesScreen() {
  const [query, setQuery] = useState('')
  const [audience, setAudience] = useState<GuideAudience | ''>('')
  const [stage, setStage] = useState<GuideStage | ''>('')
  const [category, setCategory] = useState<GuideCategorySlug | ''>('')

  const hasFilters = Boolean(query || audience || stage || category)

  const results = useMemo(
    () =>
      filterGuides({
        query: query || undefined,
        audience: audience || undefined,
        stage: stage || undefined,
        category: category || undefined,
      }),
    [query, audience, stage, category],
  )

  const dataError = COLLEGE_GUIDES.length === 0

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Back to dashboard"
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={20} color={ui.primary} />
        <Text style={styles.backText}>Dashboard</Text>
      </TouchableOpacity>

      <View style={styles.hero}>
        <View style={styles.heroIcon}>
          <Ionicons name="school-outline" size={25} color={colors.white} />
        </View>
        <Text style={styles.kicker}>COLLEGE READINESS HUB</Text>
        <Text style={styles.title}>College planning, explained clearly.</Text>
        <Text style={styles.subtitle}>
          Free guides for students and families — courses, applications, FAFSA, scholarships, cost,
          and the first year. No account required.
        </Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color={ui.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="What do you need help with?"
          placeholderTextColor={ui.textSecondary}
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          accessibilityLabel="Search guides"
        />
        {query.length > 0 && (
          <TouchableOpacity accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setQuery('')}>
            <Ionicons name="close-circle" size={18} color={ui.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Audience chips */}
      <View style={styles.chipRow}>
        <Chip label="Everyone" active={audience === ''} onPress={() => setAudience('')} />
        {AUDIENCES.map((value) => (
          <Chip
            key={value}
            label={GUIDE_AUDIENCE_LABELS[value]}
            active={audience === value}
            onPress={() => setAudience(value)}
          />
        ))}
      </View>

      {/* Stage chips */}
      <View style={styles.chipRow}>
        <Chip label="Any grade" active={stage === ''} onPress={() => setStage('')} />
        {GUIDE_STAGE_ORDER.map((value) => (
          <Chip
            key={value}
            label={GUIDE_STAGE_LABELS[value]}
            active={stage === value}
            onPress={() => setStage(value)}
          />
        ))}
      </View>

      {category !== '' && (
        <TouchableOpacity
          accessibilityRole="button"
          style={styles.clearCategory}
          onPress={() => setCategory('')}
        >
          <Ionicons name="chevron-back" size={16} color={ui.primary} />
          <Text style={styles.clearCategoryText}>All collections</Text>
        </TouchableOpacity>
      )}

      {/* States */}
      {dataError ? (
        <View style={styles.stateBox}>
          <Ionicons name="warning-outline" size={22} color={colors.accent[500]} />
          <Text style={styles.stateText}>Guides are unavailable right now. Please try again.</Text>
        </View>
      ) : hasFilters ? (
        results.length > 0 ? (
          <View style={styles.list}>
            <Text style={styles.resultCount}>
              {results.length} {results.length === 1 ? 'guide' : 'guides'}
            </Text>
            {results.map((guide) => (
              <GuideRow
                key={guide.slug}
                number={guide.number}
                title={guide.title}
                summary={guide.shortSummary}
                onPress={() => router.push(`/resources/${guide.slug}`)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.stateBox}>
            <Ionicons name="search-outline" size={22} color={ui.textSecondary} />
            <Text style={styles.stateText}>No guides match those filters yet.</Text>
            <TouchableOpacity
              accessibilityRole="button"
              onPress={() => {
                setQuery('')
                setAudience('')
                setStage('')
                setCategory('')
              }}
            >
              <Text style={styles.resetText}>Reset filters</Text>
            </TouchableOpacity>
          </View>
        )
      ) : (
        <View style={styles.list}>
          <Text style={styles.sectionLabel}>Browse 100 guides by collection</Text>
          {GUIDE_CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item.slug}
              accessibilityRole="button"
              accessibilityLabel={`${item.title}, ${getGuidesByCategory(item.slug).length} guides`}
              style={styles.categoryCard}
              onPress={() => setCategory(item.slug)}
            >
              <View style={styles.categoryNumber}>
                <Text style={styles.categoryNumberText}>{item.number}</Text>
              </View>
              <View style={styles.categoryCopy}>
                <Text style={styles.categoryTitle}>{item.title}</Text>
                <Text style={styles.categorySummary}>{item.summary}</Text>
                <Text style={styles.categoryCount}>
                  {getGuidesByCategory(item.slug).length} guides
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={ui.textSecondary} />
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            accessibilityRole="button"
            style={styles.tenThingsCard}
            onPress={() => router.push('/resources/ten-things-school')}
          >
            <Ionicons name="bulb-outline" size={22} color={colors.accent[500]} />
            <View style={styles.categoryCopy}>
              <Text style={styles.categoryTitle}>10 Things to Check at Your School</Text>
              <Text style={styles.categorySummary}>
                Already enrolled? Use what your school already includes before paying elsewhere.
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={ui.textSecondary} />
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  )
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function GuideRow({
  number,
  title,
  summary,
  onPress,
}: {
  number: number
  title: string
  summary: string
  onPress: () => void
}) {
  return (
    <TouchableOpacity accessibilityRole="button" style={styles.guideCard} onPress={onPress}>
      <View style={styles.numberCircle}>
        <Text style={styles.numberText}>{number}</Text>
      </View>
      <View style={styles.categoryCopy}>
        <Text style={styles.guideTitle}>{title}</Text>
        <Text style={styles.guideSummary}>{summary}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={ui.textSecondary} />
    </TouchableOpacity>
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: { flex: 1, color: ui.text, fontSize: 15, paddingVertical: 2 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  chip: {
    borderWidth: 1,
    borderColor: ui.cardBorder,
    backgroundColor: ui.card,
    borderRadius: radius.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  chipActive: { backgroundColor: ui.primary, borderColor: ui.primary },
  chipText: { color: ui.textSecondary, fontSize: 13, fontWeight: '700' },
  chipTextActive: { color: colors.white },
  clearCategory: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 6 },
  clearCategoryText: { color: ui.primary, fontSize: 14, fontWeight: '700' },
  stateBox: { alignItems: 'center', gap: 10, paddingVertical: 36 },
  stateText: { color: ui.textSecondary, fontSize: 14, textAlign: 'center', maxWidth: 260 },
  resetText: { color: ui.primary, fontSize: 14, fontWeight: '800' },
  list: { gap: 12, marginTop: 6 },
  sectionLabel: {
    color: ui.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  resultCount: {
    color: ui.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: ui.card,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    borderRadius: radius.lg,
    padding: 16,
    ...shadow.card,
  },
  categoryNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: ui.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryNumberText: { color: ui.primaryText, fontWeight: '900', fontSize: 14 },
  categoryCopy: { flex: 1 },
  categoryTitle: { color: ui.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  categorySummary: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
  categoryCount: {
    color: ui.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    marginTop: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tenThingsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    backgroundColor: '#FFF8E7',
    borderWidth: 1,
    borderColor: '#FDE3A7',
    borderRadius: radius.lg,
    padding: 16,
    marginTop: 6,
  },
  guideCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  guideTitle: { color: ui.text, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  guideSummary: { color: ui.textSecondary, fontSize: 13, lineHeight: 19, marginTop: 4 },
})
