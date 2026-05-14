# My SR Year Mobile App - Release Guide

This guide documents the steps to build and distribute the iOS app via TestFlight.

## Prerequisites

1. **Apple Developer Account**: You need an active Apple Developer Program membership ($99/year)
2. **EAS CLI**: Install globally with `npm install -g eas-cli`
3. **Expo Account**: Create one at https://expo.dev if you don't have one

## Initial Setup (One-time)

### 1. Login to EAS

```bash
cd apps/mobile
eas login
```

### 2. Configure Apple Credentials

Update `eas.json` with your Apple credentials:

```json
{
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "your-team-id"
      }
    }
  }
}
```

- **appleId**: Your Apple ID email
- **ascAppId**: Find this in App Store Connect under your app's "App Information"
- **appleTeamId**: Find this at https://developer.apple.com/account under "Membership"

### 3. Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click "My Apps" → "+" → "New App"
3. Fill in:
   - Platform: iOS
   - Name: My SR Year
   - Primary Language: English (U.S.)
   - Bundle ID: com.mysryear.app
   - SKU: mysryear-ios

## Building for TestFlight

### Development Build (for testing on physical device)

```bash
cd apps/mobile
eas build --platform ios --profile preview
```

This creates an internal distribution build that can be installed on registered devices.

### Production Build (for TestFlight/App Store)

```bash
cd apps/mobile
eas build --platform ios --profile production
```

This creates a production build ready for TestFlight submission.

## Submitting to TestFlight

### Automatic Submission

After the build completes, submit to TestFlight:

```bash
eas submit --platform ios --latest
```

Or submit a specific build:

```bash
eas submit --platform ios --id BUILD_ID
```

### Manual Submission

1. Download the `.ipa` file from the EAS build page
2. Open Transporter app on Mac
3. Drag and drop the `.ipa` file
4. Click "Deliver"

## TestFlight Distribution

### Adding Internal Testers

1. Go to App Store Connect → Your App → TestFlight
2. Click "App Store Connect Users"
3. Add team members who have App Store Connect access

### Adding External Testers

1. Go to TestFlight → External Testing
2. Create a new group (e.g., "Beta Testers")
3. Add testers by email
4. Submit the build for Beta App Review (required for external testers)

### Inviting Testers

Once approved, testers will receive an email with instructions to:
1. Download TestFlight from the App Store
2. Accept the invitation
3. Install the app

## Version Management

### Incrementing Version

Update `app.json`:

```json
{
  "expo": {
    "version": "1.0.1",
    "ios": {
      "buildNumber": "2"
    }
  }
}
```

- **version**: User-facing version (e.g., 1.0.0, 1.1.0)
- **buildNumber**: Internal build number (auto-incremented by EAS if `autoIncrement: true`)

## Environment Variables

For production builds, set environment variables in EAS:

```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "your-supabase-url"
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "your-anon-key"
```

## Troubleshooting

### Build Fails with Signing Error

Run credential management:

```bash
eas credentials
```

Select iOS → Production → Manage credentials

### App Rejected by Beta App Review

Common reasons:
- Missing privacy policy URL
- Incomplete app metadata
- Crashes on launch

Fix the issues and resubmit.

## Quick Reference Commands

```bash
# Login to EAS
eas login

# Build for TestFlight
eas build --platform ios --profile production

# Submit to TestFlight
eas submit --platform ios --latest

# Check build status
eas build:list

# Manage credentials
eas credentials
```
