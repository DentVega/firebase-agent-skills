---
name: firebase-analytics
description: >-
  Sets up Firebase Analytics (Google Analytics for Firebase) on web and
  Expo / React Native — installing, logging custom events, setting user
  properties, debugging in real time, integrating with BigQuery for raw
  events, and respecting iOS ATT consent. Use whenever the user wants to
  track product usage, funnels, or user demographics.
compatibility: Native module on RN via @react-native-firebase/analytics. On iOS, requires App Tracking Transparency consent for IDFA-based features.
---

# Firebase Analytics

## 1. Install

### Web

```bash
npm install firebase
```

```ts
import { getAnalytics, isSupported } from "firebase/analytics";

let analytics: ReturnType<typeof getAnalytics> | null = null;
isSupported().then((ok) => {
  if (ok) analytics = getAnalytics(app);
});
```

`isSupported()` is required for SSR (Next.js) — `getAnalytics` throws in non-browser environments.

### Expo / React Native

```bash
npx expo install @react-native-firebase/analytics
```

Add to `app.json`:

```json
{
  "expo": {
    "plugins": ["@react-native-firebase/app", "@react-native-firebase/analytics"]
  }
}
```

Rebuild (`npx expo prebuild --clean` + EAS Build).

## 2. iOS App Tracking Transparency (ATT)

For any IDFA-based analytics (cross-app tracking, ad attribution), iOS 14.5+ requires explicit user consent via the ATT prompt. Without it, IDFA is zeroed out and ad measurement breaks.

```bash
npx expo install expo-tracking-transparency
```

`app.json`:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "We use this to measure ad performance and personalize content."
      }
    }
  }
}
```

```ts
import { requestTrackingPermissionsAsync } from "expo-tracking-transparency";

const { status } = await requestTrackingPermissionsAsync();
// status is "granted" | "denied" | "restricted" | "undetermined"
```

Firebase Analytics still works without ATT for first-party events and aggregate metrics — only IDFA-linked features (Audiences for ads, attribution) are affected.

**If shipping in the EEA, UK, or Switzerland**, you also need Google Consent Mode v2 — see [references/consent-mode.md](references/consent-mode.md). Without it, Google blocks all data from those regions.

## 3. Log events

```ts
import analytics from "@react-native-firebase/analytics";

await analytics().logEvent("post_created", {
  category: "blog",
  word_count: 450,
});
```

**Reserved events** (`screen_view`, `login`, `sign_up`, `purchase`, `search`, etc.) get richer reporting — use them when applicable:

```ts
await analytics().logLogin({ method: "google" });
await analytics().logSignUp({ method: "email" });
await analytics().logPurchase({
  currency: "USD",
  value: 9.99,
  items: [{ item_id: "pro_monthly", item_name: "Pro Monthly", price: 9.99 }],
});
```

### Event naming rules

- Lowercase snake_case
- ≤ 40 characters
- ≤ 25 parameters per event
- Parameter names ≤ 40 chars, values ≤ 100 chars (string) or `number`

Events that violate these rules are silently dropped. Test in DebugView (next section).

## 4. Real-time debugging (DebugView)

The Analytics dashboard has a 24h delay. For development, use DebugView for real-time event verification:

```bash
# iOS Simulator
xcrun simctl spawn booted log stream --predicate 'subsystem == "com.google.firebase.analytics"'

# Or enable persistently:
adb shell setprop debug.firebase.analytics.app <your.package.name>
```

For iOS, in Xcode → Edit Scheme → Run → Arguments → add `-FIRDebugEnabled` to "Arguments Passed On Launch".

Open Firebase Console → Analytics → DebugView → your device appears, events stream in seconds.

## 5. User properties and IDs

```ts
await analytics().setUserId(user.uid);
await analytics().setUserProperty("tier", "pro");
await analytics().setUserProperty("signup_source", "google");
```

User properties are usable as Audiences for Remote Config targeting and Firebase Messaging campaigns. They're also dimensions in BigQuery exports.

**Privacy**: never set personally identifiable strings as user properties (email, name, phone). Use anonymous IDs only. The `userId` accepts an opaque string — your Firebase Auth uid is fine.

## 6. Screen tracking (React Navigation)

```ts
import analytics from "@react-native-firebase/analytics";
import { useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";

const navigationRef = useRef<NavigationContainerRef<any>>(null);
const routeNameRef = useRef<string>();

<NavigationContainer
  ref={navigationRef}
  onReady={() => { routeNameRef.current = navigationRef.current?.getCurrentRoute()?.name; }}
  onStateChange={async () => {
    const previous = routeNameRef.current;
    const current = navigationRef.current?.getCurrentRoute()?.name;
    if (previous !== current) {
      await analytics().logScreenView({ screen_name: current, screen_class: current });
    }
    routeNameRef.current = current;
  }}
>
```

For Expo Router, hook into the `useSegments()` change instead.

## 7. BigQuery export

For raw event analysis beyond what the console offers, enable BigQuery export:

Firebase Console → Project Settings → Integrations → BigQuery → Link.

Events stream to a daily-partitioned table (`events_YYYYMMDD`) with ~1 hour delay. Pricing: free under 1M events/day; standard BigQuery beyond.

## 8. Common mistakes

- **Calling `getAnalytics` in Next.js without `isSupported`.** Throws during SSR.
- **Expecting events in the dashboard immediately.** 24h delay. Use DebugView for verification.
- **Naming events in CamelCase or with spaces.** Silently rejected.
- **Setting PII as user properties.** Violates Google's terms and risks account suspension.
- **Forgetting to rebuild after adding the plugin.** `@react-native-firebase/analytics` requires native code.
- **Treating Analytics as a real-time event bus.** It's batched. For real-time, write events to Firestore or Pub/Sub.
