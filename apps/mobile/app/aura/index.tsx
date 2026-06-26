import React from 'react'
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { colors, radius, shadow, ui } from '../../src/theme'

export default function AuraScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}>A.U.R.A</Text>
      <Text style={styles.title}>Planning modules for what comes next.</Text>
      <Text style={styles.subtitle}>Start with LifePath today. More guided planning tools are coming soon.</Text>

      <TouchableOpacity style={styles.card} onPress={() => router.push('/aura/lifepath' as never)}>
        <View style={styles.iconWrap}><Ionicons name="map-outline" size={24} color={ui.primary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>A.U.R.A LifePath</Text>
          <Text style={styles.cardText}>Compare career paths, cost, debt risk, and Career Health.</Text>
          <Text style={styles.cardAction}>Open LifePath</Text>
        </View>
      </TouchableOpacity>

      <View style={[styles.card, styles.disabledCard]}>
        <View style={styles.iconWrap}><Ionicons name="chatbubbles-outline" size={24} color={ui.textSecondary} /></View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>A.U.R.A Guidance Counselor</Text>
          <Text style={styles.cardText}>Guided school and career conversations.</Text>
          <Text style={styles.comingSoon}>Coming soon</Text>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: ui.background },
  content: { padding: 20, paddingBottom: 40 },
  kicker: { color: ui.primary, fontWeight: '800', marginBottom: 8 },
  title: { color: ui.text, fontSize: 30, fontWeight: '900', lineHeight: 36 },
  subtitle: { color: ui.textSecondary, fontSize: 15, lineHeight: 22, marginTop: 10, marginBottom: 18 },
  card: { flexDirection: 'row', gap: 14, backgroundColor: ui.card, borderColor: ui.cardBorder, borderWidth: 1, borderRadius: radius.lg, padding: 16, marginTop: 14, ...shadow.card },
  disabledCard: { opacity: 0.7 },
  iconWrap: { width: 44, height: 44, borderRadius: radius.md, backgroundColor: ui.primaryLight, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { color: ui.text, fontSize: 17, fontWeight: '800' },
  cardText: { color: ui.textSecondary, fontSize: 14, lineHeight: 20, marginTop: 4 },
  cardAction: { color: ui.primary, fontWeight: '800', marginTop: 10 },
  comingSoon: { color: ui.textMuted, fontWeight: '700', marginTop: 10 },
})
