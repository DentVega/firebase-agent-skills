# Emulators in CI and rules unit tests

## Running tests in CI (GitHub Actions)

```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: "20", cache: "npm" }
      - uses: actions/setup-java@v4
        with: { distribution: "temurin", java-version: "17" }

      - run: npm ci
      - name: Run tests against emulators
        run: npx -y firebase-tools@latest emulators:exec --only firestore,auth,functions "npm test"
```

`emulators:exec` starts the emulators, runs the command, and tears them down on exit (success or failure). Tests get a clean state every run.

For faster runs across many PRs, cache the emulator JARs:

```yaml
      - uses: actions/cache@v4
        with:
          path: ~/.cache/firebase/emulators
          key: emulators-${{ hashFiles('firebase.json') }}
```

## Rules unit tests

`@firebase/rules-unit-testing` is the canonical way to test Firestore security rules. It runs against the Firestore emulator with no auth context, so you can assert which operations are allowed and denied for which users.

```bash
npm install --save-dev @firebase/rules-unit-testing
```

```ts
// tests/firestore.rules.test.ts
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { readFileSync } from "node:fs";
import { setDoc, doc, getDoc } from "firebase/firestore";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-test",
    firestore: {
      host: "127.0.0.1",
      port: 8080,
      rules: readFileSync("firestore.rules", "utf8"),
    },
  });
});

afterAll(() => env.cleanup());
beforeEach(() => env.clearFirestore());

describe("users collection", () => {
  it("lets a user read their own doc", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertSucceeds(getDoc(doc(alice, "users/alice")));
  });

  it("blocks reading someone else's doc", async () => {
    const alice = env.authenticatedContext("alice").firestore();
    await assertFails(getDoc(doc(alice, "users/bob")));
  });

  it("lets an unauthenticated user do nothing", async () => {
    const anon = env.unauthenticatedContext().firestore();
    await assertFails(getDoc(doc(anon, "users/alice")));
  });
});
```

Run via:

```bash
npx -y firebase-tools@latest emulators:exec --only firestore "npm test"
```

### Seeding under admin context

`assertFails` / `assertSucceeds` exercise rules from a user's perspective. To pre-populate data without rule checks (so your tests have something to read), use the admin context:

```ts
await env.withSecurityRulesDisabled(async (ctx) => {
  await setDoc(doc(ctx.firestore(), "users/alice"), { name: "Alice" });
});
```

This is the only way to set up state that violates your own rules during a test (e.g. a doc owned by user X that you want user Y to fail to read).

## E2E tests in CI

For full app E2E (Playwright web, Maestro mobile), the same `emulators:exec` pattern works:

```bash
npx -y firebase-tools@latest emulators:exec \
  --only firestore,auth,functions,storage \
  --import=./e2e-seed \
  "npx playwright test"
```

The `--import` flag preloads the emulator with fixture data so tests start from a known state.

## Common mistakes

- **Using a real project ID in tests.** Always use `projectId: "demo-<anything>"` — the `demo-` prefix tells Firebase emulators to refuse any accidental production connection.
- **Forgetting `clearFirestore()` between tests.** State leaks; tests pass individually but fail together.
- **Asserting rules without exercising the SDK.** A rule check that uses `request.resource.data` only fires on actual writes — manually constructing the `request` won't catch it. Always trigger through the client SDK.
- **Running rules tests without the Firestore emulator.** Tests will hang or hit production. Use `emulators:exec` so a missing emulator fails the run immediately.
