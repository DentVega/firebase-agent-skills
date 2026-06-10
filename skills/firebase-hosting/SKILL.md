---
name: firebase-hosting
description: >-
  Deploys static sites, single-page apps, and Next.js / Angular SSR apps to
  Firebase Hosting — configuring redirects, rewrites, custom headers, preview
  channels for PR previews, and integration with Cloud Functions /
  Cloud Run for dynamic routes. Use whenever the user wants to host a web
  app, marketing site, or landing page on Firebase.
compatibility: Requires the Firebase CLI via `npx -y firebase-tools@latest`. For Next.js / Angular SSR consider App Hosting instead (see the official firebase/agent-skills package).
---

# Firebase Hosting

## Minimum viable example

Three commands. The whole point of Hosting is that it's frictionless:

```bash
npx -y firebase-tools@latest init hosting
# build your site → ./dist or ./public
npx -y firebase-tools@latest deploy --only hosting
```

That's a fully cached, HTTPS-served, globally CDN-distributed site at `https://<project-id>.web.app`.

## 1. Initialize

```bash
npx -y firebase-tools@latest init hosting
```

The wizard asks:

- **Public directory** — where your built site lives. For Vite: `dist`. For Next.js static export: `out`. For raw HTML: `public`.
- **Single-page app?** — answer **yes** if you use client-side routing (React Router, Vue Router). This adds a rewrite that sends every path to `/index.html`.
- **GitHub Actions setup** — say yes if you want auto-deploys on push. Generates `.github/workflows/firebase-hosting-{merge,pull-request}.yml`.

Generated `firebase.json`:

```json
{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      { "source": "**", "destination": "/index.html" }
    ]
  }
}
```

## 2. Deploy

```bash
npx -y firebase-tools@latest deploy --only hosting
```

Output ends with two URLs:

- `https://<project-id>.web.app` (primary)
- `https://<project-id>.firebaseapp.com` (legacy alias, same content)

Both are HTTPS-only with a managed cert. No CDN config needed — every asset is cached at edge by default.

## 3. Preview channels (one per PR)

Channels give you an ephemeral preview URL without overwriting prod:

```bash
npx -y firebase-tools@latest hosting:channel:deploy pr-123 --expires 7d
```

Returns `https://<project-id>--pr-123-<hash>.web.app`. Expires automatically after the TTL. Wire into CI to comment the URL on every PR:

```yaml
- uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    repoToken: ${{ secrets.GITHUB_TOKEN }}
    firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT }}
    expires: 7d
    projectId: <project-id>
```

The action handles channel creation, deploy, and PR comment with the preview URL.

## 4. Redirects, rewrites, headers

### Redirects (308 by default — `type` overrides)

```json
{
  "hosting": {
    "redirects": [
      { "source": "/old-blog/:slug", "destination": "/blog/:slug", "type": 301 },
      { "source": "/twitter", "destination": "https://x.com/your-handle", "type": 302 }
    ]
  }
}
```

### Rewrites (serve content from another path or backend)

```json
{
  "hosting": {
    "rewrites": [
      { "source": "/api/**", "function": "api" },
      { "source": "/img/**", "run":      { "serviceId": "image-resizer", "region": "us-central1" } },
      { "source": "**",      "destination": "/index.html" }
    ]
  }
}
```

`function` rewrites send the request to a Cloud Function; `run` rewrites send it to a Cloud Run service. Both use the same auth, cookies, and headers — no CORS hop. The catch-all to `/index.html` for SPA routing **must be last** (rules are evaluated top to bottom).

### Custom headers

```json
{
  "hosting": {
    "headers": [
      {
        "source": "**/*.@(js|css|woff2|png|jpg|svg)",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          { "key": "Cache-Control", "value": "public, max-age=0, must-revalidate" },
          { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains" }
        ]
      }
    ]
  }
}
```

The default is `max-age=3600` for everything, which is wrong for both ends — assets with hashed names should be immutable, HTML should never be cached. Set headers explicitly.

## 5. Custom domains

```bash
npx -y firebase-tools@latest hosting:sites:list
# Console → Hosting → Add custom domain → follow DNS instructions
```

Firebase auto-provisions a Let's Encrypt cert. DNS propagation takes 0–24h; cert issuance takes a few minutes after DNS resolves.

For apex domains (`example.com` not `www.example.com`), use A records pointing to the IPs Firebase shows. For www, use CNAME to `<project-id>.web.app`.

## 6. SSR with Cloud Functions

For dynamic rendering, route to a function:

```ts
// functions/src/ssr.ts
import { onRequest } from "firebase-functions/v2/https";

export const ssr = onRequest(async (req, res) => {
  const html = await renderToString(req.path);
  res.set("Cache-Control", "public, max-age=300, s-maxage=600");
  res.send(html);
});
```

`firebase.json`:

```json
{
  "hosting": {
    "rewrites": [
      { "source": "**", "function": "ssr" }
    ]
  }
}
```

For Next.js or Angular Universal specifically, prefer **Firebase App Hosting** (separate product) — handles SSR, edge caching, and CDN config automatically. App Hosting is covered by the official `firebase/agent-skills` package.

## 7. Multi-site projects

```bash
npx -y firebase-tools@latest hosting:sites:create marketing
npx -y firebase-tools@latest target:apply hosting marketing-target marketing
```

`firebase.json`:

```json
{
  "hosting": [
    { "target": "marketing-target", "public": "marketing/dist" },
    { "target": "app-target",       "public": "app/dist" }
  ]
}
```

Deploy a specific target:

```bash
npx -y firebase-tools@latest deploy --only hosting:marketing-target
```

Useful for monorepos with separate marketing + product sites on the same Firebase project.

## 8. Common mistakes

- **Catch-all rewrite first.** Rules are top-to-bottom. If `{ "source": "**", "destination": "/index.html" }` comes before your `/api/**` rewrite, the API rewrite never matches.
- **Default cache headers.** Without explicit headers, JS bundles cache for 1h but HTML caches the same — meaning users can't even see new deploys for an hour. Always override.
- **Deploying without ignoring build artifacts.** Adding `dist/node_modules` to the upload because `ignore` was misconfigured. Check the deploy log for total file count.
- **Treating preview channels as private.** They're publicly accessible to anyone with the URL. For private review, gate with Firebase Auth or use IAP.
- **Forgetting that rewrites are server-side, not redirects.** A rewrite serves different content at the same URL (no client navigation). For SEO-friendly URL changes that should reflect in the browser bar, use a redirect.
- **Hosting an SPA without the rewrite.** Refreshing on `/dashboard` returns 404 because the file doesn't exist; the rewrite to `/index.html` is what lets the client router handle it.
- **Using Hosting for huge files (>10 MB).** Treat Hosting as a CDN for app assets. Large user-uploaded files go to Cloud Storage, served via a signed URL or a Storage rewrite.
