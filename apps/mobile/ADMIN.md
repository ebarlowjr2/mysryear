# Admin Guide: Manual Verification Workflow

This document describes how administrators can manually verify Business and Teacher accounts in the MySrYear app.

## Overview

Sprint 10 introduces a verification system for Business and Teacher accounts. Verified accounts display trust badges to students and parents, helping them identify legitimate organizations and educators.

## Verification States

Accounts can be in one of three states:

1. **unverified** (default) - Account has not requested or received verification
2. **pending** - User has requested verification, awaiting admin review
3. **verified** - Admin has approved the account

## How to Verify an Account

### Step 1: Access Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Select the MySrYear project (mrereohvorzxzphggzcl)
3. Navigate to **Table Editor** in the left sidebar

### Step 2: Find the Account to Verify

1. Select the **profiles** table
2. Use the filter to find accounts with `verification_status = 'pending'`
3. Or search by email/name to find a specific account

### Step 3: Update Verification Status

1. Click on the row for the account you want to verify
2. Change `verification_status` from `pending` to `verified`
3. Click **Save** to apply the change

The user will see their updated verification status the next time they open the app.

## What Users See

### Business Accounts
- **Unverified**: Yellow banner on Profile page with "Request Verification" button
- **Pending**: Blue banner showing "Verification request submitted"
- **Verified**: Green banner with checkmark showing "Verified Account"

### Teacher Accounts
- Same banner states as Business accounts
- Helper text mentions upcoming school announcement features

### Students/Parents
- See "Verified" badge on opportunity cards from verified businesses
- See "Verified Business" badge on opportunity detail pages
- No verification UI shown (verification is for Business/Teacher only)

## Database Schema

The verification fields are stored in the `profiles` table:

```sql
verification_status text CHECK (verification_status IN ('unverified', 'pending', 'verified')) DEFAULT 'unverified'
verification_requested_at timestamptz
```

## SQL Migration

If the verification columns don't exist, run this SQL in the Supabase SQL Editor:

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verification_status text
  CHECK (verification_status IN ('unverified', 'pending', 'verified'))
  DEFAULT 'unverified',
ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;
```

## Security Notes

- Only admins can set `verification_status` to `verified`
- Users can only change their status from `unverified` to `pending` via the app
- The app prevents users from setting themselves to `verified`
- Verification is visual only in Sprint 10 - no permissions are unlocked

## Future Enhancements

- Automated verification workflows
- Email notifications when verification is approved
- Verification rejection with reason
- Permission unlocks for verified accounts
