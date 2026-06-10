# Snippet compile check

Opt-in TypeScript compilation check for code samples in skill markdown. A snippet is checked only when its opening fence is tagged with `// @verify`:

````md
```ts // @verify
import auth from "@react-native-firebase/auth";
await auth().signInWithEmailAndPassword(email, password);
```
````

Untagged snippets (illustrative excerpts that reference missing context) stay unchecked.

## How it works

1. `scripts/check-snippets.mjs` walks every `skills/**/*.md`
2. Extracts each `// @verify`-tagged `ts` / `tsx` block to `extracted/<skill>-<n>.ts`
3. Runs `tsc --noEmit` against `extracted/` using `tsconfig.json` here, which uses `ambient.d.ts` to declare common implicit identifiers (`uid`, `email`, `__DEV__`, etc) and stubs the `@react-native-firebase/*` modules.

## Run locally

```bash
npm run check:snippets
```

## When to tag a snippet

Tag with `// @verify` if the snippet:

- Is self-contained (every imported identifier is in the snippet OR in `ambient.d.ts`)
- Represents the canonical pattern for that API (worth catching SDK drift on)
- Would be obviously wrong if it stopped compiling (vs. a partial excerpt where compile error is expected)

The "Minimum viable example" sections at the top of each SKILL.md are the best candidates — they're meant to be self-contained, exemplary, and stable.

## Adding ambient declarations

If a tagged snippet references an identifier the type-checker doesn't know, prefer in this order:

1. Add the missing `import` to the snippet itself if it makes the snippet more accurate
2. Declare in `ambient.d.ts` if it's truly contextual (`uid`, `user`, etc) and adds noise to every snippet
3. Add `// @ts-nocheck` as a last resort

Stub modules for `@react-native-firebase/*` are intentionally typed as `any` so we don't have to maintain real types for native packages that can't fully install in CI without a build. The web SDK (`firebase`) and Admin SDK (`firebase-admin`, `firebase-functions`) types come from the real npm packages.
