# Firestore — Data modeling patterns

## Pick collection shape by access pattern

| Access pattern | Recommended shape |
|---|---|
| Always shown in context of one user | Subcollection: `users/{uid}/posts/{postId}` |
| Queried across all users | Top-level: `posts/{postId}` with `authorId` field |
| Many-to-many (users ↔ groups) | Two collections + a join collection or a `members` map on the group |
| Activity feed / timeline | Top-level `feed/{userId}/items/{itemId}` materialized by a Cloud Function on writes |
| Ephemeral session state | Realtime Database, not Firestore |

## Denormalization

Firestore charges per document read, not per byte. If displaying a list of posts with author names, **store the author name on the post** at write time rather than fetching every author document on read.

```ts
await addDoc(collection(db, "posts"), {
  authorId: user.uid,
  authorName: user.displayName, // denormalized
  authorPhotoURL: user.photoURL, // denormalized
  title,
  body,
  createdAt: serverTimestamp(),
});
```

When the author updates their profile, a Cloud Function can fan-out the change to recent posts. Older posts are usually fine to leave stale.

## Counters at scale

Don't `increment` a single document for high-throughput counters — Firestore caps each document at ~1 write/second sustained. Use a **distributed counter** (a subcollection of `shards`, sum them on read) or precompute via scheduled aggregations.

For low-throughput counters, `increment` is fine:

```ts
import { increment } from "firebase/firestore";
await updateDoc(doc(db, "stats", "global"), { userCount: increment(1) });
```

## Pagination

Use cursor pagination, not offset:

```ts
const first = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(20));
const snap = await getDocs(first);
const last = snap.docs[snap.docs.length - 1];

const next = query(
  collection(db, "posts"),
  orderBy("createdAt", "desc"),
  startAfter(last),
  limit(20),
);
```

Offset pagination is supported but charges for every skipped document.

## Soft deletes

Hard delete is fine for most data. For audit / undo, mark a `deletedAt` timestamp and filter on read:

```ts
where("deletedAt", "==", null)
```

This requires composite indexes on every existing query plus `deletedAt` — verify the index cost before adopting.

## Arrays vs subcollections

Use an **array field** when the list is bounded (a few dozen items) and always loaded with the parent doc.

Use a **subcollection** when the list grows unboundedly, needs to be queried independently, or has its own security rules.

Never use an array of objects you'll need to query — Firestore can only filter on array membership (`array-contains`), not on properties of objects inside arrays.
