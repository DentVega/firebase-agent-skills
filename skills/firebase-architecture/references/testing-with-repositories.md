# Testing Firebase logic with a Repository abstraction

The pattern: hooks and screens depend on a `Repository` interface; production wires the Firestore implementation, tests wire an in-memory one. You get sub-millisecond unit tests with full coverage of mutation logic, optimistic updates, error paths, and edge cases — no emulator startup, no Firebase SDK initialization.

This file shows the complete pattern end-to-end.

## 1. Define the contract

```ts
// lib/repositories/todos.ts
export type Todo = {
  id: string;
  title: string;
  done: boolean;
  createdAt: number; // unix ms — translated from FirebaseFirestoreTypes.Timestamp at the boundary
};

export type Unsubscribe = () => void;

export interface TodosRepository {
  watchByUser(uid: string, onChange: (todos: Todo[]) => void): Unsubscribe;
  add(uid: string, input: { title: string }): Promise<string>;
  toggle(uid: string, id: string, done: boolean): Promise<void>;
  remove(uid: string, id: string): Promise<void>;
}
```

Notes:

- `Todo.createdAt` is `number`, not a Firestore `Timestamp`. The conversion happens **inside** the Firestore implementation. Consumers never touch Firebase types.
- `watchByUser` returns `Unsubscribe`, not `Promise<Todo[]>`. Hooks expect a listener.

## 2. Firestore implementation

```ts
// lib/repositories/firestoreTodos.ts
import firestore from "@react-native-firebase/firestore";
import type { TodosRepository, Todo } from "./todos";

export const firestoreTodos: TodosRepository = {
  watchByUser(uid, onChange) {
    return firestore()
      .collection("users").doc(uid).collection("todos")
      .orderBy("createdAt", "desc")
      .onSnapshot((snap) => {
        const todos: Todo[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title,
            done: data.done,
            createdAt: data.createdAt?.toMillis() ?? Date.now(),
          };
        });
        onChange(todos);
      });
  },

  async add(uid, { title }) {
    const ref = await firestore()
      .collection("users").doc(uid).collection("todos")
      .add({
        title,
        done: false,
        createdAt: firestore.FieldValue.serverTimestamp(),
      });
    return ref.id;
  },

  async toggle(uid, id, done) {
    await firestore()
      .collection("users").doc(uid).collection("todos").doc(id)
      .update({ done });
  },

  async remove(uid, id) {
    await firestore()
      .collection("users").doc(uid).collection("todos").doc(id)
      .delete();
  },
};
```

This is the **only file** in the codebase that imports `firestore`. Everything else depends on the `TodosRepository` interface.

## 3. In-memory implementation for tests

```ts
// lib/repositories/inMemoryTodos.ts
import type { TodosRepository, Todo, Unsubscribe } from "./todos";

export function createInMemoryTodos(): TodosRepository {
  const byUser = new Map<string, Map<string, Todo>>();
  const listeners = new Map<string, Set<(todos: Todo[]) => void>>();
  let nextId = 1;

  function emit(uid: string) {
    const todos = Array.from(byUser.get(uid)?.values() ?? [])
      .sort((a, b) => b.createdAt - a.createdAt);
    listeners.get(uid)?.forEach((cb) => cb(todos));
  }

  return {
    watchByUser(uid, onChange): Unsubscribe {
      if (!listeners.has(uid)) listeners.set(uid, new Set());
      listeners.get(uid)!.add(onChange);
      onChange(Array.from(byUser.get(uid)?.values() ?? []));
      return () => listeners.get(uid)?.delete(onChange);
    },

    async add(uid, { title }) {
      if (!byUser.has(uid)) byUser.set(uid, new Map());
      const id = String(nextId++);
      byUser.get(uid)!.set(id, { id, title, done: false, createdAt: Date.now() });
      emit(uid);
      return id;
    },

    async toggle(uid, id, done) {
      const todo = byUser.get(uid)?.get(id);
      if (!todo) throw new Error("not found");
      byUser.get(uid)!.set(id, { ...todo, done });
      emit(uid);
    },

    async remove(uid, id) {
      byUser.get(uid)?.delete(id);
      emit(uid);
    },
  };
}
```

This is ~30 lines and replaces Firestore for any test that doesn't need to verify Firestore-specific behavior (rules, persistence, network).

## 4. Wire via context

```tsx
// lib/repositories/context.tsx
import { createContext, useContext, type ReactNode } from "react";
import type { TodosRepository } from "./todos";
import { firestoreTodos } from "./firestoreTodos";

const TodosRepoContext = createContext<TodosRepository>(firestoreTodos);

export function TodosRepoProvider({
  repo = firestoreTodos,
  children,
}: { repo?: TodosRepository; children: ReactNode }) {
  return <TodosRepoContext.Provider value={repo}>{children}</TodosRepoContext.Provider>;
}

export const useTodosRepo = () => useContext(TodosRepoContext);
```

Production: just render `<TodosRepoProvider>` (uses Firestore by default).
Tests: `<TodosRepoProvider repo={createInMemoryTodos()}>`.

## 5. Hook consumes the abstraction

```ts
// lib/hooks/useTodos.ts
import { useEffect, useState } from "react";
import { useTodosRepo } from "../repositories/context";
import type { Todo } from "../repositories/todos";

export function useTodos(uid: string) {
  const repo = useTodosRepo();
  const [todos, setTodos] = useState<Todo[]>([]);
  useEffect(() => repo.watchByUser(uid, setTodos), [repo, uid]);
  return todos;
}
```

The hook has no idea Firestore exists. Replace `firestoreTodos` with a Supabase implementation tomorrow and this hook doesn't change.

## 6. The test (Vitest / Jest — same syntax)

```ts
// __tests__/useTodos.test.tsx
import { render, screen, act } from "@testing-library/react-native";
import { createInMemoryTodos } from "../lib/repositories/inMemoryTodos";
import { TodosRepoProvider } from "../lib/repositories/context";
import TodosScreen from "../app/(app)/todos";

it("adds a todo and shows it in the list", async () => {
  const repo = createInMemoryTodos();
  await repo.add("alice", { title: "buy milk" });

  render(
    <TodosRepoProvider repo={repo}>
      <TodosScreen />
    </TodosRepoProvider>
  );

  expect(screen.getByText("buy milk")).toBeOnTheScreen();
});

it("toggle flips the done flag", async () => {
  const repo = createInMemoryTodos();
  const id = await repo.add("alice", { title: "x" });
  await repo.toggle("alice", id, true);
  // assertion on UI...
});
```

Tests run in ~5ms. No emulator. No Firebase SDK init. No `auth().currentUser` mocking.

## When this is overkill

You don't need this for:

- A 3-screen MVP with no test suite
- A throwaway demo / hackathon project
- Code that's about to be replaced anyway

You do need this for:

- An app heading to production with a multi-month roadmap
- Code paths that touch payments / billing / writes you can't roll back
- Any feature where you'd otherwise need an emulator + a network round trip to test

## Promotion path

If you've been using a `TodosService` module (Level 1 of the architecture skill), the migration is:

1. Extract the interface: copy the `TodosService` shape into a `TodosRepository` interface
2. Rename `TodosService` → `firestoreTodos`, have it implement the interface
3. Add `TodosRepoContext` and the `useTodosRepo` hook
4. Update one hook to consume `useTodosRepo()` instead of importing `TodosService` directly
5. Repeat for other hooks

Each step is a small, mechanically-safe refactor. Stop at any point if the indirection cost outweighs the test benefit.
