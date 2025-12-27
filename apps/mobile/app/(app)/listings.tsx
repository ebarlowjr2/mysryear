import React, { useEffect, useState, useCallback } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, TouchableOpacity } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useSession } from '../../src/hooks/useSession'
import { colors, ui, radius, shadow } from '../../src/theme'

export default function ListingsScreen() {
  const { user, loading: sessionLoading } = useSession()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    if (sessionLoading) return
    setLoading(false)
  }, [sessionLoading])

  const onRefresh = useCallback(() => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }, [])

  if (sessionLoading || loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={ui.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    )
  }

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ui.primary}
          colors={[ui.primary]}
        />
      }
    >
      <View style={styles.header}>
        <Text style={styles.title}>My Listings</Text>
        <Text style={styles.subtitle}>Post internships, webinars, and opportunities</Text>
      </View>

      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Ionicons name="briefcase-outline" size={48} color={ui.textMuted} />
        </View>
        <Text style={styles.emptyTitle}>No listings yet</Text>
        <Text style={styles.emptyDescription}>
          Create your first listing to connect with students looking for opportunities.
        </Text>
        <TouchableOpacity style={styles.addButton}>
          <Ionicons name="add" size={20} color={colors.white} />
          <Text style={styles.addButtonText}>Create Listing</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Listing Types</Text>
        <View style={styles.typeList}>
          <View style={styles.typeCard}>
            <View style={[styles.typeIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="briefcase-outline" size={24} color="#4CAF50" />
            </View>
            <Text style={styles.typeTitle}>Internships</Text>
            <Text style={styles.typeDesc}>Paid or unpaid work experience opportunities</Text>
          </View>
          <View style={styles.typeCard}>
            <View style={[styles.typeIcon, { backgroundColor: '#E3F2FD' }]}>
              <Ionicons name="videocam-outline" size={24} color="#2196F3" />
            </View>
            <Text style={styles.typeTitle}>Webinars</Text>
            <Text style={styles.typeDesc}>Virtual events and educational sessions</Text>
          </View>
          <View style={styles.typeCard}>
            <View style={[styles.typeIcon, { backgroundColor: '#FFF3E0' }]}>
              <Ionicons name="people-outline" size={24} color="#FF9800" />
            </View>
            <Text style={styles.typeTitle}>Seminars</Text>
            <Text style={styles.typeDesc}>In-person workshops and presentations</Text>
          </View>
        </View>
      </View>

      <View style={styles.infoCard}>
        <Ionicons name="location-outline" size={20} color={ui.primary} />
        <Text style={styles.infoText}>
          Target up to 4 counties to reach students in specific areas. Your listings will appear in their Opportunities feed.
        </Text>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ui.background,
  },
  contentContainer: {
    paddingBottom: 32,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: ui.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    color: ui.textSecondary,
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    padding: 24,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: ui.text,
  },
  subtitle: {
    fontSize: 16,
    color: ui.textSecondary,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginHorizontal: 24,
    backgroundColor: ui.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: ui.cardBorder,
    ...shadow.card,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: ui.backgroundSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: ui.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: ui.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: radius.md,
    gap: 8,
  },
  addButtonText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    padding: 24,
    paddingTop: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 16,
  },
  typeList: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: ui.card,
    padding: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: ui.cardBorder,
  },
  typeIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: ui.text,
    marginBottom: 4,
  },
  typeDesc: {
    fontSize: 14,
    color: ui.textSecondary,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: ui.primaryLight,
    padding: 16,
    marginHorizontal: 24,
    borderRadius: radius.md,
    gap: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: ui.primaryText,
    lineHeight: 20,
  },
})
