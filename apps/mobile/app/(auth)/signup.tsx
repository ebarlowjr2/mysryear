import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuth } from '../../src/contexts/AuthContext'

function validateEmail(email: string): string | null {
  if (!email) return 'Email is required'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'Please enter a valid email address'
  return null
}

function validatePassword(password: string): string | null {
  if (!password) return 'Password is required'
  if (password.length < 6) return 'Password must be at least 6 characters'
  return null
}

function validateConfirmPassword(password: string, confirmPassword: string): string | null {
  if (!confirmPassword) return 'Please confirm your password'
  if (password !== confirmPassword) return 'Passwords do not match'
  return null
}

export default function SignupScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string
    password?: string
    confirmPassword?: string
  }>({})
  const { signUp, signInWithGoogle } = useAuth()
  const [googleLoading, setGoogleLoading] = useState(false)

  const validateForm = (): boolean => {
    const emailError = validateEmail(email)
    const passwordError = validatePassword(password)
    const confirmError = validateConfirmPassword(password, confirmPassword)

    setFieldErrors({
      email: emailError || undefined,
      password: passwordError || undefined,
      confirmPassword: confirmError || undefined,
    })

    return !emailError && !passwordError && !confirmError
  }

  const handleSignup = async () => {
    setError('')
    setSuccess(false)

    if (!validateForm()) return

    setLoading(true)

    try {
      const { error } = await signUp(email, password)

      if (error) {
        if (error.message.includes('already registered')) {
          setError('This email is already registered. Please sign in instead.')
        } else if (error.message.includes('valid email')) {
          setFieldErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }))
        } else {
          setError(error.message || 'Failed to create account')
        }
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    setGoogleLoading(true)
    setError('')

    try {
      const { error } = await signInWithGoogle()

      if (error) {
        setError(error.message || 'Failed to sign up with Google')
      }
    } catch (err) {
      setError('An unexpected error occurred')
    } finally {
      setGoogleLoading(false)
    }
  }

  const clearFieldError = (field: 'email' | 'password' | 'confirmPassword') => {
    setFieldErrors(prev => ({ ...prev, [field]: undefined }))
  }

  if (success) {
    return (
      <View style={styles.container}>
        <View style={styles.inner}>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.successText}>
            We've sent a confirmation link to {email}. Please check your inbox and click the link to activate your account.
          </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Back to Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.inner}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join My SR Year to manage your graduation journey</Text>

          <View style={styles.form}>
            <View>
              <TextInput
                style={[styles.input, fieldErrors.email && styles.inputError]}
                placeholder="Email"
                placeholderTextColor="#666"
                value={email}
                onChangeText={(text) => {
                  setEmail(text)
                  clearFieldError('email')
                }}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
              />
              {fieldErrors.email && <Text style={styles.fieldError}>{fieldErrors.email}</Text>}
            </View>

            <View>
              <TextInput
                style={[styles.input, fieldErrors.password && styles.inputError]}
                placeholder="Password (min 6 characters)"
                placeholderTextColor="#666"
                value={password}
                onChangeText={(text) => {
                  setPassword(text)
                  clearFieldError('password')
                }}
                secureTextEntry
                autoComplete="new-password"
              />
              {fieldErrors.password && <Text style={styles.fieldError}>{fieldErrors.password}</Text>}
            </View>

            <View>
              <TextInput
                style={[styles.input, fieldErrors.confirmPassword && styles.inputError]}
                placeholder="Confirm Password"
                placeholderTextColor="#666"
                value={confirmPassword}
                onChangeText={(text) => {
                  setConfirmPassword(text)
                  clearFieldError('confirmPassword')
                }}
                secureTextEntry
                autoComplete="new-password"
              />
              {fieldErrors.confirmPassword && <Text style={styles.fieldError}>{fieldErrors.confirmPassword}</Text>}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Create Account</Text>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity
              style={[styles.googleButton, googleLoading && styles.buttonDisabled]}
              onPress={handleGoogleSignup}
              disabled={googleLoading}
            >
              {googleLoading ? (
                <ActivityIndicator color="#333" />
              ) : (
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <Link href="/(auth)/login" asChild>
                <TouchableOpacity>
                  <Text style={styles.linkText}>Sign In</Text>
                </TouchableOpacity>
              </Link>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  scrollContent: {
    flexGrow: 1,
  },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
  },
  successText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: '#334155',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
  },
  fieldError: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
    marginLeft: 4,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#334155',
  },
  dividerText: {
    color: '#64748b',
    paddingHorizontal: 16,
    fontSize: 14,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  footerText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  linkText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
})
