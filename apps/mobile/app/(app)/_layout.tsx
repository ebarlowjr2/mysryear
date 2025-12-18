import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ui } from '../../src/theme'

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: ui.tabBarActive,
        tabBarInactiveTintColor: ui.tabBarInactive,
        tabBarStyle: {
          backgroundColor: ui.tabBarBackground,
          borderTopColor: ui.tabBarBorder,
        },
        headerStyle: {
          backgroundColor: ui.headerBackground,
        },
        headerTintColor: ui.headerText,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scholarships"
        options={{
          title: 'Scholarships',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}
