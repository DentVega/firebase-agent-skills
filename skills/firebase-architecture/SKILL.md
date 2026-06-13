---
name: firebase-architecture
description: >-
  Applies SOLID principles to Firebase + React Native / web apps —
  separating data access from UI, designing testable service layers,
  decoupling hooks from the Firebase SDK, and choosing the right level of
  abstraction. Use whenever the user asks how to structure a Firebase app,
  how to make Firestore calls testable, how to scale beyond a single screen
  of glue code, or when reviewing existing Firebase code for coupling.
compatibility: Pairs with every product skill (`firebase-firestore`, `firebase-cloud-functions`, etc.) — those teach the API, this teaches how to organize calls to it.
---

# SOLID for Firebase Apps

The default Firebase tutorial puts every read, write, and rule check directly in a screen component. That works until your second screen needs the same query, or until you want to test a payment flow without spending real money. This skill is what to do then — applied specifically to Firebase + React Native (the web SDK story is similar).

## Minimum viable example

```ts // @verify
// lib/services/todos.ts — owns Firestore for one collection. SRP.
import firestore from "@react-native-firebase/firestore";

export const TodosService = {
  list(uid: string) {
    return firestore().collection("users").doc(uid).collection("todos");
  },
  add(uid: string, title: string) {
    return TodosService.list(uid).add({
      title, done: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
  },
  toggle(uid: string, id: string, done: boolean) {
    return TodosService.list(uid).doc(id).update({ done });
  },
};
```

```ts
// lib/hooks/useTodos.ts — the only thing components import. DIP.
import { useEffect, useState } from "react";
import { TodosService } from "../services/todos";

export function useTodos(uid: string) {
  const [todos, setTodos] = useState<unknown[]>([]);
  useEffect(() => {
    const unsub = TodosService.list(uid)
      .orderBy("createdAt", "desc")
      .onSnapshot((snap: any) =>
        setTodos(snap.docs.map((d: any) => ({ id: d.id, ...d.data() })))
      );
    return unsub;
  }, [uid]);
  return todos;
}
```

The component uses `const todos = useTodos(uid)` — that's all it needs to know. Firebase is one import away from being swapped.

## When SOLID earns its keep in a Firebase app

Honest evaluation before the patterns:

| Scale | Reach for SOLID? |
|---|---|
| One screen, one collection, no tests | No — direct SDK calls in the component are fine |
| 3+ screens reading the same data | **Yes** — extract a hook (SRP) |
| You want to test a payment / mutation flow | **Yes** — wrap the SDK so tests inject a fake |
| You're migrating from Firebase to Supabase / vice versa | **Yes** — the wrapper is the entire savings |
| You're building a simple internal tool with one user | No — abstraction debt outpaces benefit |

The patterns below are progressive — apply them in order as the app grows. Don't start with a Repository pattern on day 1.

## 1. SRP — Single Responsibility

**Bad** — one component owns auth, Firestore, UI, navigation, validation:

```tsx
function TodosScreen() {
  const uid = auth().currentUser!.uid;
  const [todos, setTodos] = useState([]);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    return firestore().collection("users").doc(uid).collection("todos")
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => setTodos(snap.docs.map(d => ({ id: d.id, ...d.data() }))));
  }, [uid]);

  async function add() {
    if (!draft.trim()) return;
    await firestore().collection("users").doc(uid).collection("todos").add({
      title: draft.trim(),
      done: false,
      createdAt: firestore.FieldValue.serverTimestamp(),
    });
    setDraft("");
  }

  return <View>{/* ... */}</View>;
}
```

**Good** — three files, each with one job:

```tsx
// app/(app)/todos.tsx — presentation only
function TodosScreen() {
  const uid = useUid();              // auth concern
  const todos = useTodos(uid);       // data concern
  const { add, toggle } = useTodoActions(uid);
  return <TodosList todos={todos} onAdd={add} onToggle={toggle} />;
}
```

Why it matters in Firebase apps: the SDK is **stateful** (snapshot listeners, auth state, persistence). Mixing state-having code with stateless UI logic makes the component hard to reason about and impossible to memoize.

## 2. OCP — Open/Closed

You should be able to add behavior to your Firestore writes (validation, audit logs, optimistic updates) **without modifying** every call site.

**Bad** — every screen that creates a post duplicates the same fields:

```ts
await firestore().collection("posts").add({
  ...data,
  createdAt: firestore.FieldValue.serverTimestamp(),
  authorId: auth().currentUser!.uid,
  schemaVersion: 2,
});
```

**Good** — a factory the service owns, screens are closed to schema changes:

```ts
const PostsService = {
  async create(data: { title: string; body: string }) {
    return firestore().collection("posts").add({
      ...data,
      createdAt: firestore.FieldValue.serverTimestamp(),
      authorId: auth().currentUser!.uid,
      schemaVersion: 2,
    });
  },
};
```

When `schemaVersion` becomes 3, you change one file. The same pattern works for Cloud Functions middleware (auth check + app check + validation as composable wrappers).

## 3. LSP — Liskov Substitution

Firestore's strength here is **typed converters** — they let you treat a `DocumentSnapshot<Post>` interchangeably with any other typed snapshot.

```ts
import { type FirestoreDataConverter } from "firebase/firestore";

type Post = { authorId: string; title: string; body: string; createdAt: number };

export const postConverter: FirestoreDataConverter<Post> = {
  toFirestore: (post) => post,
  fromFirestore: (snap) => snap.data() as Post,
};

const postsRef = collection(db, "posts").withConverter(postConverter);
// snap.data() is now typed as Post throughout the app
```

