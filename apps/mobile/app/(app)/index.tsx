import React from 'react'
import { View, Text, StyleSheet, ScrollView } from 'react-native'
import { useAuth } from '../../src/contexts/AuthContext'

export default function DashboardScreen() {
  const { user } = useAuth()

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome back!</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Scholarships</Text>
          <Text style={styles.statDesc}>matches found</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>4</Text>
          <Text style={styles.statLabel}>Deadlines</Text>
          <Text style={styles.statDesc}>upcoming</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>7</Text>
          <Text style={styles.statLabel}>Tasks</Text>
          <Text style={styles.statDesc}>pending</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>15</Text>
          <Text style={styles.statLabel}>Completed</Text>
          <Text style={styles.statDesc}>milestones</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Upcoming Dates</Text>
        <View style={styles.dateItem}>
          <Text style={styles.dateEvent}>FAFSA opens</Text>
          <Text style={styles.dateValue}>Oct 15</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={styles.dateEvent}>Early Action deadline</Text>
          <Text style={styles.dateValue}>Nov 1</Text>
        </View>
        <View style={styles.dateItem}>
          <Text style={styles.dateEvent}>Scholarship applications due</Text>
          <Text style={styles.dateValue}>Nov 15</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  header: {
    padding: 24,
    paddingTop: 16,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  email: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    width: '47%',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
    marginTop: 4,
  },
  statDesc: {
    fontSize: 12,
    color: '#94a3b8',
  },
  section: {
    padding: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  dateItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  dateEvent: {
    fontSize: 14,
    color: '#fff',
  },
  dateValue: {
    fontSize: 14,
    color: '#94a3b8',
  },
})
