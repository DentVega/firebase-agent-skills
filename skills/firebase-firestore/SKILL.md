---
name: firebase-firestore
description: >-
  Provisions and uses Cloud Firestore — creating databases, designing
  collections and documents, writing security rules, defining composite
  indexes, and writing client SDK reads/writes. Use whenever the user needs
  persistent structured storage that syncs in real time across clients.
compatibility: Requires the Firebase CLI, available via `npx -y firebase-tools@latest`. Pair with `firebase-auth` when documents are user-scoped.
---

# Cloud Firestore

## 1. Identify or create the database

List existing databases:

```bash
npx -y firebase-tools@latest firestore:databases:list
```

If none exists, create one. **Default to Enterprise (native mode)** unless the user has a specific reason to use Standard edition:

```bash
npx -y firebase-tools@latest firestore:locations
npx -y firebase-tools@latest firestore:databases:create "(default)" \
  --edition="enterprise" --location="<region>"
```

Pick the same region as the rest of the user's Firebase resources (Functions, Storage) to avoid cross-region latency and egress charges.

## 2. Data modeling

Firestore is **document-oriented** with collections of documents. Documents can hold subcollections. The right shape depends on access patterns, not on what feels normalized.

### Rules of thumb

- **Read what you display.** If you list 50 todos, store enough on each todo to render the list without N+1 fetches. Denormalize liberally.
- **Subcollections for ownership.** `users/{uid}/posts/{postId}` is better than a top-level `posts` filtered by `ownerId` if posts are only ever shown in that user's context — rules become trivial.
- **Top-level collections for cross-cutting queries.** If you ever need "all posts site-wide, newest first", use a top-level collection.
- **Avoid documents that grow unboundedly.** A document max is 1 MiB. A chat with 100k messages must be a subcollection, not an array.
- **Use auto-generated IDs** unless you have a strong external key (e.g. an order number).

See [references/data-modeling.md](references/data-modeling.md) for full patterns.

## 3. Security rules

Default to **deny everything**, then open up the minimum needed. Edit `firestore.rules`:

```firestore-rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, update, delete: if request.auth != null && request.auth.uid == userId;
      allow create: if request.auth != null && request.auth.uid == userId;

      match /posts/{postId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }

    match /publicPosts/{postId} {
      allow read: if true;
      allow create: if request.auth != null
                    && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if request.auth != null
                            && resource.data.authorId == request.auth.uid;
    }
  }
}
```

Deploy:

```bash
npx -y firebase-tools@latest deploy --only firestore:rules
```

**CRITICAL**: never write a rule like `allow read, write: if request.auth != null;` and ship it. It lets any signed-in user read or overwrite any document. Anchor every rule to ownership or membership.

See [references/security-rules.md](references/security-rules.md) for advanced patterns: role-based access via custom claims, member-of-group checks, write validation, rate limiting.

## 4. Indexes

Single-field indexes are automatic. **Composite indexes** (more than one `where` + `orderBy`) must be declared in `firestore.indexes.json`:

```json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

Deploy:

```bash
npx -y firebase-tools@latest deploy --only firestore:indexes
```

The first time a query needs a missing composite index, Firestore throws an error with a console link that creates it for you. In dev, click the link; in CI / prod, commit the entry to `firestore.indexes.json`.

## 5. Client SDK usage

- **Web** → [references/web-sdk.md](references/web-sdk.md)
- **Expo / React Native** → [references/react-native.md](references/react-native.md) (use `@react-native-firebase/firestore` for native; the web SDK also works for managed Expo apps with reduced features)

### Always-true patterns

- **Use `onSnapshot` for any UI that should react to changes.** Polling with `getDocs` is almost always wrong.
- **Cleanup snapshot listeners** in `useEffect` cleanup, otherwise they leak and the SDK keeps the document hydrated forever.
- **Batch writes ≤ 500 ops.** For more, chunk and run them sequentially or in parallel batches.
- **Never put secrets in documents.** Rules can be probed; if a field shouldn't be readable, don't store it client-side at all.

## 6. Common mistakes

- **`allow read, write: if request.auth != null;`** — leaks every doc to every signed-in user. Always anchor rules to ownership (`request.auth.uid == resource.data.ownerId`) or membership.
- **Polling with `getDocs` for UI that should react to changes.** Use `onSnapshot` and return its unsubscribe from `useEffect`. Otherwise listeners leak.
- **Trusting client timestamps.** Use `serverTimestamp()` on write and `request.time` in rules — never `Date.now()`.
- **Unbounded documents.** 1 MiB hard cap. A chat with 100k messages must be a subcollection, not an `array`.
- **Querying object properties inside arrays.** Firestore can only `array-contains` whole values. Restructure to a subcollection if you need to filter by inner fields.
- **Forgetting composite indexes in production.** Dev gets a console link to create them; CI hits the missing-index error. Commit `firestore.indexes.json`.
- **Calling `setDoc(ref, data, { merge: true })` and expecting `create` rules to fire.** Merged writes evaluate `update` rules — write both.

## 7. Local emulator

For development, run the emulator suite so you don't burn quota and can iterate on rules safely:

```bash
npx -y firebase-tools@latest init emulators
npx -y firebase-tools@latest emulators:start --only firestore
```

Connect from the client:

```ts
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
const db = getFirestore();
if (process.env.NODE_ENV === "development") {
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}
```
