# Cloud Functions — Trigger reference

## Firestore

```ts
import {
  onDocumentCreated, onDocumentUpdated,
  onDocumentDeleted, onDocumentWritten,
} from "firebase-functions/v2/firestore";

export const onUserCreate = onDocumentCreated("users/{uid}", async (event) => {
  const uid = event.params.uid;
  const data = event.data?.data();
});

export const onPostEdit = onDocumentUpdated("posts/{postId}", async (event) => {
  const before = event.data?.before.data();
  const after = event.data?.after.data();
});
```

`onDocumentWritten` fires on create, update, **and** delete. Use the specific variant when you can — clearer intent and slightly cheaper.

## Auth events

v2 splits the v1 `onCreate` / `onDelete` auth triggers into "blocking" and "non-blocking" forms.

**Non-blocking** (runs after the user record is committed):

```ts
import { onUserCreated } from "firebase-functions/v2/auth";
// Note: v2 auth triggers are gen 2 and use beforeUserCreated/beforeUserSignedIn for blocking.
```

**Blocking** (can reject sign-up / sign-in by throwing):

```ts
import { beforeUserCreated, beforeUserSignedIn } from "firebase-functions/v2/identity";

export const checkSignup = beforeUserCreated(async (event) => {
  const user = event.data;
  if (!user.email?.endsWith("@example.com")) {
    throw new Error("Only example.com emails allowed");
  }
});
```

Blocking functions require enabling **Identity Platform** on the project.

## Cloud Storage

```ts
import { onObjectFinalized } from "firebase-functions/v2/storage";

export const onUpload = onObjectFinalized(async (event) => {
  const filePath = event.data.name;
  const contentType = event.data.contentType;
});
```

`onObjectFinalized` fires when an upload completes (success). Other events: `onObjectDeleted`, `onObjectArchived`, `onObjectMetadataUpdated`.

## Pub/Sub

```ts
import { onMessagePublished } from "firebase-functions/v2/pubsub";

export const handleMessage = onMessagePublished("my-topic", async (event) => {
  const payload = event.data.message.json;
});
```

Useful for fan-out work: enqueue from any function via the Pub/Sub Admin SDK, process at the queue's pace, automatic retries on throw.

## Scheduled

```ts
import { onSchedule } from "firebase-functions/v2/scheduler";

export const nightly = onSchedule({
  schedule: "every day 03:00",
  timeZone: "America/Lima",
  retryCount: 3,
}, async () => {
  // ...
});
```

Schedules accept Cloud Scheduler cron syntax (`0 3 * * *`) or English (`every 5 minutes`, `every monday 09:00`).

## Retries

Background triggers (Firestore, Storage, Pub/Sub, Scheduler) **do not retry by default**. Enable per-function:

```ts
export const safe = onDocumentCreated({
  document: "orders/{id}",
  retry: true,
}, handler);
```

With retry on, design handlers to be **idempotent** — they may run more than once for the same event.

## Region

Always set `region` explicitly. The default (`us-central1`) is fine for many cases, but co-locating with your Firestore region cuts latency dramatically for trigger fan-out.

```ts
export const fn = onDocumentCreated({
  document: "posts/{id}",
  region: "southamerica-east1",
}, handler);
```
