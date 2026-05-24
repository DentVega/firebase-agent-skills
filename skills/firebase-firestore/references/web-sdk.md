# Firestore — Web SDK

## Initialize

```ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

export const app = getApps().length ? getApps()[0] : initializeApp(config);
export const db = getFirestore(app);
```

## CRUD

```ts
import {
  collection, doc, addDoc, setDoc, getDoc, getDocs,
  updateDoc, deleteDoc, query, where, orderBy, limit, serverTimestamp,
} from "firebase/firestore";

// Create with auto ID
const ref = await addDoc(collection(db, "posts"), {
  authorId: user.uid,
  title,
  body,
  createdAt: serverTimestamp(),
});

// Create / overwrite with known ID
await setDoc(doc(db, "users", user.uid), { displayName, email }, { merge: true });

// Read one
const snap = await getDoc(doc(db, "posts", postId));
if (snap.exists()) {
  const data = snap.data();
}

// Query
const q = query(
  collection(db, "posts"),
  where("authorId", "==", user.uid),
  orderBy("createdAt", "desc"),
  limit(20),
);
const results = await getDocs(q);
results.forEach((d) => console.log(d.id, d.data()));

// Update
await updateDoc(doc(db, "posts", postId), { title: "new" });

// Delete
await deleteDoc(doc(db, "posts", postId));
```

## Real-time subscriptions

```ts
import { onSnapshot } from "firebase/firestore";

useEffect(() => {
  const q = query(collection(db, "posts"), where("authorId", "==", uid));
  return onSnapshot(q, (snap) => {
    setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}, [uid]);
```

The return value of `onSnapshot` is the unsubscribe function — returning it from `useEffect` is the correct cleanup.

## Transactions and batches

Use a **batch** for independent writes you want to commit atomically:

```ts
import { writeBatch } from "firebase/firestore";

const batch = writeBatch(db);
batch.set(doc(db, "users", uid), { name });
batch.update(doc(db, "stats", "global"), { userCount: increment(1) });
await batch.commit();
```

Use a **transaction** when later writes depend on values you just read:

```ts
import { runTransaction } from "firebase/firestore";

await runTransaction(db, async (tx) => {
  const snap = await tx.get(doc(db, "counters", "x"));
  const next = (snap.data()?.value ?? 0) + 1;
  tx.update(doc(db, "counters", "x"), { value: next });
});
```

Transactions auto-retry on contention — keep them small.

## Typed converters

For type safety, attach a `withConverter`:

```ts
import { type FirestoreDataConverter } from "firebase/firestore";

type Post = { authorId: string; title: string; body: string };

const postConverter: FirestoreDataConverter<Post> = {
  toFirestore: (post) => post,
  fromFirestore: (snap) => snap.data() as Post,
};

const postsRef = collection(db, "posts").withConverter(postConverter);
const snap = await getDocs(postsRef);
snap.docs.forEach((d) => {
  const post: Post = d.data(); // typed
});
```
