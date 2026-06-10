# Firebase Auth — Expo / React Native

This file assumes `@react-native-firebase/app` and `@react-native-firebase/auth` are installed and configured via Expo config plugins. See the `firebase-expo` skill first.

## Auth state lifecycle

The order things happen — understanding this prevents the "user sees sign-in flash on every reload" bug:

```mermaid
sequenceDiagram
    participant App as App boot
    participant SDK as RNFirebase Auth
    participant Native as Native keychain
    participant UI as RootLayout

    App->>SDK: import auth from "@react-native-firebase/auth"
    SDK->>Native: read persisted session
    App->>UI: mount with currentUser=null
    UI->>UI: render loading spinner (initializing=true)
    SDK->>Native: ✓ session restored
    SDK-->>UI: onAuthStateChanged(user)
    UI->>UI: setUser(user); setInitializing(false)
    UI->>UI: route to (app) or (auth)/sign-in
```

The bug to avoid: routing on `auth().currentUser` directly without waiting for the first `onAuthStateChanged` fires. `currentUser` is null for one render after a cold start because the keychain read is async.

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
