import React, { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { supabase } from '../../src/lib/supabase'
import { colors, ui } from '../../src/theme'

export default function AuthCallbackScreen() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError) {
          setError(sessionError.message)
          return
        }

        if (session) {
          router.replace('/(app)')
        } else {
          setError('Authentication failed. Please try again.')
        }
      } catch (err) {
        setError('An unexpected error occurred')
      }
    }

    handleCallback()
  }, [router])

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>Authentication Error</Text>
        <Text style={styles.errorText}>{error}</Text>
        <Text 
          style={styles.backLink}
          onPress={() => router.replace('/(auth)/login')}
        >
          Back to Login
        </Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={ui.primary} />
      <Text style={styles.loadingText}>Completing sign in...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 16,
    fontSize: 16,
  },
  errorTitle: {
    color: colors.error,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
  },
  errorText: {
    color: ui.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backLink: {
    color: ui.primary,
    fontSize: 16,
    fontWeight: '600',
  },
})
