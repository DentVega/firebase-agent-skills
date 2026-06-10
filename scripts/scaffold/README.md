# Scaffold scripts

Single-file generators the skills can tell an agent to invoke instead of typing boilerplate from scratch. Faster, less error-prone, and the output is consistent across projects.

## Usage

Each script is invoked directly via `node` and writes one file. They refuse to overwrite existing files unless `--force` is passed.

```bash
node scripts/scaffold/auth-screen.mjs --out app/\(auth\)/sign-in.tsx
node scripts/scaffold/callable-function.mjs --out functions/src/index.ts --name archiveDoneTodos
node scripts/scaffold/firestore-rules.mjs --out firestore.rules
```

For agents using this repo as installed skills, paths are relative to the user's project root, not this repo.

## Available scaffolds

| Script | Output | Skill |
|---|---|---|
| `auth-screen.mjs` | Expo Router `(auth)/sign-in.tsx` with email + Google sign-in | `firebase-auth`, `firebase-expo` |
| `callable-function.mjs` | v2 callable function skeleton with auth check | `firebase-cloud-functions` |
| `firestore-rules.mjs` | Default-deny `firestore.rules` anchored to `request.auth.uid` | `firebase-firestore` |

## Flags

All scripts accept:

- `--out <path>` — required, output file path
- `--force` — overwrite if file exists
- `--help` — print usage

Some scripts have script-specific flags — see the inline help.
