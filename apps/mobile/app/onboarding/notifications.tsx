import React, { useState, useEffect } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { router } from 'expo-router'
import type { Href } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuth } from '../../src/contexts/AuthContext'
import { 
  requestNotificationPermission,
  registerForPushNotificationsAsync,
  saveDeviceToken,
} from '../../src/notifications'
import { colors, ui, radius } from '../../src/theme'

const NOTIF_OPTIN_KEY = 'notif_optin_shown_v1'

export default function NotificationOptInScreen() {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    checkIfAlreadyShown()
  }, [])

  const checkIfAlreadyShown = async () => {
    try {
      const shown = await AsyncStorage.getItem(NOTIF_OPTIN_KEY)
      if (shown === 'true') {
        router.replace('/(tabs)' as Href)
        return
      }
    } catch (error) {
      console.error('Error checking opt-in status:', error)
    }
    setChecking(false)
  }

  const handleAllow = async () => {
    setLoading(true)
    try {
      const granted = await requestNotificationPermission()
      
      if (granted && user?.id) {
        const token = await registerForPushNotificationsAsync()
        if (token) {
          await saveDeviceToken(user.id, token)
        }
      }
      
      await AsyncStorage.setItem(NOTIF_OPTIN_KEY, 'true')
      router.replace('/(tabs)' as Href)
    } catch (error) {
      console.error('Error requesting notification permission:', error)
      await AsyncStorage.setItem(NOTIF_OPTIN_KEY, 'true')
      router.replace('/(tabs)' as Href)
    } finally {
      setLoading(false)
    }
  }

  const handleSkip = async () => {
    try {
      await AsyncStorage.setItem(NOTIF_OPTIN_KEY, 'true')
    } catch (error) {
      console.error('Error saving opt-in status:', error)
    }
    router.replace('/(tabs)' as Href)
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={ui.primary} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="notifications" size={64} color={ui.primary} />
          </View>
        </View>

        <Text style={styles.title}>Stay on Track</Text>
        <Text style={styles.subtitle}>
          Get timely reminders for deadlines, tasks, and important updates so you never miss a beat.
        </Text>

        <View style={styles.features}>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="calendar-outline" size={20} color={ui.primary} />
            </View>
            <Text style={styles.featureText}>Deadline reminders for tasks and applications</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="people-outline" size={20} color={ui.primary} />
            </View>
            <Text style={styles.featureText}>Parent link request notifications</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={styles.featureIcon}>
              <Ionicons name="star-outline" size={20} color={ui.primary} />
            </View>
            <Text style={styles.featureText}>New scholarship and opportunity alerts</Text>
          </View>
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity
            style={styles.allowButton}
            onPress={handleAllow}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="notifications" size={20} color="#fff" />
                <Text style={styles.allowButtonText}>Allow Notifications</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            disabled={loading}
          >
            <Text style={styles.skipButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.note}>
          You can change this anytime in Settings
        </Text>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  features: {
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: ui.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  featureText: {
    flex: 1,
    fontSize: 15,
    color: ui.text,
    lineHeight: 20,
  },
  buttons: {
    marginTop: 'auto',
    gap: 12,
  },
  allowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ui.primary,
    borderRadius: radius.md,
    padding: 16,
  },
  allowButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  skipButtonText: {
    color: ui.textSecondary,
    fontSize: 16,
    fontWeight: '500',
  },
  note: {
    fontSize: 13,
    color: ui.textMuted,
    textAlign: 'center',
    marginTop: 16,
  },
})
