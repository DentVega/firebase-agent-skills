---
name: firebase-cloud-functions
description: >-
  Scaffolds, runs locally, and deploys Firebase Cloud Functions (2nd gen) —
  HTTPS endpoints, callable functions, Firestore/Auth/Storage triggers, and
  scheduled jobs. Use whenever the user needs server-side logic that runs in
  response to an HTTP request, a database change, or a cron schedule.
compatibility: Requires Node.js 20+ and the Firebase CLI via `npx -y firebase-tools@latest`. Defaults to TypeScript.
---

# Firebase Cloud Functions (2nd gen)

## Minimum viable example

```ts
// functions/src/index.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const hello = onCall((request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "");
  return { greeting: `hi ${request.auth.uid}` };
});
```

```bash
npx -y firebase-tools@latest deploy --only functions:hello
```

A signed-in client calls it via `httpsCallable("hello")`. That's the entire round-trip.


Always use the **v2 SDK** (`firebase-functions/v2`) for new functions. v1 is legacy and lacks Cloud Run features like concurrency, min instances, and arbitrary regions.

## 1. Initialize

In a Firebase project root that already has `firebase.json`:

```bash
npx -y firebase-tools@latest init functions
```

Choose **TypeScript** and **install dependencies**. This creates `functions/` with:

```text
functions/
  src/index.ts
  package.json
  tsconfig.json
```

## 2. Function types

### HTTPS endpoint

For public REST endpoints. Auth must be checked manually.

```ts
import { onRequest } from "firebase-functions/v2/https";

export const hello = onRequest({ cors: true, region: "us-central1" }, (req, res) => {
  res.json({ ok: true });
});
```

### Callable function

For client SDKs (`httpsCallable`). Auth is verified automatically; user is at `request.auth`.

```ts
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const createPost = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in required");
  const { title, body } = request.data as { title: string; body: string };
  if (!title) throw new HttpsError("invalid-argument", "title required");

  // ... do the work
  return { id: "new-id" };
});
```

Client side:

```ts
import { getFunctions, httpsCallable } from "firebase/functions";
const fn = httpsCallable(getFunctions(), "createPost");
const { data } = await fn({ title: "hi", body: "..." });
```

### Firestore trigger

Run on writes to a path. v2 trigger paths use `{wildcards}`.

```ts
import { onDocumentCreated } from "firebase-functions/v2/firestore";

export const onPostCreate = onDocumentCreated("posts/{postId}", async (event) => {
  const data = event.data?.data();
  // event.params.postId
});
```

### Scheduled function

Cron-driven. Times are interpreted in the function's timezone (UTC by default).

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";

export const dailyCleanup = onSchedule("every day 02:00", async () => {
  // ...
});
```

## 3. Local development with the emulator

The emulator suite runs Functions + Firestore + Auth locally so you don't burn quota:

```bash
npx -y firebase-tools@latest emulators:start
```

The Functions emulator hot-reloads when `functions/lib/` changes. Run TypeScript in watch mode in a second terminal:

```bash
cd functions && npm run build:watch
```

Connect callable functions from a web client:

```ts
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
const fns = getFunctions();
if (process.env.NODE_ENV === "development") {
  connectFunctionsEmulator(fns, "127.0.0.1", 5001);
}
```

## 4. Deploy

```bash
npx -y firebase-tools@latest deploy --only functions
```

Deploy a single function (faster iteration):

```bash
npx -y firebase-tools@latest deploy --only functions:createPost
```

First deploy on a project enables required Google Cloud APIs (Cloud Build, Artifact Registry, Cloud Run). It may take a few minutes and prompt for billing.

## 5. Configuration & secrets

**Do not** use `functions.config()` — it's the v1 pattern and is deprecated for v2.

For non-secret config, use environment variables in `functions/.env`:

```dotenv
STRIPE_API_VERSION=2024-04-10
```

Available in code as `process.env.STRIPE_API_VERSION`.

For secrets (API keys, signing keys), use Secret Manager:

```bash
npx -y firebase-tools@latest functions:secrets:set STRIPE_SECRET_KEY
```

Reference in code via the function options:

```ts
import { defineSecret } from "firebase-functions/params";

const stripeKey = defineSecret("STRIPE_SECRET_KEY");

export const charge = onCall({ secrets: [stripeKey] }, async (request) => {
  const stripe = new Stripe(stripeKey.value());
  // ...
});
```

The secret is only mounted into functions that declare it — explicit, auditable, no global env leak.

## 6. Cost & cold-start tuning

- **Set `minInstances: 1`** for any user-facing callable that needs to respond in <1s. Cold starts on Node 20 are typically 500-2000ms; min instances eliminate them at the cost of always-on billing (~$8/mo per instance).
- **Set `concurrency`** (default 80) higher if the function is I/O-bound and lower if CPU-bound. Each instance serves up to `concurrency` requests at once.
- **Set `memory`** to the smallest size that doesn't OOM. Bigger memory = bigger CPU allocation but proportional billing.
- **Set `region`** to be co-located with your Firestore database and your users.

```ts
export const heavy = onRequest({
  region: "us-central1",
  memory: "1GiB",
  concurrency: 20,
  minInstances: 1,
  timeoutSeconds: 60,
}, handler);
```

See [references/admin-sdk.md](references/admin-sdk.md) for using the Admin SDK inside functions (bypasses security rules) and [references/triggers.md](references/triggers.md) for Auth/Storage/Pub-Sub triggers.

## 7. Common mistakes

- **Not awaiting promises in triggers.** Background triggers exit immediately when the handler returns; un-awaited work gets killed and you'll see partial updates.
- **Calling `admin.initializeApp()` inside a handler.** Initialize once at module top level — re-init in every invocation is slow and leaks resources.
- **Using `onCall` without checking `request.auth`.** Anyone with the project's web API key can invoke it. Always assert auth.
- **Long-running work in HTTPS functions.** Functions max out at 60 minutes (HTTP: 60 min, callable: 60 min — but mobile clients time out far sooner). For long jobs, enqueue a Cloud Task or use a Pub/Sub-triggered function.
