---
name: firebase-storage
description: >-
  Configures and uses Cloud Storage for Firebase — provisioning buckets,
  writing security rules, uploading/downloading files from web and React
  Native, generating signed URLs from Cloud Functions, and integrating with
  Expo ImagePicker. Use whenever the user needs to store user-uploaded
  files, images, video, or any binary blob.
compatibility: Requires the Firebase CLI via `npx -y firebase-tools@latest`. For Expo, pair with `firebase-expo`.
---

# Cloud Storage for Firebase

## 1. Initialize storage

A default bucket is auto-created with each project. List existing buckets:

```bash
npx -y firebase-tools@latest storage:buckets:list 2>/dev/null || true
```

If you need a secondary bucket (e.g. for public CDN content vs. user-private uploads):

```bash
gsutil mb -l <region> gs://<project-id>-public
```

Initialize Storage in your project root:

```bash
npx -y firebase-tools@latest init storage
```

This creates `storage.rules`.

## 2. Security rules

Default-deny, anchor to auth. Two common patterns:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {

    // User-private files
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null
                         && request.auth.uid == userId
                         && request.resource.size < 10 * 1024 * 1024  // 10 MiB
                         && request.resource.contentType.matches('image/.*');
    }

    // Publicly readable, owner-writable
    match /public/posts/{postId}/{file} {
      allow read: if true;
      allow write: if request.auth != null
                   && firestore.get(/databases/(default)/documents/posts/$(postId)).data.authorId
                      == request.auth.uid;
    }
  }
}
```

Deploy:

```bash
npx -y firebase-tools@latest deploy --only storage
```

The `request.resource.size` and `contentType` checks happen **before** the upload is admitted — they cap bandwidth and reject malicious uploads cheaply.

For cross-references with Firestore (`firestore.get(...)`), each call costs one Firestore read billed to your project.

## 3. Client SDK — Web

```ts
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

const storage = getStorage();
const r = ref(storage, `users/${uid}/avatar.jpg`);
await uploadBytes(r, file, { contentType: "image/jpeg" });
const url = await getDownloadURL(r);
```

For resumable uploads of large files:

```ts
import { uploadBytesResumable } from "firebase/storage";

const task = uploadBytesResumable(r, file);
task.on("state_changed",
  (snap) => setProgress(snap.bytesTransferred / snap.totalBytes),
  (err) => console.error(err),
  async () => {
    const url = await getDownloadURL(task.snapshot.ref);
  },
);
```

## 4. Client SDK — Expo / React Native

```bash
npx expo install @react-native-firebase/storage
```

```ts
import storage from "@react-native-firebase/storage";

// File URI from expo-image-picker, expo-document-picker, etc.
const ref = storage().ref(`users/${uid}/photo.jpg`);
await ref.putFile(localFileUri);
const url = await ref.getDownloadURL();
```

`putFile` accepts a local file URI (no need to load the bytes into memory). For very large files this is dramatically more memory-efficient than the web SDK's `uploadBytes`.

For Expo ImagePicker integration see [references/expo-image-picker.md](references/expo-image-picker.md).

## 5. Signed URLs from Cloud Functions

Download URLs from the client SDK are tied to a token that lives in the file's metadata. To revoke access, you have to rotate the token (delete + reupload, or call `updateMetadata` with `firebaseStorageDownloadTokens` deleted). For controlled access, generate **signed URLs** from a Cloud Function instead:

```ts
import { getStorage } from "firebase-admin/storage";
import { onCall, HttpsError } from "firebase-functions/v2/https";

export const getSignedUrl = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "");
  const path = request.data.path as string;

  // Authorize: does this user own this path?
  if (!path.startsWith(`users/${request.auth.uid}/`)) {
    throw new HttpsError("permission-denied", "");
  }

  const [url] = await getStorage().bucket().file(path).getSignedUrl({
    action: "read",
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
  });
  return { url };
});
```

Signed URLs work without the Firebase SDK and expire on a deadline you choose.

## 6. Cost & performance

- **Caching**: set `Cache-Control: public, max-age=31536000` in metadata for immutable assets (hashed filenames). Reduces egress bills significantly.
- **Resize on the fly**: install the official **Resize Images** extension (`npx -y firebase-tools@latest ext:install firebase/storage-resize-images`) to auto-generate thumbnails.
- **Delete on user deletion**: hook `beforeUserDeleted` (see `firebase-cloud-functions` triggers) and bulk-delete the user's prefix, otherwise files orphan forever and keep billing.
- **Don't list large prefixes from the client.** `listAll()` returns up to 1000 entries per page and is slow + expensive at scale. Maintain a Firestore index of file paths instead.

## 7. Common mistakes

- **Storing download URLs in Firestore long-term.** They include a token that may rotate or be revoked. Store the **path** and call `getDownloadURL(ref(storage, path))` at read time, or use signed URLs.
- **Not setting `contentType` on upload.** Browsers refuse to display files served with the wrong MIME. The web SDK infers from the `File` object; manual uploads must set it explicitly.
- **Skipping size checks in rules.** Without `request.resource.size < N`, a single attacker can upload terabytes and bill you.
- **Mixing `gs://` URIs and HTTPS URLs.** The SDK accepts both via `ref()` but third-party tools (CDNs, `<img src>`) need the HTTPS download URL.
