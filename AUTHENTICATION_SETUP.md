# Authentication Setup Guide

This document explains how to configure Supabase authentication for the MySRYear web app.

## Prerequisites

1. A Supabase account at https://app.supabase.com
2. A Supabase project created

## Setup Steps

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project
3. Wait for the project to be provisioned

### 2. Apply Database Schema

This repo is moving to migrations-first.

- Migrations live in `supabase/migrations/`
- A legacy schema snapshot is in `docs/legacy/supabase-schema.sql` (reference only)

If you have an existing SQL migration file (Sprint 3), place it in
`supabase/migrations/<timestamp>_sprint3_notifications_tracking.sql` and apply it.

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Supabase credentials:
   - Go to Project Settings > API in your Supabase dashboard
   - Copy the Project URL and anon/public key

3. Update `.env.local` with your credentials.

### 4. Configure Supabase Authentication

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Email provider (enabled by default)
3. Configure email templates if desired
4. Set up redirect URLs:
   - `http://localhost:3000/**`
   - Your production URL when deploying

### 5. Test Authentication

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to http://localhost:3000/signup
3. Create a test account
4. Check your email for the confirmation link
5. After confirming, log in at http://localhost:3000/login

## Authentication Flow

### User Roles

The application currently supports three user roles:
- **student**
- **parent**
- **counselor**

> Note: these roles are wired into the current tables and RLS policies.

### Protected Routes

The middleware currently protects:
- `/dashboard`
- `/open-dashboard`
- `/planner`
- `/applications`

If you expand protected routes later, update middleware and this doc together.

### Row Level Security (RLS)

All data is protected by Supabase Row Level Security policies:
- Students can only access their own data
- Parents can access data for students they created journeys for
- Counselors have read-only access to all data
- Scholarships are publicly accessible

## User Data Storage

Each authenticated user's data is stored in Supabase:

- **users**: Auth profile + role
- **user_profiles**: User preferences (state, path, testing plan)
- **user_tasks**: Senior year tasks and deadlines
- **user_documents**: Document completion tracking
- **user_recommenders**: Recommendation letter tracking
- **user_visits**: Campus visit notes and ratings
- **journeys**: Academic journey records (for students)
- **academic_records**: Grade and credit tracking
- **service_hours**: Community service logging
- **college_applications**: Application tracking

## Troubleshooting

### "Invalid API key" error
- Verify your environment variables are set correctly
- Make sure you're using the anon/public key, not the service role key
- Restart your development server after changing environment variables

### Email confirmation not received
- Check your spam folder
- Verify email provider is enabled in Supabase dashboard
- Check Supabase logs for email delivery errors

### RLS policy errors
- Ensure you ran the complete migration(s)
- Check that RLS is enabled on all tables
- Verify the user has the correct role assigned

### Session not persisting
- Clear your browser cookies and local storage
- Check that middleware is properly configured
- Verify Supabase URL and key are correct

## Development Notes

- The application uses Supabase SSR for server-side rendering support
- Authentication state is managed through Supabase Auth
- Middleware protects routes and handles redirects
- The Navbar component shows/hides login/logout buttons based on auth state
