import React from 'react'
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native'
import { Text } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs'
import { colors, ui, shadow } from '../../theme'

type TabConfig = {
  name: string
  title: string
  icon: keyof typeof Ionicons.glyphMap
  iconFocused: keyof typeof Ionicons.glyphMap
}

// Tab configuration - order matters for layout
const LEFT_TABS: TabConfig[] = [
  { name: 'index', title: 'Dashboard', icon: 'home-outline', iconFocused: 'home' },
  { name: 'planner', title: 'Planner', icon: 'calendar-outline', iconFocused: 'calendar' },
]

const RIGHT_TABS: TabConfig[] = [
  { name: 'scholarships', title: 'Scholarships', icon: 'school-outline', iconFocused: 'school' },
  { name: 'profile', title: 'Profile', icon: 'person-outline', iconFocused: 'person' },
]

export default function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const router = useRouter()
  const insets = useSafeAreaInsets()

  const handleTabPress = (routeName: string, isFocused: boolean) => {
    const event = navigation.emit({
      type: 'tabPress',
      target: routeName,
      canPreventDefault: true,
    })

    if (!isFocused && !event.defaultPrevented) {
      navigation.navigate(routeName)
    }
  }

  const handleAuraPress = () => {
    router.push('/aura')
  }

  const renderTab = (tab: TabConfig, index: number) => {
    // Find the route in state that matches this tab
    const routeIndex = state.routes.findIndex(r => r.name === tab.name)
    if (routeIndex === -1) return null // Tab not available for this role

    const route = state.routes[routeIndex]
    const { options } = descriptors[route.key]
    const isFocused = state.index === routeIndex

    // Check if tab should be hidden (href: null)
    if (options.href === null) return null

    return (
      <TouchableOpacity
        key={tab.name}
        accessibilityRole="button"
        accessibilityState={isFocused ? { selected: true } : {}}
        accessibilityLabel={options.tabBarAccessibilityLabel}
        testID={options.tabBarTestID}
        onPress={() => handleTabPress(route.name, isFocused)}
        style={styles.tabButton}
      >
        <Ionicons
          name={isFocused ? tab.iconFocused : tab.icon}
          size={24}
          color={isFocused ? ui.tabBarActive : ui.tabBarInactive}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? ui.tabBarActive : ui.tabBarInactive },
          ]}
        >
          {tab.title}
        </Text>
      </TouchableOpacity>
    )
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Left tabs */}
      <View style={styles.tabsGroup}>
        {LEFT_TABS.map(renderTab)}
      </View>

      {/* Center A.U.R.A. button */}
      <View style={styles.centerButtonContainer}>
        <TouchableOpacity
          style={styles.auraButton}
          onPress={handleAuraPress}
          activeOpacity={0.8}
        >
          <Ionicons name="sparkles" size={28} color={colors.white} />
        </TouchableOpacity>
        <Text style={styles.auraLabel}>A.U.R.A.</Text>
      </View>

      {/* Right tabs */}
      <View style={styles.tabsGroup}>
        {RIGHT_TABS.map(renderTab)}
      </View>
    </View>
  )
}

const AURA_BUTTON_SIZE = 64

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: ui.tabBarBackground,
    borderTopWidth: 1,
    borderTopColor: ui.tabBarBorder,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  tabsGroup: {
    flexDirection: 'row',
    flex: 1,
    justifyContent: 'space-around',
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 64,
  },
  tabLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  centerButtonContainer: {
    alignItems: 'center',
    marginTop: -20, // Raise the button above the tab bar
  },
  auraButton: {
    width: AURA_BUTTON_SIZE,
    height: AURA_BUTTON_SIZE,
    borderRadius: AURA_BUTTON_SIZE / 2,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadow.soft,
    ...Platform.select({
      ios: {
        shadowColor: ui.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  auraLabel: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
    color: ui.primary,
  },
})
