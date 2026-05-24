# Push notifications with FCM in Expo

`@react-native-firebase/messaging` is the right choice for FCM push on Expo. **Do not use `expo-notifications` together with FCM for remote push** — they conflict.

## Install

```bash
npx expo install @react-native-firebase/messaging
```

Add the plugin in `app.json`:

```json
{
  "expo": {
    "plugins": [
      "@react-native-firebase/app",
      "@react-native-firebase/messaging"
    ]
  }
}
```

## iOS extra steps

In Apple Developer portal:

1. Create an **APNs Authentication Key** (.p8). Download once — non-recoverable.
2. In Firebase Console → Project Settings → Cloud Messaging → upload the .p8, Key ID, and Team ID.

In `app.json`:

```json
{
  "ios": {
    "infoPlist": {
      "UIBackgroundModes": ["remote-notification"]
    },
    "entitlements": {
      "aps-environment": "production"
    }
  }
}
```

`aps-environment` must be `production` for App Store builds; `development` for ad-hoc / TestFlight is also accepted.

## Request permission and get token

```ts
import messaging from "@react-native-firebase/messaging";

async function registerForPush() {
  const status = await messaging().requestPermission();
  if (status === messaging.AuthorizationStatus.DENIED) return null;

  const token = await messaging().getToken();
  return token;
}
```

Store the returned FCM token in Firestore against the user document so a Cloud Function can target it later.

## Handle foreground messages

```ts
useEffect(() => {
  return messaging().onMessage(async (msg) => {
    // Show your own in-app banner; iOS hides system banners while foregrounded.
  });
}, []);
```

## Send from a Cloud Function

```ts
import { getMessaging } from "firebase-admin/messaging";

await getMessaging().send({
  token: userFcmToken,
  notification: { title: "New message", body: "..." },
  data: { conversationId: "abc" },
});
```

The `data` field is delivered to the client even when the user taps a notification from the background — useful for routing.

## Common mistakes

- **Forgetting the APNs key upload.** iOS pushes will silently fail; Android works fine.
- **Using `expo-notifications` for remote push.** Use it only for local notifications (scheduled, in-app reminders). Remote push goes through `@react-native-firebase/messaging`.
- **Caching the FCM token forever.** Tokens can rotate. Subscribe to `messaging().onTokenRefresh` and update the stored token.
