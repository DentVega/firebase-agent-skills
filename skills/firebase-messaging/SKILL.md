---
name: firebase-messaging
description: >-
  Configures Firebase Cloud Messaging (FCM) for push notifications — APNs
  key setup, Android FCM v1, requesting permission, getting and storing
  device tokens, topic subscriptions, sending from Cloud Functions, and
  deep-linking from notification taps. Use whenever the user wants to send
  remote push notifications to a web, iOS, or Android app.
compatibility: For Expo/RN, use @react-native-firebase/messaging — NOT expo-notifications for remote push. Pair with firebase-expo for install setup and firebase-cloud-functions for sending.
---

# Firebase Cloud Messaging (FCM)

## 1. Provider setup

### iOS (APNs)

1. In Apple Developer portal: **Keys** → create an **APNs Authentication Key** (.p8). Download once — non-recoverable.
2. Firebase Console → Project Settings → Cloud Messaging → Apple app config → upload the .p8, Key ID, and Team ID.

`aps-environment` must match the build:
- `development` for dev builds / TestFlight internal
- `production` for App Store / TestFlight external

### Android

FCM works automatically when `google-services.json` is wired (see `firebase-expo`). Newer FCM uses HTTP v1; the legacy server key path is deprecated — don't use `fcm.googleapis.com/fcm/send` from new code.

## 2. Client setup (Expo / React Native)

```bash
npx expo install @react-native-firebase/messaging
```

```json
{
  "expo": {
    "plugins": ["@react-native-firebase/app", "@react-native-firebase/messaging"],
    "ios": {
      "infoPlist": { "UIBackgroundModes": ["remote-notification"] },
      "entitlements": { "aps-environment": "production" }
    }
  }
}
```

Rebuild after editing `app.json`:

```bash
npx expo prebuild --clean
eas build --profile development --platform ios
```

## 3. Request permission and get token

```ts
import messaging from "@react-native-firebase/messaging";
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";

export async function registerForPush() {
  const status = await messaging().requestPermission();
  const ok = status === messaging.AuthorizationStatus.AUTHORIZED
          || status === messaging.AuthorizationStatus.PROVISIONAL;
  if (!ok) return;

  const token = await messaging().getToken();
  const uid = auth().currentUser?.uid;
  if (!uid) return;

  await firestore().collection("users").doc(uid).set({
    fcmTokens: firestore.FieldValue.arrayUnion(token),
  }, { merge: true });

  messaging().onTokenRefresh(async (newToken) => {
    await firestore().collection("users").doc(uid).update({
      fcmTokens: firestore.FieldValue.arrayUnion(newToken),
    });
  });
}
```

Store tokens as an **array** per user (not a single field) — users have multiple devices. Prune dead tokens on send failure (see "sending" below).

## 4. Receiving messages

### Foreground

```ts
useEffect(() => {
  return messaging().onMessage(async (msg) => {
    // iOS suppresses system banners while foregrounded. Show your own in-app banner.
  });
}, []);
```

### Background → app opened from notification

```ts
useEffect(() => {
  // App opened from a quit state by tapping a notification
  messaging().getInitialNotification().then((msg) => {
    if (msg?.data?.deepLink) router.push(msg.data.deepLink as string);
  });

  // App brought from background to foreground by tap
  return messaging().onNotificationOpenedApp((msg) => {
    if (msg?.data?.deepLink) router.push(msg.data.deepLink as string);
  });
}, []);
```

Always read routing info from `msg.data` (custom payload), not `msg.notification` — the latter is the visible text and may be empty for data-only messages.

### Background message handler

Register at the top of `index.js` (outside React):

```js
import messaging from "@react-native-firebase/messaging";

messaging().setBackgroundMessageHandler(async (msg) => {
  // Runs in a separate JS context. Cannot touch React state.
  // Useful for syncing data, updating badges, etc.
});
```

## 5. Sending from a Cloud Function

```ts
import { getMessaging } from "firebase-admin/messaging";

export const notifyMention = onDocumentCreated("mentions/{id}", async (event) => {
  const data = event.data?.data();
  const userSnap = await getFirestore().collection("users").doc(data.userId).get();
  const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
  if (tokens.length === 0) return;

  const response = await getMessaging().sendEachForMulticast({
    tokens,
    notification: { title: "You were mentioned", body: data.preview },
    data: { deepLink: `/posts/${data.postId}` },
    apns: { payload: { aps: { badge: 1, sound: "default" } } },
    android: { priority: "high" },
  });

  // Prune invalid tokens
  const stale: string[] = [];
  response.responses.forEach((r, i) => {
    if (!r.success && (
      r.error?.code === "messaging/registration-token-not-registered" ||
      r.error?.code === "messaging/invalid-registration-token"
    )) stale.push(tokens[i]);
  });
  if (stale.length) {
    await getFirestore().collection("users").doc(data.userId).update({
      fcmTokens: getFirestore.FieldValue.arrayRemove(...stale),
    });
  }
});
```

Always handle the response and prune dead tokens, otherwise the array grows unbounded and every send hits failed deliveries.

## 6. Topics

For broadcast notifications (e.g. "users who follow team X"), use topics instead of token lists:

```ts
// Client subscribes
await messaging().subscribeToTopic("team-lakers");

// Function sends
await getMessaging().send({
  topic: "team-lakers",
  notification: { title: "Lakers won", body: "..." },
});
```

Topic names must match `[a-zA-Z0-9-_.~%]+`. Max 5 topics per device for direct subscriptions, but server-side topic management has no limit.

## 7. Common mistakes

- **Using `expo-notifications` for remote push.** It's for local notifications only. Remote FCM requires `@react-native-firebase/messaging`.
- **Not uploading the APNs key.** iOS pushes silently fail; Android works fine — easy to miss in testing.
- **Reading routing info from `notification` instead of `data`.** Data-only messages have no `notification` field.
- **Storing one token per user.** Users have phones + tablets; store an array and prune on send failures.
- **Forgetting `aps-environment`.** App Store builds without `"production"` will not receive any pushes.
- **Sending to >500 tokens with `send()`.** Use `sendEachForMulticast` (up to 500 per call, chunk for more).
