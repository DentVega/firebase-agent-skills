# Firestore Security Rules — advanced patterns

## Role-based access via custom claims

Set claims from a Cloud Function:

```ts
import { getAuth } from "firebase-admin/auth";
await getAuth().setCustomUserClaims(uid, { role: "admin" });
```

The client must refresh its token to see the new claim:

```ts
await user.getIdToken(true);
```

Use in rules:

```
function isAdmin() {
  return request.auth != null && request.auth.token.role == "admin";
}

match /adminOnly/{doc} {
  allow read, write: if isAdmin();
}
```

## Group / membership checks

To allow access if the user is listed in a document's `members` map:

```
match /workspaces/{wsId} {
  allow read: if request.auth.uid in resource.data.members;
  allow update: if request.auth.uid in resource.data.members
                && request.resource.data.members == resource.data.members;
}
```

The second condition prevents members from removing each other via `update`. For admin-only membership changes, gate that mutation separately.

## Write validation

Reject malformed writes at the rule layer so the client cannot insert garbage:

```
match /posts/{postId} {
  allow create: if request.auth != null
    && request.resource.data.keys().hasOnly(["authorId", "title", "body", "createdAt"])
    && request.resource.data.authorId == request.auth.uid
    && request.resource.data.title is string
    && request.resource.data.title.size() <= 200
    && request.resource.data.createdAt == request.time;
}
```

`request.time` is the server timestamp — pin `createdAt` to it instead of trusting the client clock.

## Cross-document checks (get / exists)

You can read another document inside a rule, but each call costs 1 read:

```
match /projects/{projectId}/files/{fileId} {
  allow read: if exists(/databases/$(database)/documents/projects/$(projectId)/members/$(request.auth.uid));
}
```

Reads inside rules are billed and count against your daily quota — use sparingly. For hot paths, denormalize the access list into the document itself.

## Testing rules locally

```bash
npx -y firebase-tools@latest emulators:exec --only firestore "npm test"
```

Use `@firebase/rules-unit-testing` to write Jest/Vitest tests asserting allow/deny. This is the only way to know your rules behave as intended before deploy.

## Common mistakes

- **`allow read, write: if request.auth != null;`** — leaks every document to every signed-in user. Always anchor to ownership.
- **Trusting client timestamps.** Use `request.time` and pin server-side fields.
- **Forgetting `resource.data` vs `request.resource.data`.** `resource` is the existing doc, `request.resource` is the proposed doc. For `update`, you usually need both (e.g. owner check on `resource`, validation on `request.resource`).
- **Forgetting `update` rules also apply on `set` with merge.** A `setDoc(ref, {...}, { merge: true })` is evaluated as an update — your update rules must allow it.
