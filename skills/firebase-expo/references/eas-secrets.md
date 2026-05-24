# EAS Build — secrets and config files

## Environment variables

EAS Build does not inherit your local `.env` file. Define variables per build profile in `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "env": {
        "EXPO_PUBLIC_API_URL": "https://staging.api.example.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.example.com"
      }
    }
  }
}
```

Variables prefixed with `EXPO_PUBLIC_` are inlined into the JS bundle at build time. **They are not secret** — anyone who downloads the app can read them. Never put API keys with sensitive scopes here.

For true secrets (server signing keys, Stripe secret keys), don't ship them in the app at all — call a Cloud Function that holds the secret in Secret Manager (see the `firebase-cloud-functions` skill).

## Native config files (GoogleService-Info.plist, google-services.json)

Two options:

### A. Commit them (private repo)

Reference from `app.json`:

```json
{
  "ios":     { "googleServicesFile": "./GoogleService-Info.plist" },
  "android": { "googleServicesFile": "./google-services.json" }
}
```

EAS Build picks them up automatically.

### B. Use EAS file secrets (public repo)

```bash
eas secret:create --scope project --name GOOGLE_SERVICES_IOS --type file --value ./GoogleService-Info.plist
eas secret:create --scope project --name GOOGLE_SERVICES_ANDROID --type file --value ./google-services.json
```

Reference them from `app.config.ts`:

```ts
export default {
  expo: {
    ios:     { googleServicesFile: process.env.GOOGLE_SERVICES_IOS },
    android: { googleServicesFile: process.env.GOOGLE_SERVICES_ANDROID },
  },
};
```

Add the actual files to `.gitignore` so they don't end up in the public repo.

## Dynamic config

If you need different Firebase projects for dev vs. prod, convert `app.json` → `app.config.ts` and switch on `process.env.APP_ENV`:

```ts
const isProd = process.env.APP_ENV === "production";

export default {
  expo: {
    name: isProd ? "MyApp" : "MyApp (Dev)",
    ios: {
      bundleIdentifier: isProd ? "com.example.app" : "com.example.app.dev",
      googleServicesFile: isProd ? "./GoogleService-Info.prod.plist" : "./GoogleService-Info.dev.plist",
    },
  },
};
```

Then set `APP_ENV` per EAS build profile.