Substitutability matters for swapping storage implementations later. If a `Post` always has the same shape coming out of `fromFirestore` regardless of where you query it from, downstream code never has to type-check.

## 4. ISP — Interface Segregation

Don't make hooks depend on more of the Firebase SDK than they need.

**Bad**:

```ts
import { auth, firestore, storage, messaging } from "../lib/firebase";
// Hook only needs the current uid but transitively pulls in everything
```

**Good**:

```ts
// lib/auth.ts — only exposes what most code needs
export function useUid(): string | null {
  const [uid, setUid] = useState<string | null>(null);
  useEffect(() => auth().onAuthStateChanged((u) => setUid(u?.uid ?? null)), []);
  return uid;
}
```

Now hooks import `useUid` from `lib/auth`, not `auth` itself. The web bundle is smaller (better tree-shaking) and the dependency surface is narrower.

Same for Cloud Functions — split a giant `index.ts` into per-feature files re-exported from `index.ts`. Firebase deploys only redeploy changed functions when bundles are distinct.

## 5. DIP — Dependency Inversion

The big one. Hooks and components should depend on **abstractions**, not on Firebase directly. This is what makes tests possible without an emulator AND what lets you migrate backends.

**Two levels** depending on scale:

### Level 1 (small app) — a service module as the seam

```ts
// lib/services/todos.ts — the only file that imports firestore
import firestore from "@react-native-firebase/firestore";

export const TodosService = {
  list: (uid: string) => firestore().collection("users").doc(uid).collection("todos"),
  add:    (uid: string, title: string) => /* ... */,
  toggle: (uid: string, id: string, done: boolean) => /* ... */,
};
```

Hooks and components import `TodosService`, never `firestore` directly. For tests, mock the module. For backend migration, rewrite this one file.

### Level 2 (real testability needed) — a Repository interface

```ts
// lib/repositories/todos.ts
export interface TodosRepository {
  watchByUser(uid: string, cb: (todos: Todo[]) => void): () => void;
  add(uid: string, title: string): Promise<string>;
  toggle(uid: string, id: string, done: boolean): Promise<void>;
}

// lib/repositories/firestoreTodos.ts
export const firestoreTodos: TodosRepository = { /* ... */ };

// lib/repositories/inMemoryTodos.ts
export function createInMemoryTodos(): TodosRepository { /* ... */ }
```

Hooks accept the repo via context (a `TodosProvider`) — production wires `firestoreTodos`, tests wire `createInMemoryTodos()`. Now you can run E2E tests in milliseconds with no Firebase emulator at all.

**The cost**: more indirection. **The benefit**: tests run 100× faster, you can swap Firebase for Supabase in one file, and your domain logic stops depending on an external SDK's release cadence.

Use Level 1 by default. Promote to Level 2 when the tests-against-emulator pain exceeds the indirection pain.

## Cross-cutting: Cloud Functions

The same principles apply, with one Firebase-specific twist: **avoid initializing the Admin SDK in every file**.

```ts
// functions/src/lib/admin.ts — initialized once
import { initializeApp, getApps } from "firebase-admin/app";
if (getApps().length === 0) initializeApp();
export { getFirestore } from "firebase-admin/firestore";
export { getAuth } from "firebase-admin/auth";
```

```ts
// functions/src/posts/archive.ts — depends on the abstraction
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { getFirestore } from "../lib/admin";

export const archivePosts = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "");
  await getFirestore().collection("posts")/* ... */;
});
```

Each function file is a single responsibility (one operation, one route). The admin SDK is initialized in one place.

## Common mistakes

- **Premature Repository pattern.** Wrapping every Firestore call in a `IUserRepository` interface for a 3-screen app is overhead the project can't repay. Start with direct SDK calls in a service module; promote to interfaces when you need tests.
- **God hooks.** A `useApp()` that returns user, todos, posts, notifications, and feature flags. Split per concern; let consumers choose what to subscribe to.
- **Service classes with state.** `class TodosService { private cache = ... }` is an anti-pattern — Firestore already manages cache. Use module-level functions, not classes-with-state.
- **Wrapping `onSnapshot` listeners in promises.** They're streams, not promises. The repository abstraction returns an `Unsubscribe` function, not `Promise<Todo[]>`.
- **Exporting raw Firebase types from your service.** If `TodosService.list()` returns a `FirebaseFirestoreTypes.CollectionReference`, every consumer is coupled to Firebase. Map to your own `Todo` type at the service boundary.
- **DIP all the way down to security rules.** Rules are not application logic; they're a backend security layer. Don't try to abstract them into a generic permission system — express the security model directly in `firestore.rules` as the `firebase-firestore` skill recommends.
- **Class hierarchies for Firebase wrappers.** A `BaseRepository<T>` parent class with `UsersRepository extends BaseRepository<User>` is a Java reflex. In TypeScript, prefer composition with generic factory functions: `function createRepository<T>(collectionName: string): Repository<T>`.
- **Skipping SOLID for "just an MVP".** Trap: the MVP becomes the codebase. Adopt SRP and ISP from day 1 (they're free). Defer OCP/LSP/DIP until they pay for themselves.

See [references/testing-with-repositories.md](references/testing-with-repositories.md) for a complete worked example with Vitest + `inMemoryTodos`.
