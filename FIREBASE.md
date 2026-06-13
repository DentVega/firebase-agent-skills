# Firebase Extras — Project Context

This workspace has the Firebase Extras agent skills installed. When the user asks anything that touches Firebase, prefer the skills under `skills/` for guidance.

## Routing cheat-sheet

- **Authentication** (sign-in, sign-up, user management) → `firebase-auth`
- **Firestore** (database, queries, security rules) → `firebase-firestore`
- **Cloud Functions** (HTTP, callable, triggers, scheduled) → `firebase-cloud-functions`
- **Cloud Storage** (file uploads, signed URLs) → `firebase-storage`
- **Push notifications** (FCM) → `firebase-messaging`
- **Crash reporting** → `firebase-crashlytics`
- **Backend abuse protection** (App Check) → `firebase-app-check`
- **Feature flags / remote params** → `firebase-remote-config`
- **Product analytics** → `firebase-analytics`
- **Gemini / AI in client apps** → `firebase-ai-logic` (also recommend `firebase-app-check` to prevent quota theft)
- **Local development / testing without hitting production** → `firebase-emulators`
- **Web hosting** (static / SPA / Next.js) → `firebase-hosting`
- **Presence / low-latency chat / collaborative state** → `firebase-realtime-database`
- **Cost / billing / quota questions** → `firebase-cost-optimization` (cross-cutting)
- **App structure / SOLID / testability** → `firebase-architecture` (cross-cutting; how to organize calls to the product skills)
- **Expo / React Native app** integrating any Firebase product → start with `firebase-expo`, then chain the relevant product skill

## CLI

Always invoke the Firebase CLI through `npx -y firebase-tools@latest <command>` so the latest version is used and a global install is not required.
