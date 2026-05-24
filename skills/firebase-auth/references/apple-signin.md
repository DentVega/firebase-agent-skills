# Apple Sign-In — full setup

Apple Sign-In can't be fully enabled via the Firebase CLI. The steps differ by platform.

## 1. Enable in Firebase Console

1. Open `https://console.firebase.google.com/project/_/authentication/providers`
2. Click **Apple** → enable
3. Leave Service ID empty for iOS-only apps; fill it for Android/Web

## 2. iOS app

In Xcode:

1. Select your target → **Signing & Capabilities** → **+ Capability** → **Sign in with Apple**
2. Make sure your provisioning profile includes the capability (auto-managed signing handles this)

In Expo, add to `app.json`:

```json
{
  "ios": { "usesAppleSignIn": true }
}
```

Run `npx expo prebuild` (or rebuild with EAS) to apply.

## 3. Android / Web app

Apple does not provide a native Android SDK. You authenticate via a Service ID + redirect URL.

1. In the [Apple Developer portal](https://developer.apple.com/account/resources/identifiers/list/serviceId), create a **Services ID**
2. Configure it with **Sign In with Apple** enabled
3. Set the Return URL to the one Firebase shows (`https://<project>.firebaseapp.com/__/auth/handler`)
4. Create a **Sign in with Apple Key** (.p8 file) — download it once, you cannot re-download it
5. In Firebase Console → Apple provider, paste:
   - Services ID
   - Apple Team ID (top-right in Apple Dev portal)
   - Key ID and the contents of the .p8 file

## 4. Required user data

Apple **only sends the user's name on the very first sign-in**. If your app needs it, capture and store it client-side immediately. On subsequent sign-ins the name field will be empty — there is no way to retrieve it from Apple again.

```ts
if (credential.fullName?.givenName) {
  await updateProfile(user, {
    displayName: `${credential.fullName.givenName} ${credential.fullName.familyName ?? ""}`.trim(),
  });
}
```

## 5. Email relay

Users can choose "Hide My Email", giving you a `@privaterelay.appleid.com` address that forwards to their real email. Treat it as a normal email — it works for transactional sends. Add `noreply@<your-project>.firebaseapp.com` to your verified senders in the Apple Developer portal so password-reset and verification emails are not dropped.
