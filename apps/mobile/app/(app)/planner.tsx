import React from 'react'
import { View, Text, StyleSheet } from 'react-native'

export default function PlannerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Senior Year Planner</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    marginTop: 8,
  },
})
