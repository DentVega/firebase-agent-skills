# Firestore — Expo / React Native

Prefer `@react-native-firebase/firestore` over the web SDK on bare or prebuilt Expo apps — it ships with native offline persistence, lower memory usage, and better cold-start.

## Install

```bash
npx expo install @react-native-firebase/app @react-native-firebase/firestore
```

Add config plugins in `app.json` (see the `firebase-expo` skill for the full plugin list).

## CRUD

```ts
import firestore from "@react-native-firebase/firestore";

// Create
await firestore().collection("posts").add({
  authorId: uid,
  title,
  createdAt: firestore.FieldValue.serverTimestamp(),
});

// Read
const snap = await firestore().collection("posts").doc(postId).get();
if (snap.exists) {
  const data = snap.data();
}

// Query
const snap = await firestore()
  .collection("posts")
  .where("authorId", "==", uid)
  .orderBy("createdAt", "desc")
  .limit(20)
  .get();

// Update
await firestore().collection("posts").doc(postId).update({ title: "new" });

// Delete
await firestore().collection("posts").doc(postId).delete();
```

## Real-time

```ts
useEffect(() => {
  return firestore()
    .collection("posts")
    .where("authorId", "==", uid)
    .onSnapshot((snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
}, [uid]);
```

## Offline persistence

`@react-native-firebase/firestore` enables persistence by default. To disable (rarely correct):

```ts
await firestore().settings({ persistence: false });
```

For long-running sessions, periodically clear the cache to prevent unbounded disk growth:

```ts
await firestore().clearPersistence();
```

Only call when the app is not actively listening — usually on sign-out.

## Emulator

```ts
if (__DEV__) {
  firestore().useEmulator("127.0.0.1", 8080);
}
```

On a physical device, replace `127.0.0.1` with the LAN IP of the machine running the emulator.
