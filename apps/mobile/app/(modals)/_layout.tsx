import { Stack } from 'expo-router'
import { ui } from '../../src/theme'

export default function ModalsLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: 'modal',
        headerStyle: { backgroundColor: ui.headerBackground },
        headerTintColor: ui.headerText,
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="new-task" options={{ title: 'New Task' }} />
      <Stack.Screen name="edit-task/[id]" options={{ title: 'Edit Task' }} />
    </Stack>
  )
}
