# Firebase Auth — Expo / React Native

This file assumes `@react-native-firebase/app` and `@react-native-firebase/auth` are installed and configured via Expo config plugins. See the `firebase-expo` skill first.

## Email / password

```ts
import auth from "@react-native-firebase/auth";

await auth().createUserWithEmailAndPassword(email, password);
await auth().signInWithEmailAndPassword(email, password);
```

## Google Sign-In

Install the native module:

```bash
npx expo install @react-native-google-signin/google-signin
```

Add the config plugin to `app.json`:

```json
{
  "plugins": [
    ["@react-native-google-signin/google-signin", { "iosUrlScheme": "com.googleusercontent.apps.XXXXXXXX" }]
  ]
}
```

Sign in:

```ts
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import auth from "@react-native-firebase/auth";

GoogleSignin.configure({ webClientId: "XXXX.apps.googleusercontent.com" });

const { data } = await GoogleSignin.signIn();
const credential = auth.GoogleAuthProvider.credential(data!.idToken);
await auth().signInWithCredential(credential);
```

The `webClientId` is the **Web** OAuth client ID auto-created by `firebase deploy --only auth`, found in the Google Cloud Console under "APIs & Services → Credentials". Not the iOS one.

## Apple Sign-In (iOS only)

```bash
npx expo install expo-apple-authentication
```

```ts
import * as AppleAuthentication from "expo-apple-authentication";
import auth from "@react-native-firebase/auth";

const credential = await AppleAuthentication.signInAsync({
  requestedScopes: [
    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
    AppleAuthentication.AppleAuthenticationScope.EMAIL,
  ],
});

const appleCredential = auth.AppleAuthProvider.credential(credential.identityToken!);
await auth().signInWithCredential(appleCredential);
```

Required in `app.json`:

```json
{
  "ios": { "usesAppleSignIn": true }
}
```

For Android Apple Sign-In, use a WebView OAuth flow against the Service ID — significantly more work; consider whether you actually need it.

## Auth state

```ts
import auth from "@react-native-firebase/auth";

useEffect(() => {
  return auth().onAuthStateChanged((user) => setUser(user));
}, []);
```

## Persistence

`@react-native-firebase/auth` persists the session in native storage automatically — no `setPersistence` call needed (unlike the web SDK).
