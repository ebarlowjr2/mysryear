# Authentication Setup Guide

This document explains how to configure Supabase authentication for the MySRYear application.

## Prerequisites

1. A Supabase account at https://app.supabase.com
2. A Supabase project created

## Setup Steps

### 1. Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project
3. Wait for the project to be provisioned

### 2. Run Database Schema

1. In your Supabase project dashboard, go to the SQL Editor
2. Copy the contents of `supabase-schema.sql` from this repository
3. Run the SQL script to create all necessary tables and Row Level Security policies

### 3. Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Get your Supabase credentials:
   - Go to Project Settings > API in your Supabase dashboard
   - Copy the Project URL and anon/public key

3. Update `.env.local` with your credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ```

### 4. Configure Supabase Authentication

1. In your Supabase dashboard, go to Authentication > Providers
2. Enable Email provider (enabled by default)
3. Configure email templates if desired
4. Set up redirect URLs:
   - Add your local development URL: `http://localhost:3000/**`
   - Add your production URL when deploying

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

The application supports three user roles:
- **Student**: Can manage their own academic journey, applications, and tasks
- **Parent**: Can create journeys for students and view/verify their data
- **Counselor**: Read-only access to all student data

### Protected Routes

The following routes require authentication:
- `/dashboard` - Main dashboard
- `/open-dashboard` - Enhanced dashboard with advanced features
- `/planner` - Senior year planner and task management
- `/applications` - Application tracking

### Row Level Security (RLS)

All data is protected by Supabase Row Level Security policies:
- Students can only access their own data
- Parents can access data for students they created journeys for
- Counselors have read-only access to all data
- Scholarships are publicly accessible

## User Data Storage

Each authenticated user's data is stored in Supabase:

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
- Ensure you ran the complete `supabase-schema.sql` script
- Check that RLS is enabled on all tables
- Verify the user has the correct role assigned

### Session not persisting
- Clear your browser cookies and local storage
- Check that middleware is properly configured
- Verify Supabase URL and key are correct

## Development Notes

- The application uses Supabase SSR for proper server-side rendering support
- Authentication state is managed through Supabase Auth
- Middleware protects routes and handles redirects
- The Navbar component shows/hides login/logout buttons based on auth state

## Security Best Practices

1. Never commit `.env.local` to version control
2. Use different Supabase projects for development and production
3. Regularly rotate your API keys
4. Review RLS policies to ensure proper data access control
5. Enable email verification for all users
6. Consider enabling 2FA for admin accounts
