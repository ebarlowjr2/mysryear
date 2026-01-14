import FontAwesome from '@expo/vector-icons/FontAwesome'
import { DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { useFonts } from 'expo-font'
import { Stack, useRouter, useSegments } from 'expo-router'
import type { Href } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useEffect, useRef } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import 'react-native-reanimated'

import { AuthProvider, useAuth } from '../src/contexts/AuthContext'
import { ui } from '../src/theme'

export {
  ErrorBoundary,
} from 'expo-router'

SplashScreen.preventAutoHideAsync()

function AuthGate() {
  const { session, profile, loading } = useAuth()
  const segments = useSegments()
  const router = useRouter()
  
  // Prevent double navigation on cold start / auth state changes
  const didNavigate = useRef(false)

  useEffect(() => {
    // Don't navigate until auth state is fully loaded
    if (loading) return
    
    // Prevent double replace - only navigate once per auth state change
    if (didNavigate.current) return

    const inAuthGroup = segments[0] === '(auth)'
    const inOnboarding = segments[0] === 'onboarding'

    if (!session && !inAuthGroup) {
      didNavigate.current = true
      router.replace('/(auth)/login')
    } else if (session && inAuthGroup) {
      didNavigate.current = true
      if (profile && !profile.onboarding_complete) {
        router.replace('/onboarding' as Href)
      } else {
        router.replace('/(tabs)')
      }
    } else if (session && !inOnboarding && profile && !profile.onboarding_complete) {
      didNavigate.current = true
      router.replace('/onboarding' as Href)
    }
  }, [session, profile, loading, segments])
  
  // Reset didNavigate when auth state changes (allows re-navigation on logout/login)
  useEffect(() => {
    didNavigate.current = false
  }, [session])

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
      </View>
    )
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: ui.headerBackground },
        headerTintColor: ui.headerText,
        headerShadowVisible: false,
      }}
    >
      {/* Tab screens - hide header since tabs have their own */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
      
      {/* Detail screens outside tabs - show header with back button */}
      <Stack.Screen name="scholarship/[id]" options={{ title: 'Scholarship Details' }} />
      <Stack.Screen name="test-prep/index" options={{ title: 'Test Prep' }} />
      <Stack.Screen name="test-prep/[testId]" options={{ title: 'Practice Test' }} />
      
      {/* Modal screens - presented as modals for clean dismiss */}
      <Stack.Screen name="(modals)" options={{ headerShown: false }} />
      
      {/* Profile subpages */}
      <Stack.Screen name="profile/linked-students" options={{ title: 'Linked Students' }} />
      <Stack.Screen name="profile/parent-requests" options={{ title: 'Parent Requests' }} />
    </Stack>
  )
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
      <ThemeProvider value={DefaultTheme}>
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
    backgroundColor: ui.background,
  },
})
