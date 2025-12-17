import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DarkTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Slot, useRouter, useSegments } from 'expo-router'
import type { Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import 'react-native-reanimated'

import { AuthProvider, useAuth } from '../src/contexts/AuthContext'

export {
  ErrorBoundary,
} from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGate() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()

  useEffect(() => {
    if (loading) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session && !inAuthGroup) {
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      if (profile && !profile.onboarding_complete) {
        router.replace('/onboarding' as Href)
      } else {
        router.replace('/(app)')
      }
    } else if (session && !inOnboarding && profile && !profile.onboarding_complete) {
      router.replace('/onboarding' as Href)
    }
  }, [session, profile, loading, segments])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    )
  }

  return <Slot />
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  })

  useEffect(() => {
    if (error) throw error
  }, [error])

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync()
    }
  }, [loaded])

  if (!loaded) {
    return null
  }

  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <AuthGate />
      </ThemeProvider>
    </AuthProvider>
  )
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0f172a',
  },
})
