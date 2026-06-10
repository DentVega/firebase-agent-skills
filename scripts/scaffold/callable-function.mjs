#!/usr/bin/env node
/**
 * Scaffold a v2 callable Cloud Function with the canonical auth check.
 *
 *   node scripts/scaffold/callable-function.mjs --out functions/src/index.ts --name doThing
 */
import { writeFileSync, mkdirSync, existsSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    out:    { type: "string", short: "o" },
    name:   { type: "string", short: "n" },
    region: { type: "string", default: "us-central1" },
    force:  { type: "boolean", default: false },
    append: { type: "boolean", default: false },
    help:   { type: "boolean", default: false },
  },
  strict: false,
});

if (values.help || !values.out || !values.name) {
  console.log(`Usage: callable-function.mjs --out <path> --name <fnName> [options]

Writes a v2 callable function skeleton with the canonical \`request.auth\` check.

Required:
  --out <path>     Output file (e.g. functions/src/index.ts)
  --name <name>    Function name (camelCase)

Optional:
  --region <r>     Default us-central1
  --append         Append to file instead of replacing (use to add multiple fns)
  --force          Overwrite existing file (ignored when --append is set)
`);
  process.exit(values.help ? 0 : 1);
}

if (!/^[a-z][a-zA-Z0-9]*$/.test(values.name)) {
  console.error(`✗ --name must be camelCase identifier. Got: ${values.name}`);
  process.exit(1);
}

const HEADER = `import { initializeApp, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";

if (getApps().length === 0) initializeApp();
`;

const FN = `
export const ${values.name} = onCall(
  { region: "${values.region}" },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Sign-in required");
    }
    const uid = request.auth.uid;

    // TODO: implement
    // const db = getFirestore();
    // await db.collection("...").doc(uid).update({ ... });

    return { ok: true };
  },
);
`;

const exists = existsSync(values.out);

if (exists && !values.append && !values.force) {
  console.error(`✗ ${values.out} already exists. Pass --append to add, or --force to overwrite.`);
  process.exit(1);
}

mkdirSync(dirname(values.out), { recursive: true });

if (values.append && exists) {
  const current = readFileSync(values.out, "utf8");
  if (current.includes(`export const ${values.name} =`)) {
    console.error(`✗ Function "${values.name}" already exists in ${values.out}`);
    process.exit(1);
  }
  writeFileSync(values.out, current.replace(/\n+$/, "") + "\n" + FN);
  console.log(`✓ appended ${values.name} to ${values.out}`);
} else {
  writeFileSync(values.out, HEADER + FN);
  console.log(`✓ wrote ${values.out}`);
}

console.log(`
Next steps:
  1. Build:   cd functions && npm install && npm run build
  2. Test:    npx -y firebase-tools@latest emulators:start --only functions
  3. Deploy:  npx -y firebase-tools@latest deploy --only functions:${values.name}

Client side:
  import { getFunctions, httpsCallable } from "firebase/functions";
  const fn = httpsCallable(getFunctions(), "${values.name}");
  const { data } = await fn({ /* args */ });
`);
