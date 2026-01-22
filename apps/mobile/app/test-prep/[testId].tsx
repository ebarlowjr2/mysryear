import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Linking } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter, Stack } from 'expo-router'
import type { Href } from 'expo-router'
import { colors, ui, radius, shadow } from '../../src/theme'
import { goTab } from '../../src/navigation/goTab'
import { useTapGuard } from '../../src/navigation/useTapGuard'
import { useAuth } from '../../src/contexts/AuthContext'
import { getTestById, TestMilestone } from '../../src/content/testPrep'
import { createTaskFromMilestone } from '../../src/utils/createPlannerTask'

export default function TestDetailScreen() {
  const { testId } = useLocalSearchParams<{ testId: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [addingMilestone, setAddingMilestone] = useState<string | null>(null)
  
  const guardedHome = useTapGuard(() => goTab('dashboard'))
  
  const test = getTestById(testId || '')
  
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

  const handleAddMilestone = async (milestone: TestMilestone) => {
    if (!user?.id) {
      Alert.alert('Sign In Required', 'Please sign in to add tasks to your planner.')
      return
    }

    setAddingMilestone(milestone.id)
    try {
      await createTaskFromMilestone(user.id, milestone, test.name)
      Alert.alert(
        'Added to Planner',
        `"${milestone.taskTitle}" has been added to your planner.`,
        [
          { text: 'View Planner', onPress: () => goTab('planner') },
          { text: 'OK', style: 'cancel' },
        ]
      )
    } catch (error) {
      console.error('Failed to add milestone:', error)
      Alert.alert('Error', 'Failed to add task to planner. Please try again.')
    } finally {
      setAddingMilestone(null)
    }
  }

  const handleOpenLink = (url: string) => {
    Linking.openURL(url).catch(() => {
      Alert.alert('Error', 'Could not open link.')
    })
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Stack.Screen 
        options={{ 
          title: test.name,
          headerRight: () => (
            <TouchableOpacity 
              style={styles.homeButton}
              onPress={guardedHome}
            >
              <Ionicons name="home" size={20} color={ui.primary} />
            </TouchableOpacity>
          ),
        }} 
      />
      
      <View style={styles.heroSection}>
        <View style={[styles.heroIcon, { backgroundColor: test.bgColor }]}>
          <Ionicons name={test.icon as keyof typeof Ionicons.glyphMap} size={48} color={test.color} />
        </View>
        <Text style={styles.heroTitle}>{test.name}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What It Is</Text>
        <Text style={styles.sectionText}>{test.whatItIs}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Who Should Take It</Text>
        <Text style={styles.sectionText}>{test.whoShouldTake}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Why It Matters</Text>
        <Text style={styles.sectionText}>{test.whyItMatters}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>When to Take It</Text>
        <Text style={styles.sectionText}>{test.whenToTake}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Add to Your Planner</Text>
        <Text style={styles.sectionSubtext}>Tap a button to add a reminder to your planner</Text>
        <View style={styles.milestoneList}>
          {test.milestones.map((milestone) => (
            <TouchableOpacity
              key={milestone.id}
              style={[
                styles.milestoneButton,
                addingMilestone === milestone.id && styles.milestoneButtonDisabled,
              ]}
              onPress={() => handleAddMilestone(milestone)}
              disabled={addingMilestone === milestone.id}
            >
              <Ionicons 
                name={addingMilestone === milestone.id ? 'hourglass-outline' : 'add-circle-outline'} 
                size={20} 
                color={ui.primary} 
              />
              <Text style={styles.milestoneButtonText}>{milestone.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {test.links && test.links.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helpful Links</Text>
          <View style={styles.linksList}>
            {test.links.map((link, index) => (
              <TouchableOpacity
                key={index}
                style={styles.linkButton}
                onPress={() => handleOpenLink(link.url)}
              >
                <Ionicons name="open-outline" size={18} color={ui.primary} />
                <Text style={styles.linkButtonText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      <View style={styles.auraCard}>
        <View style={styles.auraCardIcon}>
          <Ionicons name="sparkles" size={28} color="#7C3AED" />
        </View>
        <Text style={styles.auraCardTitle}>Need help deciding?</Text>
        <Text style={styles.auraCardText}>
          A.U.R.A. will help you choose the right path and plan your next steps (coming soon).
        </Text>
        <TouchableOpacity
          style={styles.auraButton}
          onPress={() => router.push('/aura' as Href)}
        >
          <Ionicons name="sparkles-outline" size={18} color={colors.white} />
          <Text style={styles.auraButtonText}>Open A.U.R.A.</Text>
        </TouchableOpacity>
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
  homeButton: {
    padding: 8,
  },
  heroSection: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 16,
  },
  heroIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: ui.text,
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  sectionSubtext: {
    fontSize: 14,
    color: ui.textSecondary,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 15,
    color: ui.textSecondary,
    lineHeight: 22,
  },
  milestoneList: {
    gap: 10,
  },
  milestoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.card,
    padding: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    gap: 12,
  },
  milestoneButtonDisabled: {
    opacity: 0.6,
  },
  milestoneButtonText: {
    flex: 1,
    fontSize: 15,
    color: ui.text,
    fontWeight: '500',
  },
  linksList: {
    gap: 10,
  },
  linkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primaryLight,
    padding: 14,
    borderRadius: radius.md,
    gap: 10,
  },
  linkButtonText: {
    flex: 1,
    fontSize: 15,
    color: ui.primary,
    fontWeight: '500',
  },
  auraCard: {
    alignItems: 'center',
    backgroundColor: '#F3E8FF',
    marginHorizontal: 24,
    marginTop: 8,
    padding: 24,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: '#DDD6FE',
  },
  auraCardIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  auraCardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5B21B6',
    marginBottom: 8,
  },
  auraCardText: {
    fontSize: 14,
    color: '#7C3AED',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  auraButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7C3AED',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  auraButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '600',
  },
})
