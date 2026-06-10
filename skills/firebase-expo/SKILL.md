---
name: firebase-expo
description: >-
  Integrates Firebase into an Expo / React Native app — installing
  @react-native-firebase packages, wiring config plugins, handling
  GoogleService-Info.plist and google-services.json, and building with EAS.
  Use whenever the user wants to add any Firebase product (Auth, Firestore,
  Functions, Storage, Messaging, Crashlytics) to an Expo project.
compatibility: Requires Expo SDK 50+ with config plugins. The web JS SDK alone does not support Firebase Auth persistence on RN — use @react-native-firebase for production apps.
---

# Firebase + Expo / React Native

## Minimum viable example

```bash
npx expo install @react-native-firebase/app @react-native-firebase/auth
```

```json
{
  "expo": {
    "ios": { "googleServicesFile": "./GoogleService-Info.plist" },
    "android": { "googleServicesFile": "./google-services.json" },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      ["expo-build-properties", { "ios": { "useFrameworks": "static" } }]
    ]
  }
}
```

```bash
npx expo prebuild --clean && eas build --profile development --platform all
```

That's the full installation loop. `useFrameworks: "static"` is the line most often forgotten — its absence breaks iOS linking.

## 1. Pick the right SDK

There are two Firebase JavaScript options on React Native, and they don't compose well:

| Option | When to use |
|---|---|
| **`@react-native-firebase/*`** (native modules) | Production apps. Auth persistence, FCM push, Crashlytics, Analytics, native performance. Requires Expo prebuild or EAS Build. |
| **`firebase`** (JS-only Web SDK) | Quick prototypes in Expo Go. Cannot do FCM, Crashlytics, Analytics, or Apple Sign-In. Auth persistence requires manual `AsyncStorage` setup. |

This skill covers the **`@react-native-firebase`** path because it's the one that works for shipped apps. For Expo Go prototypes, use the web SDK — note that you must move off Expo Go before launch.

## 2. Install core packages

```bash
npx expo install @react-native-firebase/app
```

Then install one package per Firebase product you need:

```bash
npx expo install @react-native-firebase/auth
npx expo install @react-native-firebase/firestore
npx expo install @react-native-firebase/functions
npx expo install @react-native-firebase/messaging
npx expo install @react-native-firebase/crashlytics
```

## 3. Download config files

In the Firebase Console (or via CLI):

```bash
npx -y firebase-tools@latest apps:create ios   com.yourcompany.yourapp
npx -y firebase-tools@latest apps:create android com.yourcompany.yourapp
```

Download:

- `GoogleService-Info.plist` → put at the repo root (or any path you reference)
- `google-services.json` → put at the repo root (or any path you reference)

**Do not commit these files** if your project is public. Add them to `.gitignore` and document how a teammate fetches them, or commit them if the repo is private.

## 4. Wire config plugins

Edit `app.json` (or `app.config.ts`):

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.yourcompany.yourapp",
      "googleServicesFile": "./GoogleService-Info.plist",
      "usesAppleSignIn": true
    },
    "android": {
      "package": "com.yourcompany.yourapp",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/auth",
      "@react-native-firebase/crashlytics",
      [
        "expo-build-properties",
        {
          "ios": { "useFrameworks": "static" }
        }
      ]
    ]
  }
}
```

**CRITICAL**: `@react-native-firebase` requires iOS static frameworks. Add the `expo-build-properties` plugin above with `useFrameworks: "static"` or iOS builds will fail at link time.

## 5. Build

You cannot use Firebase native modules in Expo Go. You need a **development build** or **EAS Build**.

### Local dev build

```bash
npx expo prebuild --clean
npx expo run:ios
npx expo run:android
```

### EAS Build (recommended for teams)

```bash
npm install -g eas-cli
eas login
eas build:configure
eas build --profile development --platform ios
eas build --profile development --platform android
```

Once the development client is installed on your device, `npx expo start --dev-client` reloads JS over the network just like Expo Go.

## 6. Verify

In `App.tsx`:

```ts
import { useEffect } from "react";
import firestore from "@react-native-firebase/firestore";

export default function App() {
  useEffect(() => {
    firestore().collection("_health").doc("ping").set({ at: Date.now() })
      .then(() => console.log("Firestore connected"))
      .catch(console.error);
  }, []);
  // ...
}
```

A successful write proves the config files, plugins, and security rules all align.

## 7. Routing to other skills

Once the install is in place, use the product-specific skills:

- Auth flows → `firebase-auth` (see its `references/react-native.md`)
- Firestore reads/writes → `firebase-firestore` (see its `references/react-native.md`)
- Cloud Functions (callable from app) → `firebase-cloud-functions`

## 8. Common mistakes

- **Trying to use Expo Go with `@react-native-firebase`.** It cannot work — the native modules aren't in the Expo Go binary. Use a dev build.
- **Forgetting `useFrameworks: "static"`.** iOS build fails with cryptic linker errors.
- **Mixing web SDK and native modules.** Pick one. Importing both in the same app leads to two Firebase initializations with subtly different behavior.
- **Hardcoding the Google `webClientId` from the iOS plist.** The right one is the **Web** OAuth client ID generated by `firebase deploy --only auth`. Check Google Cloud Console → APIs & Services → Credentials.
- **Not regenerating native projects after editing `app.json`.** Run `npx expo prebuild --clean` after plugin changes.

See [references/eas-secrets.md](references/eas-secrets.md) for handling environment variables and secrets in EAS Build, and [references/push-notifications.md](references/push-notifications.md) for FCM setup.
