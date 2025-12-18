import React from 'react'
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function ProfileScreen() {
  const { user, signOut } = useAuth()

  return (
    <View style={styles.container}>
      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.email}>{user?.email}</Text>
        <Text style={styles.memberSince}>My SR Year Member</Text>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
    padding: 24,
  },
  profileCard: {
    alignItems: 'center',
    marginTop: 32,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    padding: 32,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ui.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.white,
  },
  email: {
    fontSize: 16,
    color: ui.text,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: 14,
    color: ui.textSecondary,
    marginTop: 4,
  },
  logoutButton: {
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
    marginBottom: 32,
  },
  logoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
})
