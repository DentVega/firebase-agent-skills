# Preview channels in CI — full setup

Every PR gets its own preview URL, posted as a comment, expiring automatically. The closest thing to Vercel previews you can get on Firebase Hosting.

## 1. Service account

The CI needs a service account JSON with hosting deploy permissions.

```bash
npx -y firebase-tools@latest init hosting:github
```

This walks you through: create a service account, download the JSON, and stores it as `FIREBASE_SERVICE_ACCOUNT_<PROJECT_ID>` in GitHub Secrets. Done in 2 minutes.

## 2. Workflow generated

The init command writes two workflows:

**`firebase-hosting-pull-request.yml`** — runs on every PR, deploys to a preview channel named after the PR, comments the URL.

```yaml
name: Deploy preview
on: pull_request

jobs:
  build_and_preview:
    if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_YOUR_PROJECT_ID }}
          expires: 7d
          projectId: your-project-id
```

The `if:` guards against forks — secrets aren't available to fork PRs, so the action would fail noisily. Use a separate "approved by maintainer" flow if you need preview deploys for external contributors.

**`firebase-hosting-merge.yml`** — runs on push to main, deploys to the live channel:

```yaml
on:
  push:
    branches: [main]
jobs:
  build_and_deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npm run build
      - uses: FirebaseExtended/action-hosting-deploy@v0
        with:
          repoToken: ${{ secrets.GITHUB_TOKEN }}
          firebaseServiceAccount: ${{ secrets.FIREBASE_SERVICE_ACCOUNT_YOUR_PROJECT_ID }}
          channelId: live
          projectId: your-project-id
```

## 3. Custom channel names

Useful for environment-style channels: `staging`, `qa`, etc.

```bash
npx -y firebase-tools@latest hosting:channel:deploy staging --no-expires
```

`--no-expires` keeps the channel alive indefinitely (useful for staging URLs you want stable). Default channel TTL is 7 days.

## 4. Cleanup

Channels are visible in the console; they auto-delete on expiry. To delete manually:

```bash
npx -y firebase-tools@latest hosting:channel:delete pr-123
```

For old channels accumulating in long-lived repos:

```bash
npx -y firebase-tools@latest hosting:channel:list \
  --json | jq -r '.[] | select(.expireTime < (now | strftime("%FT%TZ"))) | .name' \
  | xargs -n1 npx -y firebase-tools@latest hosting:channel:delete
```

(One-shot cleanup script — run from CI on a monthly schedule.)

## 5. Linking the preview to the PR comment

The action posts a comment by default. To customize:

```yaml
- uses: FirebaseExtended/action-hosting-deploy@v0
  with:
    # ...
    target: marketing-target  # for multi-site
    entryPoint: ./packages/marketing  # for monorepos
```

For monorepo setups where the workspace is a subdirectory, `entryPoint` is the path to the workspace that contains `firebase.json`.

## 6. Security

Preview URLs are obscure (`<project>--pr-N-<hash>.web.app`) but **publicly accessible**. Treat them as semi-public:

- Don't put production data behind preview deploys
- If review requires login, use Firebase Auth or front the site with IAP (Identity-Aware Proxy on Google Cloud)
- Don't enable preview deploys for fork PRs unless you've audited the workflow for secrets exposure

## 7. Common mistakes

- **Forgetting `--expires`.** Channels default to 7 days. If you want them gone immediately on PR merge, add a step to delete the channel.
- **Building inside the action.** The official action does NOT run your build — you must build first and point to the output directory. Otherwise it deploys an empty site.
- **Service account scope.** If the SA only has Firebase Hosting Admin, fine. If it has wider perms (Owner), a leaked workflow file = full project takeover. Use the narrowest scope.
- **Storing the service account as a regular env var.** It must be a GitHub Secret (encrypted at rest). The init flow does this for you; don't shortcut by pasting into `env:`.
