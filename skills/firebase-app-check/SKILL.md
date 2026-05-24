---
name: firebase-app-check
description: >-
  Protects Firebase backends from abuse by attesting that requests come from
  your real app — Play Integrity (Android), App Attest / DeviceCheck (iOS),
  reCAPTCHA Enterprise (web). Use whenever the user wants to prevent
  scraping, quota theft, or unauthorized API access to Firestore, Storage,
  Cloud Functions, or Realtime Database.
compatibility: Native attestation providers require @react-native-firebase/app-check on Expo. Enforcement is opt-in per product.
---

# Firebase App Check

App Check verifies that incoming traffic to your Firebase services comes from your authentic, unmodified app — not a script, scraper, or repackaged binary. Without it, anyone with your Firebase web config (which ships in your client bundle) can hit your APIs.

## 1. Register attestation providers

In Firebase Console → App Check → register each app:

| Platform | Provider | Setup |
|---|---|---|
| iOS | **App Attest** (iOS 14+) | Automatic — just enable. Falls back to DeviceCheck on iOS < 14. |
| Android | **Play Integrity** | Requires the app's SHA-256 fingerprint in Firebase Console. |
| Web | **reCAPTCHA Enterprise** | Create a key in Google Cloud Console, paste site key into Firebase Console. |

For Android: `eas credentials` shows your SHA-256 — paste into Firebase Console → Project Settings → your Android app → Add fingerprint, then App Check picks it up automatically.

## 2. Install client (Expo / RN)

```bash
npx expo install @react-native-firebase/app-check
```

`app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/app-check"
    ]
  }
}
```

Initialize early, before any other Firebase call:

```ts
import { Platform } from "react-native";
import appCheck from "@react-native-firebase/app-check";

const provider = appCheck().newReactNativeFirebaseAppCheckProvider();
provider.configure({
  apple: {
    provider: __DEV__ ? "debug" : "appAttestWithDeviceCheckFallback",
    debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
  },
  android: {
    provider: __DEV__ ? "debug" : "playIntegrity",
    debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
  },
});

await appCheck().initializeAppCheck({
  provider,
  isTokenAutoRefreshEnabled: true,
});
```

## 3. Web setup

```ts
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

if (typeof window !== "undefined") {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY!),
    isTokenAutoRefreshEnabled: true,
  });
}
```

For local dev, set a debug token on the window before init:

```ts
if (process.env.NODE_ENV === "development") {
  (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true; // logs a token to register in console
}
```

Copy the token from the browser console → Firebase Console → App Check → your app → Manage debug tokens.

## 4. Enforcement (the important step)

**Registering App Check does nothing on its own.** You must explicitly enforce it per product in the Firebase Console:

- **Cloud Firestore**: App Check → Firestore → Enforce
- **Cloud Storage**: App Check → Storage → Enforce
- **Realtime Database**: App Check → RTDB → Enforce
- **Cloud Functions**: per-function in code (see below)

**CRITICAL**: before enforcing on a live product, monitor the **Unverified Requests** panel for at least a week to confirm 100% of legitimate traffic is sending valid tokens. Enforcing prematurely blocks real users.

### Enforcing on a callable Cloud Function

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const sensitive = onCall({ enforceAppCheck: true }, (request) => {
  if (!request.app) {
    throw new HttpsError("failed-precondition", "App Check required");
  }
  // ... safe to proceed
});
```

`request.app` is the verified App Check token. With `enforceAppCheck: true` the function rejects unverified requests before your handler runs.

## 5. Debug tokens

For simulators, emulators, and CI, you cannot generate real attestation tokens. Set a **debug token**:

1. Run the app once — it prints a debug token to the console
2. Firebase Console → App Check → your app → Manage debug tokens → Add
3. Paste the token, give it a name (e.g. "iOS Simulator")

Debug tokens look like real tokens to Firebase; **rotate or delete them when team members leave**. They bypass attestation.

For full debug token playbook (CI, team rotation, leak detection) see [references/debug-tokens.md](references/debug-tokens.md).

## 6. Common mistakes

- **Enforcing without monitoring first.** Blocks every user who hasn't received an updated client with App Check wired. Always monitor unverified traffic for at least a week before flipping enforcement.
- **Initializing App Check after Firestore/Auth.** Order matters — App Check must be initialized first so subsequent calls attach the token.
- **Forgetting Android SHA-256 fingerprints.** Play Integrity fails silently if Firebase doesn't know your app signature. Add fingerprints for both debug and release certs.
- **Shipping `__DEV__` debug providers to production.** Always confirm `__DEV__` is `false` in release builds — the bundler should strip the dev branch automatically, but verify by checking the bundle.
- **Treating App Check as authentication.** It's attestation — it proves the *app* is legit, not *who* is using it. Pair with Firebase Auth for user identity.
