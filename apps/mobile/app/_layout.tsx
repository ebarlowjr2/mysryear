import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Slot, useRouter, useSegments } from 'expo-router'
import type { Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import * as Sentry from '@sentry/react-native'
import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import 'react-native-reanimated'

import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { ui } from '../src/theme'

export {
  ErrorBoundary,
} from 'expo-router'

SplashScreen.preventAutoHideAsync()


Sentry.init({
  dsn: 'https://5dba1675162a408154a0f0a72fa3ba8c@o4511417163841536.ingest.us.sentry.io/4511611580448768',
  sendDefaultPii: true,
  tracesSampleRate: 1.0,
})

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
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  return <Slot />
}

export default Sentry.wrap(function RootLayout() {
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
      <ThemeProvider value={DefaultTheme}>
        <AuthGate />
      </ThemeProvider>
    </AuthProvider>
  )
})

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: ui.background,
  },
})
