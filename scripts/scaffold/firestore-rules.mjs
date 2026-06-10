#!/usr/bin/env node
/**
 * Scaffold a default-deny firestore.rules file with owner-scoped patterns.
 * Mirrors the recommendation in the firebase-firestore skill.
 *
 *   node scripts/scaffold/firestore-rules.mjs --out firestore.rules
 */
import { writeFileSync, existsSync } from "node:fs";
import { parseArgs } from "node:util";

const { values } = parseArgs({
  options: {
    out:        { type: "string", short: "o", default: "firestore.rules" },
    collection: { type: "string", default: "items" },
    force:      { type: "boolean", default: false },
    help:       { type: "boolean", default: false },
  },
  strict: false,
});

if (values.help) {
  console.log(`Usage: firestore-rules.mjs [--out firestore.rules] [--collection items]

Writes a default-deny firestore.rules with two patterns:
  - users/{uid} — owner can read/update/delete own doc
  - users/{uid}/<collection>/{itemId} — owner-scoped subcollection with
    write validation (keys whitelist, type checks, server-stamped createdAt)

Required: (none)

Optional:
  --out <path>        Output (default: firestore.rules)
  --collection <name> Subcollection name to scaffold (default: items)
  --force             Overwrite existing file
`);
  process.exit(0);
}

const C = values.collection;
const TEMPLATE = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /users/{userId} {
      allow read, update, delete: if request.auth != null
                                  && request.auth.uid == userId;
      allow create:               if request.auth != null
                                  && request.auth.uid == userId;

      match /${C}/{itemId} {
        allow read, delete: if request.auth != null
                            && request.auth.uid == userId;

        allow create: if request.auth != null
                      && request.auth.uid == userId
                      && request.resource.data.keys().hasOnly(["title", "done", "createdAt"])
                      && request.resource.data.title is string
                      && request.resource.data.title.size() <= 200
                      && request.resource.data.done is bool
                      && request.resource.data.createdAt == request.time;

        allow update: if request.auth != null
                      && request.auth.uid == userId
                      && request.resource.data.diff(resource.data)
                         .affectedKeys().hasOnly(["title", "done"]);
      }
    }
  }
}
`;

if (existsSync(values.out) && !values.force) {
  console.error(`✗ ${values.out} already exists. Pass --force to overwrite.`);
  process.exit(1);
}

writeFileSync(values.out, TEMPLATE);
console.log(`✓ wrote ${values.out}`);
console.log(`
Next steps:
  1. Edit the field whitelist on the create rule to match your schema.
  2. Deploy:
       npx -y firebase-tools@latest deploy --only firestore:rules
  3. Test in the emulator first:
       npx -y firebase-tools@latest emulators:exec --only firestore "npm test"
`);
