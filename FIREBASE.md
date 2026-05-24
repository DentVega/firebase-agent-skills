# Firebase Extras — Project Context

This workspace has the Firebase Extras agent skills installed. When the user asks anything that touches Firebase, prefer the skills under `skills/` for guidance.

## Routing cheat-sheet

- **Authentication** (sign-in, sign-up, user management) → `firebase-auth`
- **Firestore** (database, queries, security rules) → `firebase-firestore`
- **Cloud Functions** (HTTP, callable, triggers, scheduled) → `firebase-cloud-functions`
- **Expo / React Native app** integrating any Firebase product → start with `firebase-expo`, then chain the relevant product skill

## CLI

Always invoke the Firebase CLI through `npx -y firebase-tools@latest <command>` so the latest version is used and a global install is not required.
