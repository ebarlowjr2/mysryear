import { Tabs } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { ui } from '../../src/theme'
import { useAuth } from '../../src/contexts/AuthContext'
import type { UserRole } from '../../src/data/profile'

export default function AppLayout() {
  const { profile } = useAuth()
  const role: UserRole = (profile?.role as UserRole) || 'student'

  const isStudent = role === 'student'
  const isParent = role === 'parent'
  const isTeacher = role === 'teacher'
  const isBusiness = role === 'business'

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
      
      {/* Student tabs */}
      <Tabs.Screen
        name="planner"
        options={{
          title: 'Planner',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar" size={size} color={color} />
          ),
          href: isStudent ? '/planner' : null,
        }}
      />
      <Tabs.Screen
        name="scholarships"
        options={{
          title: 'Scholarships',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="school" size={size} color={color} />
          ),
          href: isStudent || isParent ? '/scholarships' : null,
        }}
      />
      
      {/* Parent tabs */}
      <Tabs.Screen
        name="students"
        options={{
          title: 'Students',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
          href: isParent ? ('/students' as const) : null,
        }}
      />
      
      {/* Teacher tabs */}
      <Tabs.Screen
        name="school"
        options={{
          title: 'School',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="business" size={size} color={color} />
          ),
          href: isTeacher ? ('/school' as const) : null,
        }}
      />
      
      {/* Business tabs */}
      <Tabs.Screen
        name="listings"
        options={{
          title: 'Listings',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase" size={size} color={color} />
          ),
          href: isBusiness ? ('/listings' as const) : null,
        }}
      />
      
      {/* Profile tab for all roles */}
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
