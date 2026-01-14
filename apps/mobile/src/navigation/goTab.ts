import { router } from 'expo-router'

type TabName = 'dashboard' | 'planner' | 'scholarships' | 'profile'

const TAB_ROUTES: Record<TabName, string> = {
  dashboard: '/(tabs)',
  planner: '/(tabs)/planner',
  scholarships: '/(tabs)/scholarships',
  profile: '/(tabs)/profile',
}

export function goTab(tab: TabName): void {
  const route = TAB_ROUTES[tab]
  router.replace(route as any)
}

export function safeBack(fallbackTab: TabName = 'dashboard'): void {
  if (router.canGoBack()) {
    router.back()
  } else {
    goTab(fallbackTab)
  }
}
