# App Check debug tokens — full playbook

Real attestation (App Attest, Play Integrity) does not work on simulators, emulators, CI runners, or jailbroken/rooted devices. For all those environments you need **debug tokens** — strings Firebase trusts in place of real attestation.

Debug tokens are powerful: anyone with one can bypass App Check entirely. Treat them like API keys.

## How to mint a debug token

### iOS Simulator

1. In Xcode, add `-FIRDebugEnabled` to your scheme's launch arguments.
2. Run the app. The first log line containing `App Check debug token:` is your token (UUID format).
3. Firebase Console → App Check → your iOS app → kebab menu → **Manage debug tokens** → Add → paste, give it a descriptive name (e.g. "Alice MacBook iOS sim").

### Android Emulator

1. Run the app once with `@react-native-firebase/app-check` initialized.
2. Watch logcat:
   ```bash
   adb logcat | grep DebugAppCheckProvider
   ```
3. The token appears as `Enter this debug secret into the allow list...`
4. Register it in the Firebase Console (same place as iOS).

### Web (browser)

Before initializing App Check:

```ts
(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
```

The browser console will print a fresh token. Register it. Subsequent loads on the same browser profile reuse the same token (stored in IndexedDB).

If you want a stable token across browser profiles / devices (e.g. for a CI Playwright run), assign a fixed UUID:

```ts
(self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = "your-uuid-here";
```

Register that UUID once in the console.

## Distributing debug tokens to a team

Anti-patterns:

- ❌ Commit tokens to the repo
- ❌ Put them in a public Slack channel
- ❌ Bake into the app bundle for all team members

Patterns that scale:

- ✅ Each developer registers their own token from their own sim/emulator, names it after themselves
- ✅ For CI, mint one token per environment (`CI-PR`, `CI-main`, `E2E-staging`) and store as a secret in your CI provider
- ✅ Rotate (delete + re-mint) when a team member leaves

## CI / E2E pipelines

The token is a string env var:

```yaml
# .github/workflows/e2e.yml
env:
  EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN: ${{ secrets.APP_CHECK_DEBUG_TOKEN_CI }}
```

In code:

```ts
provider.configure({
  android: {
    provider: __DEV__ || isE2E() ? "debug" : "playIntegrity",
    debugToken: process.env.EXPO_PUBLIC_APP_CHECK_DEBUG_TOKEN,
  },
});
```

## Detecting leaked tokens

Firebase Console → App Check → Metrics shows "verified by debug provider" volume. If you see steady debug-token traffic from production users (not just dev/CI), a token has leaked and is being reused against your real backend.

Rotate immediately: delete the token from the console, mint a fresh one, redeploy CI / hand out to teammates.

## Forcing real attestation in dev (sanity check)

Before shipping, flip your dev provider to the real attestation provider once and run on a physical device:

```ts
provider.configure({
  android: { provider: "playIntegrity" },
  apple:   { provider: "appAttestWithDeviceCheckFallback" },
});
```

This catches issues that only surface with the real provider (missing SHA-256 fingerprints, App Attest entitlements, etc.) before they reach production.
