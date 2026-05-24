# Crashlytics troubleshooting

## "I forced a crash but nothing appears"

Walk this list in order:

### 1. Did the app actually upload?

Crashlytics uploads on the **next app launch** after the crash. Make sure you actually reopened the app after force-crashing. The upload is also conditional on a network connection.

### 2. Is Crashlytics in the plugins list?

```bash
grep -A2 plugins app.json
```

`@react-native-firebase/crashlytics` must be listed under `expo.plugins`. If you added it after a build, you need to rebuild — `npx expo start --dev-client` against an old build won't pick up new plugins.

### 3. Is the Crashlytics SDK collecting?

Some setups disable collection in debug. Force it on temporarily:

```ts
import crashlytics from "@react-native-firebase/crashlytics";

useEffect(() => {
  crashlytics().setCrashlyticsCollectionEnabled(true);
}, []);
```

If `setCrashlyticsCollectionEnabled(false)` was called previously, the setting persists until explicitly re-enabled.

### 4. Are you looking at the right Firebase project?

Open `google-services.json` (Android) or `GoogleService-Info.plist` (iOS) and confirm the `project_id` matches the Firebase Console project you're checking.

### 5. Is the device on a recent enough OS?

Crashlytics needs iOS 13+ / Android 5+ for newer SDK versions.

## "I see native crashes but JS errors are missing"

JS errors are only captured if you explicitly call `crashlytics().recordError(err)`. Wire your error boundary's `componentDidCatch` and any unhandled promise rejection tracker to call it.

## "Stack traces are unreadable (minified)"

You need source maps uploaded for the matching bundle. Check the iOS / Android build logs for "Crashlytics symbol upload" — if it's missing, the auto-upload step isn't running.

Worst case, you can manually upload using `firebase crashlytics:symbols:upload` from `firebase-tools` once you have the .map file.

## "iOS native crashes show as `<unknown>`"

Missing dSYMs. In Firebase Console → Project Settings → your iOS app, check the "Crashlytics dSYM uploads" panel. If recent builds are missing, download the dSYM bundle from App Store Connect → TestFlight → your build → "Build Metadata" and upload via:

```bash
npx -y firebase-tools@latest crashlytics:symbols:upload --app=<iOS-app-id> path/to/dSYMs.zip
```

## "Crash reports appear hours late"

That's normal. Crashlytics batches uploads. For real-time visibility during development, the **Velocity Alerts** tab is for production scale only — single dev crashes show in the main dashboard with a delay of up to 30 minutes for the first crash, faster afterward.
