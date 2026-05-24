# Firebase Admin SDK inside Cloud Functions

The Admin SDK runs with **full admin privileges** — it bypasses security rules. Use it server-side only.

## Initialize once

```ts
import { initializeApp } from "firebase-admin/app";
initializeApp();
```

In a Cloud Functions environment, no credentials are needed — the runtime injects them. Locally with the emulator, the Admin SDK auto-connects to the running Firestore/Auth emulators when `FIRESTORE_EMULATOR_HOST` and `FIREBASE_AUTH_EMULATOR_HOST` env vars are set (the emulator sets them automatically).

## Firestore writes that bypass rules

```ts
import { getFirestore } from "firebase-admin/firestore";
const db = getFirestore();

await db.collection("internal").doc("stats").update({
  totalUsers: db.FieldValue.increment(1),
});
```

This works even if your security rules deny all writes to `internal/`. Useful for system-only collections.

## Verify a client ID token

```ts
import { getAuth } from "firebase-admin/auth";

const token = req.headers.authorization?.replace("Bearer ", "");
if (!token) throw new Error("missing token");

const decoded = await getAuth().verifyIdToken(token);
const uid = decoded.uid;
```

For `onCall` functions, this is done automatically — `request.auth.uid` is already verified.

## Set custom claims

```ts
import { getAuth } from "firebase-admin/auth";

await getAuth().setCustomUserClaims(uid, { role: "admin", tier: "pro" });
```

The client must call `user.getIdToken(true)` to receive a token with the new claims.

## Send FCM push notifications

```ts
import { getMessaging } from "firebase-admin/messaging";

await getMessaging().send({
  token: deviceFcmToken,
  notification: { title: "Hi", body: "From a Cloud Function" },
});
```

## Common pitfalls

- **Don't ship Admin SDK code to the client.** It includes your service account credentials when bundled — instant project takeover.
- **Don't call Admin from `onCall` for things the user could do themselves.** Use the client SDK instead so rules enforce ownership. Use Admin only for cross-user logic or privileged ops.
- **Don't `verifyIdToken` and then re-derive the user from the request body.** Trust only `decoded.uid` for identity.
