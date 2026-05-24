# Google Consent Mode v2 — GDPR / DMA compliance

If your app ships in the EEA, UK, or Switzerland, you are legally required to obtain consent before sending analytics or ads data. Since March 2024, **Consent Mode v2** is mandatory — without it, Google blocks data flow from these regions entirely.

Consent Mode is a way to tell Google "the user said yes/no to X" so the SDK can adjust its behavior accordingly (e.g. send pings without identifiers when consent is denied, suitable for aggregate measurement).

## The four signals

| Signal | What it gates |
|---|---|
| `analytics_storage` | Storing analytics cookies / identifiers |
| `ad_storage` | Storing ad cookies / identifiers |
| `ad_user_data` | Sending user data to Google for ads |
| `ad_personalization` | Personalized advertising |

Each can be `granted` or `denied`. v2 requires all four to be explicitly set.

## Set defaults (before any Analytics call)

The defaults are what's used until the user makes a choice — set them to `denied` for EEA users so nothing flows before consent.

### Web

```ts
import { setConsent } from "firebase/analytics";

setConsent({
  ad_storage: "denied",
  analytics_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
});
```

### Expo / React Native

```ts
import analytics from "@react-native-firebase/analytics";

await analytics().setConsent({
  analytics_storage: false,
  ad_storage: false,
  ad_user_data: false,
  ad_personalization: false,
});
```

## Update after the consent banner

When the user accepts/declines:

```ts
await analytics().setConsent({
  analytics_storage: userAcceptedAnalytics,
  ad_storage: userAcceptedAds,
  ad_user_data: userAcceptedAds,
  ad_personalization: userAcceptedAds,
});
```

Persist the user's choices (`AsyncStorage` / Firestore) and re-apply on every cold start before any other Analytics call.

## Detecting whether to show the banner

You only need to show the banner to EEA/UK/CH users. Detect via:

- **Web**: `navigator.language` is a hint but not authoritative. Better: a Cloud Function that returns the country from `request.headers["x-appengine-country"]` or a geolocation service.
- **Mobile**: `expo-localization` gives the device region. Combine with IP geolocation server-side for accuracy when users are roaming.

For other jurisdictions (e.g. California CCPA), check the requirements separately — some require an opt-out link rather than a pre-consent prompt.

## Verifying it works

DebugView shows whether each event was sent in **modeled** (consent denied, aggregated only) or **observed** (consent granted, identified) mode. If you see real device IDs in DebugView before consent, your defaults are wrong.

You can also inspect the network: requests to `google-analytics.com` should include `gcs=G100` (analytics denied) until consent flips it to `gcs=G111`.

## Common mistakes

- **Calling `logEvent` before `setConsent`.** The first event leaks identifiers because defaults haven't been applied yet. Set consent during app bootstrap, before any `await firebase.initializeApp()`-dependent code.
- **Showing the banner to non-EEA users.** Annoying and unnecessary — gate the banner behind region detection.
- **Setting consent once and forgetting.** Users have the right to revoke. Provide an in-app settings screen that updates `setConsent` again.
- **Treating consent as binary.** A user might say yes to analytics, no to ads. Honor that.
- **Skipping consent for Crashlytics.** Crashlytics is technically separate, but EU privacy rules often cover crash reporting too. Either get consent or disable it for EEA users via `setCrashlyticsCollectionEnabled(false)` until they consent.

## Quick checklist before launch in EEA

- [ ] Defaults set to `denied` for all 4 signals before any other Firebase call
- [ ] Consent banner shown on first launch for EEA users
- [ ] User's choice persisted and re-applied on every cold start
- [ ] Settings screen lets the user change their mind
- [ ] DebugView confirms `gcs=G100` until consent given
- [ ] Crashlytics collection disabled until consent (if applicable)
