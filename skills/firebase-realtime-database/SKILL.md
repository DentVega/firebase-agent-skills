---
name: firebase-realtime-database
description: >-
  Sets up and uses Firebase Realtime Database (RTDB) — provisioning, security
  rules in the JSON expression format, presence detection with onDisconnect,
  low-latency chat patterns, and shallow vs. deep queries. Use when the user
  needs presence (online/offline), real-time chat with minimal latency,
  collaborative cursor state, or any data that's tree-shaped and changes by
  the millisecond. For document-oriented or large-scale data, prefer Firestore.
compatibility: Different rules syntax from Firestore. Pair with `firebase-auth` for user-scoped paths.
---

# Firebase Realtime Database

## Minimum viable example

```ts
import database from "@react-native-firebase/database";

// Write
await database().ref(`messages/${roomId}`).push({
  text: "hi",
  uid: auth().currentUser?.uid,
  ts: database.ServerValue.TIMESTAMP,
});

// Listen
const ref = database().ref(`messages/${roomId}`).limitToLast(50);
const unsub = ref.on("value", (snap) => {
  const msgs = snap.val() ? Object.entries(snap.val()) : [];
  setMessages(msgs);
});
// cleanup: ref.off("value", unsub);
```

## RTDB vs. Firestore — pick one

| Use RTDB | Use Firestore |
|---|---|
| Presence (online users) | Almost everything else |
| Sub-100ms collaborative cursors | Document-oriented data |
| Append-only logs at high frequency | Complex queries with `where` + `orderBy` |
| Simple tree shapes | Cross-collection joins |
| Sub-1ms read latency required | Strong schema validation |

RTDB charges by **bytes downloaded** and **concurrent connections**. Firestore charges by **operations**. For chat with 100k messages, RTDB tends to be cheaper; for a CRUD app with mostly cold data, Firestore wins.

In a single app, use **both**: Firestore for the main data model, RTDB for presence and ephemeral live state.

## 1. Initialize

```bash
npx -y firebase-tools@latest init database
```

Generates `database.rules.json`. Pick a location at creation; cannot be changed.

```json
{
  "rules": {
    ".read": false,
    ".write": false
  }
}
```

Default-deny. Open up paths explicitly.

## 2. Security rules — different from Firestore

Rules are a JSON tree mirroring your data tree, with `.read`, `.write`, `.validate` expressions at each node:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read":  "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "messages": {
      "$roomId": {
        ".read":  "auth != null",
        ".indexOn": ["ts"],
        "$msgId": {
          ".write": "auth != null && (!data.exists() || data.child('uid').val() == auth.uid)",
          ".validate": "newData.hasChildren(['text', 'uid', 'ts'])
                        && newData.child('text').isString()
                        && newData.child('text').val().length < 500
                        && newData.child('uid').val() == auth.uid
                        && newData.child('ts').val() == now"
        }
      }
    },
    "presence": {
      "$uid": {
        ".read":  "auth != null",
        ".write": "auth != null && auth.uid == $uid"
      }
    }
  }
}
```

Key differences from Firestore:

- **No `request.auth.uid`** — it's `auth.uid`
- **`data` is existing**, `newData` is the proposed value
- **`.read` / `.write` cascade down** — granting at a parent path grants for everything under it (in Firestore, rules don't cascade)
- **`.indexOn`** required to use `orderByChild` on that key, similar to Firestore composite indexes but per-path

Deploy:

```bash
npx -y firebase-tools@latest deploy --only database
```

## 3. Presence detection (the killer feature)

RTDB's `onDisconnect` runs server-side when the client connection drops — even on crash or network failure. Firestore has no equivalent.

```ts
import database from "@react-native-firebase/database";
import auth from "@react-native-firebase/auth";

auth().onAuthStateChanged((user) => {
  if (!user) return;
  const presenceRef = database().ref(`presence/${user.uid}`);
  const connectedRef = database().ref(".info/connected");

  connectedRef.on("value", (snap) => {
    if (snap.val() === false) return;

    // Register: when this client disconnects (gracefully or not), clear presence
    presenceRef.onDisconnect().remove().then(() => {
      presenceRef.set({
        state: "online",
        lastChanged: database.ServerValue.TIMESTAMP,
      });
    });
  });
});
```

The `.info/connected` node tracks the actual connection state. The `onDisconnect().remove()` is registered server-side and fires when the connection drops. Result: `/presence/{uid}` reliably reflects who's online without polling.

For "last seen" in addition to online state:

```ts
presenceRef.onDisconnect().set({
  state: "offline",
  lastChanged: database.ServerValue.TIMESTAMP,
});
```

## 4. Querying

RTDB queries are limited compared to Firestore — you can sort by **one** field and filter by **one** range. No compound queries.

```ts
// Recent messages
database().ref(`messages/${roomId}`)
  .orderByChild("ts")
  .limitToLast(50)
  .on("value", handler);

// Messages since timestamp
database().ref(`messages/${roomId}`)
  .orderByChild("ts")
  .startAt(sinceTs)
  .on("value", handler);
```

For complex filtering, fan-out write to denormalized indexes:

```ts
// On message create, also write to /user-messages/{uid}/{msgId}
const updates = {};
updates[`messages/${roomId}/${msgId}`] = msg;
updates[`user-messages/${uid}/${msgId}`] = msg;
await database().ref().update(updates);
```

Atomic multi-path update — both or neither.

## 5. Cost — minimize bytes downloaded

RTDB downloads the **entire subtree** you reference. `ref('/messages').on('value', ...)` downloads every message in every room — terrible. Always scope to the smallest path:

- ✅ `ref('/messages/room-123').limitToLast(50)`
- ❌ `ref('/').on('value', ...)`

Use `.indexOn` so range queries don't scan client-side.

For data that should only fetch once, use `.once('value')` instead of `.on('value')` to avoid the persistent connection cost.

## 6. Client SDK setup

### Web

```ts
import { getDatabase, ref, push, onValue, serverTimestamp } from "firebase/database";

const db = getDatabase();
await push(ref(db, `messages/${roomId}`), { text, uid, ts: serverTimestamp() });
```

### Expo / React Native

```bash
npx expo install @react-native-firebase/database
```

```ts
import database from "@react-native-firebase/database";

await database().ref(`messages/${roomId}`).push({
  text, uid, ts: database.ServerValue.TIMESTAMP,
});
```

## 7. Emulator

```bash
npx -y firebase-tools@latest emulators:start --only database
```

Connect:

```ts
// Web
import { connectDatabaseEmulator } from "firebase/database";
if (process.env.NODE_ENV === "development") {
  connectDatabaseEmulator(db, "127.0.0.1", 9000);
}

// RN
database().useEmulator("127.0.0.1", 9000);
```

## 8. Common mistakes

- **Listening at the root.** `.on('value')` on `/` downloads the entire database. Always scope to the smallest path.
- **No `.indexOn` for `orderByChild`.** Works locally because the emulator does in-memory sort; in production, rules reject the query.
- **Forgetting to call `.off()` on unmount.** Listeners leak; bandwidth + connection bills grow.
- **Trying to do compound queries.** RTDB can sort by one field, filter by one range. Use denormalized fan-out indexes for everything else.
- **Storing growing arrays.** RTDB has no array type — what looks like an array is `{0: x, 1: y, ...}`. Use `push()` for auto-IDs instead of array indexes.
- **Forgetting `onDisconnect` doesn't fire on the client.** It's registered server-side and runs after the connection drops. Test it by killing the device's network, not by closing the app gracefully.
- **Mixing RTDB and Firestore listeners on the same data.** Pick one source of truth per piece of state.
