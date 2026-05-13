export const colors = {
  brand: {
    50: '#f1f8ff',
    100: '#dbeeff',
    200: '#bfe0ff',
    300: '#93caff',
    400: '#5da9ff',
    500: '#2a86ff',
    600: '#1966db',
    700: '#144fb1',
    800: '#124392',
    900: '#0f396f',
  },
  accent: {
    500: '#F59E0B',
  },
  slate: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  white: '#ffffff',
  black: '#000000',
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
}

export const ui = {
  background: colors.white,
  backgroundSecondary: colors.slate[50],
  text: colors.slate[900],
  textSecondary: colors.slate[500],
  textMuted: colors.slate[400],
  border: colors.slate[200],
  borderLight: colors.slate[100],
  card: colors.white,
  cardBorder: colors.slate[200],
  primary: colors.brand[600],
  primaryLight: colors.brand[50],
  primaryText: colors.brand[700],
  tabBarBackground: colors.white,
  tabBarBorder: colors.slate[200],
  tabBarActive: colors.brand[600],
  tabBarInactive: colors.slate[400],
  headerBackground: colors.white,
  headerText: colors.slate[900],
  inputBackground: colors.slate[50],
  inputBorder: colors.slate[200],
  inputText: colors.slate[900],
  inputPlaceholder: colors.slate[400],
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
}

export const radius = {
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  full: 9999,
}

export const shadow = {
  soft: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
}
