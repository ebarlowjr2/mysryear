import React from 'react'
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native'
import { Stack } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { safeBack } from '../../src/navigation/safeBack'
import { useTapGuard } from '../../src/navigation/useTapGuard'

export default function AuraScreen() {
  // Tap guards to prevent rapid double-taps on navigation buttons
  const guardedBack = useTapGuard(() => safeBack('dashboard'))
  const guardedHome = useTapGuard(() => goTab('dashboard'))

  return (
    <SafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'A.U.R.A.',
          headerLeft: () => (
            <TouchableOpacity onPress={guardedBack} style={styles.headerButton}>
              <Ionicons name="arrow-back" size={24} color={ui.headerText} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={guardedHome} style={styles.headerButton}>
              <Ionicons name="home" size={24} color={ui.primary} />
            </TouchableOpacity>
          ),
        }}
      />

      <View style={styles.content}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.auraIcon}>
            <Ionicons name="sparkles" size={48} color={colors.white} />
          </View>
          <Text style={styles.title}>A.U.R.A.</Text>
          <Text style={styles.subtitle}>Your future-focused guidance counselor</Text>
        </View>

        {/* Feature Buttons */}
        <View style={styles.buttonsSection}>
          <TouchableOpacity style={[styles.featureButton, styles.featureButtonDisabled]}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="compass-outline" size={28} color={ui.primary} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Career Explorer</Text>
              <Text style={styles.featureSubtitle}>Coming Soon</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.featureButton, styles.featureButtonDisabled]}>
            <View style={styles.featureIconContainer}>
              <Ionicons name="chatbubble-ellipses-outline" size={28} color={ui.primary} />
            </View>
            <View style={styles.featureTextContainer}>
              <Text style={styles.featureTitle}>Ask A.U.R.A.</Text>
              <Text style={styles.featureSubtitle}>Coming Soon</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={ui.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Coming Soon Notice */}
        <View style={styles.comingSoonCard}>
          <Ionicons name="construct-outline" size={24} color={ui.primary} />
          <Text style={styles.comingSoonText}>
            A.U.R.A. is being trained to help you navigate your senior year journey. 
            Stay tuned for personalized guidance on careers, colleges, and scholarships!
          </Text>
        </View>

        {/* Back to Home Button */}
        <TouchableOpacity style={styles.homeButton} onPress={guardedHome}>
          <Ionicons name="home-outline" size={20} color={ui.primary} />
          <Text style={styles.homeButtonText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  headerButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 24,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  auraIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    ...shadow.soft,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    textAlign: 'center',
  },
  buttonsSection: {
    gap: 12,
    marginBottom: 24,
  },
  featureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  featureButtonDisabled: {
    opacity: 0.7,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
  },
  featureSubtitle: {
    fontSize: 14,
    color: ui.textMuted,
    marginTop: 2,
  },
  comingSoonCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 16,
    borderRadius: radius.lg,
    gap: 12,
    marginBottom: 24,
  },
  comingSoonText: {
    flex: 1,
    fontSize: 14,
    color: ui.primaryText,
    lineHeight: 20,
  },
  homeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ui.card,
    borderRadius: radius.md,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: ui.primary,
  },
  homeButtonText: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
})
