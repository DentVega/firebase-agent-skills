# Firebase Auth — Web SDK

## Install

```bash
npm install firebase
```

## Initialize once

Create `src/lib/firebase.ts`:

```ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

export const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const auth = getAuth(app);
```

The `getApps().length` guard prevents the "Firebase App named '[DEFAULT]' already exists" error in Next.js hot reload.

## Sign in with email/password

```ts
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";

await createUserWithEmailAndPassword(auth, email, password);
await signInWithEmailAndPassword(auth, email, password);
```

## Sign in with Google (popup)

```ts
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const provider = new GoogleAuthProvider();
const result = await signInWithPopup(auth, provider);
const user = result.user;
```

For mobile-web, use `signInWithRedirect` instead — popups are often blocked.

## Sign in with Apple (web)

```ts
import { OAuthProvider, signInWithPopup } from "firebase/auth";

const provider = new OAuthProvider("apple.com");
provider.addScope("email");
provider.addScope("name");
await signInWithPopup(auth, provider);
```

## Auth state — the only correct pattern

```ts
import { onAuthStateChanged, type User } from "firebase/auth";

useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user: User | null) => {
    setUser(user);
  });
  return unsub;
}, []);
```

Do not read `auth.currentUser` to decide whether to redirect — it can be `null` for one render after a reload while the SDK rehydrates. Use `auth.authStateReady()` to await initial restore.

## Sign out

```ts
import { signOut } from "firebase/auth";
await signOut(auth);
```

## Get an ID token to call your backend

```ts
const token = await auth.currentUser?.getIdToken();
fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } });
```

On the server, verify with the Admin SDK:

```ts
import { getAuth } from "firebase-admin/auth";
const decoded = await getAuth().verifyIdToken(token);
const uid = decoded.uid;
```
