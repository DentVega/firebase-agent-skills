---
name: firebase-remote-config
description: >-
  Configures Firebase Remote Config for runtime feature flags and dynamic
  parameters — declaring defaults, fetching and activating, targeting by
  platform / app version / audience, and running basic A/B tests. Use
  whenever the user needs to change app behavior without shipping a new
  build, or wants a kill-switch for a risky feature.
compatibility: Works on web (firebase) and Expo/RN (@react-native-firebase/remote-config). Templates are edited in the Firebase Console or via the Admin SDK.
---

# Firebase Remote Config

## When to use it (and when not)

Use Remote Config for:

- **Feature flags / kill switches** — turn off a buggy feature instantly without a redeploy
- **Tuning UI text, prices, copy** — A/B test wording, change without an App Store review
- **Targeting** — different default for free vs. paid users, country, app version
- **Gradual rollouts** — ship a feature to 10% of users, ramp up if metrics look good

Do **not** use it for:

- **User-specific state** (use Firestore — Remote Config has no per-user storage)
- **Anything that needs to be instant on every read** (Remote Config caches; default min fetch interval is 12h in production)
- **Secrets** — values are visible to clients

## 1. Install (Expo / RN)

```bash
npx expo install @react-native-firebase/remote-config
```

No native config needed beyond the `@react-native-firebase/app` plugin.

## 2. Declare defaults in code

Defaults are the values used **before** the first fetch completes, or if fetch fails. Always provide sensible ones — your app must work offline.

```ts
import remoteConfig from "@react-native-firebase/remote-config";

await remoteConfig().setDefaults({
  feature_new_checkout: false,
  promo_banner_text: "",
  max_uploads_per_day: 50,
});

await remoteConfig().setConfigSettings({
  minimumFetchIntervalMillis: __DEV__ ? 0 : 3600 * 1000, // 1h in prod, no cache in dev
});

await remoteConfig().fetchAndActivate();
```

`fetchAndActivate` is the right call on app start — it fetches if cache is stale, then activates the new template atomically.

## 3. Read values

```ts
const enabled = remoteConfig().getValue("feature_new_checkout").asBoolean();
const text    = remoteConfig().getValue("promo_banner_text").asString();
const cap     = remoteConfig().getValue("max_uploads_per_day").asNumber();
```

Always wrap in a hook so React re-renders when config changes:

```ts
function useRemoteFlag(key: string, fallback: boolean) {
  const [value, setValue] = useState(() => remoteConfig().getValue(key).asBoolean());
  useEffect(() => {
    return remoteConfig().onConfigUpdated(async () => {
      await remoteConfig().activate();
      setValue(remoteConfig().getValue(key).asBoolean());
    });
  }, [key]);
  return value;
}
```

`onConfigUpdated` is real-time — values update without a full app restart.

## 4. Define parameters in the console

Firebase Console → Remote Config → Add parameter:

- **Parameter key**: must match the string used in code (e.g. `feature_new_checkout`)
- **Default value**: used when no condition matches
- **Conditions**: e.g. *"App version >= 2.0 AND Country == BR → true; otherwise false"*

**Publish** the template to make changes live. Drafts don't reach clients.

## 5. Targeting by audience

Conditions support:

- Platform (iOS, Android, Web)
- App version (`==`, `>=`, `<=`, semver)
- Country / region
- User audience (defined via Firebase Analytics events)
- User property (custom, set from client)
- Random percentile (for gradual rollouts)

Set a custom user property from the client (requires `@react-native-firebase/analytics`):

```ts
import analytics from "@react-native-firebase/analytics";
await analytics().setUserProperty("tier", "pro");
```

Then in console, create a condition: `User property "tier" exactly matches "pro"`.

## 6. Gradual rollout pattern

To ship a feature to 10% of users:

1. Add parameter `feature_x_enabled`, default `false`
2. Add condition: `User in random percentile <= 10 → true`
3. Publish. Monitor crash rate, latency, conversion for 24h.
4. Increase percentile to 50, then 100.

Combine with a manual override condition (`User property "qa_tester" exactly matches "true" → true`) so QA can always test the feature.

## 7. Read from a Cloud Function

You can read Remote Config server-side via the Admin SDK to keep client and server in sync:

```ts
import { getRemoteConfig } from "firebase-admin/remote-config";

const template = await getRemoteConfig().getTemplate();
const param = template.parameters.feature_new_checkout;
```

For dynamic decisions in Cloud Functions, prefer Firestore documents — Remote Config templates are designed for client targeting, not for high-QPS server reads.

## 8. Common mistakes

- **No defaults in `setDefaults`.** First app launch (no network) gets undefined values → crashes.
- **Calling `fetch()` without `activate()`.** The fetched template sits dormant. Use `fetchAndActivate()` unless you have a specific reason to delay activation (e.g. only activate on next app start).
- **Forgetting to publish the console template.** Edits in the console don't reach clients until you hit "Publish changes".
- **12-hour cache in development.** Set `minimumFetchIntervalMillis` to 0 in dev or you'll think your changes aren't working.
- **Putting secrets in parameters.** Anyone with mitmproxy can read them. Use Cloud Functions + Secret Manager for secrets.
- **Treating Remote Config as a database.** It's a key/value store with one template per project. Per-user data goes in Firestore.
