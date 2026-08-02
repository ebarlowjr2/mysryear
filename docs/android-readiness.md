# Android Readiness

## Scope

Android is a build target of the existing Expo app at `apps/mobile`. Do not create a separate Android app folder or eject/prebuild unless a native requirement forces it.

## Effective Config Checks

Run from `apps/mobile`:

```bash
npx expo config --type public
```

Expected Android essentials:

- `android.package`: `com.mysryear.app`
- `scheme`: `mysryear`
- adaptive icon: `./assets/images/adaptive-icon.png`
- splash image: `./assets/images/splash-icon.png`
- EAS project ID: `71b08967-be0b-4a10-a16a-85fb2eb014d7`

## EAS Profiles

- `preview` builds an installable Android APK for direct testing.
- `production` builds an Android App Bundle for Google Play.
- Android production uses `autoIncrement` to avoid duplicate `versionCode` failures.

## Auth Redirects

Mobile OAuth uses:

```ts
Linking.createURL('auth/callback')
```

Supabase should allow the resulting app redirect URL for the `mysryear` scheme. Before Google Play testing, confirm email verification, password reset, and Google OAuth redirects against the production Supabase auth URL allow-list.

## Upload Notes

Android document picker may return `content://` URIs. Mobile uploads now read selected files with an XHR blob helper instead of assuming `fetch(fileUri)` works for every URI scheme.

Smoke test Android uploads with:

- PDF report card
- image report card
- file name with spaces
- missing MIME type if available
- cancellation flow

## Verification

Run from repo root:

```bash
npm run mobile:verify
npx tsc -p apps/mobile/tsconfig.json --noEmit
npm run verify
```

## First APK Build

Run from `apps/mobile`:

```bash
npx eas build --platform android --profile preview
```

## Android Smoke Test

- App launches
- Login/signup work
- Session persists after close/reopen
- Student sees Student Success Dashboard
- Parent/guardian sees Family Dashboard
- Counselor sees Counselor Dashboard
- Business sees Business Dashboard
- Profile loads and active student profile works
- Report card/document upload works
- Uploaded document appears on web
- Delete works where allowed
- Scholarships load
- A.U.R.A/LifePath opens
- Android back button behaves normally
- Logout works
