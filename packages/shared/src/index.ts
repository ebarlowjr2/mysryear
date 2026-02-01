// Main entry point for @mysryear/shared package

// Types
export * from './types'

// Supabase clients
export { createWebSupabaseClient, createWebServerSupabaseClient } from './supabase/client.web'
export { getWebEnv } from './supabase/env'

// Data layer
export * from './data/tasks'
export * from './data/applications'
export * from './data/profiles'
export * from './data/dashboard'
export * from './data/parent'
export * from './data/schools'
export * from './data/opportunities'
export * from './data/jobs'
export * from './data/mentors'

// Content
export * from './content/careerPaths'
