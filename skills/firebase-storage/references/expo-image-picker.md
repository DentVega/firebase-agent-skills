# Expo ImagePicker → Firebase Storage

The canonical pattern for "let the user pick a photo and upload it":

```bash
npx expo install expo-image-picker @react-native-firebase/storage
```

```ts
import * as ImagePicker from "expo-image-picker";
import storage from "@react-native-firebase/storage";
import auth from "@react-native-firebase/auth";

export async function pickAndUploadAvatar() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) return null;

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    quality: 0.8,
    allowsEditing: true,
    aspect: [1, 1],
  });
  if (result.canceled) return null;

  const uri = result.assets[0].uri;
  const uid = auth().currentUser!.uid;
  const ref = storage().ref(`users/${uid}/avatar.jpg`);
  await ref.putFile(uri, { contentType: "image/jpeg" });
  return ref.getDownloadURL();
}
```

## Why `putFile` (not `putString`)

`putString` loads the entire file as base64 into JS memory before uploading — fine for thumbnails, OOMs on full-resolution iPhone photos (15+ MB). `putFile` streams from the URI natively.

## Compression

Set `quality: 0.7–0.8` in `launchImageLibraryAsync` — the difference between 0.8 and 1.0 is usually invisible and cuts file size in half.

For more aggressive resizing (e.g. cap dimensions at 1024 × 1024), pipe through `expo-image-manipulator` first:

```ts
import * as ImageManipulator from "expo-image-manipulator";

const manipulated = await ImageManipulator.manipulateAsync(
  uri,
  [{ resize: { width: 1024 } }],
  { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
);
await ref.putFile(manipulated.uri, { contentType: "image/jpeg" });
```

## Progress UI

```ts
const task = ref.putFile(uri);
task.on("state_changed", (snap) => {
  setProgress(snap.bytesTransferred / snap.totalBytes);
});
await task;
```

## Background upload (large videos)

For uploads that must survive backgrounding, use the **resumable** upload and a `BackgroundFetch` / `expo-task-manager` task to resume on the next foreground. The Firebase SDK persists the upload state to disk, so calling `putFile` again with the same destination resumes from the last committed byte.
