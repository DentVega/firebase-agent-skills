---
name: firebase-emulators
description: >-
  Configures and runs the Firebase Local Emulator Suite for development —
  Firestore, Auth, Functions, Storage, RTDB, Pub/Sub, Eventarc — including
  client connection from web and Expo/React Native, seeding data via
  import/export, running rules unit tests, and using emulators in CI. Use
  whenever the user wants to develop or test Firebase code without hitting
  production, burning quota, or risking real data.
compatibility: Requires Java 17+ (for Firestore/RTDB/Pub-Sub emulators) and the Firebase CLI via `npx -y firebase-tools@latest`.
---

# Firebase Local Emulator Suite

The emulator suite runs Firebase services on `localhost` so you can develop and test without touching production. Every product you ship should have its local equivalent running here — it pays back the setup time within a week.

## Minimum viable example

```bash
npx -y firebase-tools@latest init emulators
npx -y firebase-tools@latest emulators:start --import=./seed-data --export-on-exit
```

```ts
import firestore from "@react-native-firebase/firestore";

if (__DEV__) firestore().useEmulator("127.0.0.1", 8080);
```

`emulators:start` with `--export-on-exit` means your seed data persists between runs. `--import` loads it on startup so every dev day starts from the same fixtures.

## 1. Initialize

In a Firebase project root:

```bash
npx -y firebase-tools@latest init emulators
```

Pick the emulators you need (at minimum: Auth, Firestore, Functions). Accept the default ports unless something on your machine conflicts. The wizard adds an `emulators` block to `firebase.json`:

```json
{
  "emulators": {
    "auth":      { "port": 9099 },
    "firestore": { "port": 8080 },
    "functions": { "port": 5001 },
    "storage":   { "port": 9199 },
    "ui":        { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

`singleProjectMode: true` prevents the common mistake of accidentally running multiple project IDs against the same emulator instance.

## 2. Start

```bash
npx -y firebase-tools@latest emulators:start
```

Open the UI at `http://127.0.0.1:4000` — you get a dashboard with tabs for each running emulator, real-time logs, and direct manipulation of data (Firestore docs, Auth users, etc.).

For just one product:

```bash
npx -y firebase-tools@latest emulators:start --only firestore,auth
```

## 3. Connect the client

The emulator hosts are `127.0.0.1` from the same machine. From a physical mobile device on the same Wi-Fi, use the host machine's LAN IP.

### Web SDK

```ts
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";

if (process.env.NODE_ENV === "development") {
  connectAuthEmulator(getAuth(),       "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(getFirestore(), "127.0.0.1", 8080);
  connectFunctionsEmulator(getFunctions(), "127.0.0.1", 5001);
  connectStorageEmulator(getStorage(),  "127.0.0.1", 9199);
}
```

**CRITICAL**: call all `connect*Emulator` calls **before** any read/write or auth call. Once a service has talked to production, the emulator connection is silently ignored.

### Expo / React Native

```ts
import auth from "@react-native-firebase/auth";
import firestore from "@react-native-firebase/firestore";
import functions from "@react-native-firebase/functions";
import storage from "@react-native-firebase/storage";
import { Platform } from "react-native";

if (__DEV__) {
  // From simulator: 127.0.0.1 (Android) or localhost (iOS sim)
  // From physical device: your machine's LAN IP, e.g. 192.168.1.42
  const host = "127.0.0.1";
  auth().useEmulator(`http://${host}:9099`);
  firestore().useEmulator(host, 8080);
  functions().useEmulator(host, 5001);
  storage().useEmulator(host, 9199);
}
```

On Android emulators, `127.0.0.1` refers to the emulated device itself, not the host. Use `10.0.2.2` instead.

## 4. Seeding data — import / export

Hand-creating users and documents every time you start the emulator is painful. Export once, import every run:

```bash
# Run emulators with import + auto-export on shutdown
npx -y firebase-tools@latest emulators:start \
  --import=./seed-data --export-on-exit
```

After you make changes you want to keep (creating test users, seeding Firestore), stop the emulator with Ctrl+C — it writes the state to `./seed-data`. Commit that folder to the repo so your team starts with the same fixtures.

For manual control:

```bash
# Export now (while emulator is running, from another terminal)
npx -y firebase-tools@latest emulators:export ./seed-data
```

## 5. Running scripts against the emulator

`emulators:exec` runs any command after starting the emulators and cleans up when the command exits:

```bash
npx -y firebase-tools@latest emulators:exec --only firestore,auth "npm test"
```

This is the canonical pattern for **integration tests in CI** — see [references/ci-and-rules-tests.md](references/ci-and-rules-tests.md).

## 6. Auth shortcuts

The Auth emulator UI lets you create users, sign in as anyone with one click, and view ID token contents. Two pro features:

- **Email verification / password reset links** print to the emulator UI log instead of sending real email. Click the link directly from the log.
- **OAuth flows** (Google, Apple, etc.) use a fake account picker. No real OAuth client needed.

## 7. Functions hot reload

In a second terminal:

```bash
cd functions && npm run build:watch
```

The Functions emulator watches `functions/lib/` and reloads automatically when TypeScript output changes. Errors print to the same terminal as the emulator output.

## 8. Connecting Admin SDK

When running outside an emulator-managed function (e.g. a seed script), set env vars:

```bash
export FIRESTORE_EMULATOR_HOST=127.0.0.1:8080
export FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099
export FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199
node scripts/seed.mjs
```

The Admin SDK auto-detects these env vars and routes calls to the emulators with admin privileges (bypassing security rules — exactly what you want for seeding).

## 9. Common mistakes

- **Calling `connectFirestoreEmulator` after the first Firestore call.** Silently no-ops. Always wire emulators before any other Firebase code runs.
- **Forgetting Java**. Firestore / RTDB / Pub-Sub emulators are JVM-based. Install Java 17 (`brew install openjdk@17` on macOS) before first run.
- **`127.0.0.1` on Android emulator.** Loopback there means the emulated device, not your host machine. Use `10.0.2.2` on Android emulators; LAN IP on physical devices.
- **Committing seed data with real production exports.** Treat exports as fixtures — manually crafted, no PII. Never copy a production dump into `./seed-data`.
- **Running tests against production by accident.** Use `--only` and `emulators:exec` so a failed-to-start emulator makes the test fail loudly, not silently fall through to prod credentials.
- **Mixing emulator and production traffic in one process.** A single client can only point a given product at one place. If you need to read from prod and write to emulator (rare), use two separate `initializeApp` instances with different names.
