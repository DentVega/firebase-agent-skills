---
name: firebase-crashlytics
description: >-
  Adds Firebase Crashlytics crash reporting to React Native / Expo apps —
  config plugin install, JS error capture, custom logs and user IDs, source
  map upload via EAS, native dSYM upload, and forcing test crashes. Use
  whenever the user wants production crash visibility for a mobile app.
compatibility: Native module — requires Expo prebuild or EAS Build. Will not work in Expo Go. Pair with firebase-expo.
---

# Firebase Crashlytics (Expo / React Native)

## 1. Install

```bash
npx expo install @react-native-firebase/crashlytics
```

`app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/crashlytics"
    ]
  }
}
```

Rebuild — Crashlytics requires native linking:

```bash
npx expo prebuild --clean
eas build --profile development --platform all
```

## 2. Verify it works

The most reliable way to confirm Crashlytics is wired is to **force a crash** and check the console:

```ts
import crashlytics from "@react-native-firebase/crashlytics";

// Tied to a debug-only button:
function ForceCrashButton() {
  return <Button title="Crash" onPress={() => crashlytics().crash()} />;
}
```

After tapping:

1. The app dies (this is expected)
2. Relaunch the app — Crashlytics uploads the report on next start
3. Wait 5-15 minutes, then check Firebase Console → Crashlytics

If nothing appears after 30 minutes, see [references/troubleshooting.md](references/troubleshooting.md).

## 3. JavaScript errors

Native crashes are captured automatically. **JS errors are not** — wrap your error boundary and unhandled-rejection handlers:

```ts
import crashlytics from "@react-native-firebase/crashlytics";

// Unhandled promise rejections
const origHandler = global.HermesInternal?.hasPromise?.()
  ? require("promise/setimmediate/rejection-tracking")
  : null;
// Or use react-native-exception-handler / your error boundary

// In your error boundary's componentDidCatch:
componentDidCatch(error: Error, info: React.ErrorInfo) {
  crashlytics().recordError(error, error.name);
}
```

`recordError` reports a **non-fatal** — visible in Crashlytics under a separate tab. The app keeps running.

## 4. Context: user IDs and custom keys

Add context so you can debug a specific user's crashes:

```ts
import auth from "@react-native-firebase/auth";

auth().onAuthStateChanged((user) => {
  if (user) {
    crashlytics().setUserId(user.uid);
    crashlytics().setAttributes({
      email: user.email ?? "",
      tier: "pro",
    });
  } else {
    crashlytics().setUserId("");
  }
});
```

`setUserId` is searchable in the console — typing the uid jumps straight to that user's reports.

## 5. Breadcrumbs (custom logs)

Log a trail of recent actions so you can see what led to the crash:

```ts
crashlytics().log("User tapped Pay button");
crashlytics().log(`Order ${orderId} submitted`);
```

These appear in the crash report under "Logs". Keep them short — they have a per-report quota.

## 6. Source maps (so JS stacks are readable)

Without source maps, JS errors show minified stacks. To upload maps on every EAS build, add a post-build hook in `eas.json`:

```json
{
  "build": {
    "production": {
      "ios":     { "buildConfiguration": "Release" },
      "android": { "buildType": "app-bundle" }
    }
  }
}
```

Then run the upload step locally after `eas build` finishes (the build artifacts include the sourcemap). The exact command depends on `@react-native-firebase` version — newer versions auto-upload via the bundle phase script when Crashlytics is in the plugin list.

For native iOS dSYMs (required for symbolicated native crashes): EAS Build uploads dSYMs to App Store Connect automatically; you must download them and upload to Crashlytics if you're not using auto-upload. Enable **automatic dSYM upload** in the Firebase console: Project Settings → iOS app → "Upload symbols".

## 7. Common mistakes

- **Expecting JS errors to appear automatically.** They don't — only native crashes. You must call `recordError` from your error boundary.
- **Forgetting to relaunch after a crash.** Crashlytics uploads on the next app start, not from the crashed process.
- **Testing in debug.** Some configs disable Crashlytics in debug builds. Force a crash in a release / preview build to verify.
- **Reading minified stacks.** If you see `at l (index.android.bundle:1:12345)`, source maps are not wired.
- **Setting user ID before sign-in completes.** Wait for `onAuthStateChanged` to fire with a user before calling `setUserId`.
