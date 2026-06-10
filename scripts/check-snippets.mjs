#!/usr/bin/env node
/**
 * Opt-in compile check for TypeScript code snippets in skill markdown.
 *
 * A snippet is checked only when its opening fence carries the marker
 * `// @verify` on the SAME line as the language tag:
 *
 *   ```ts // @verify
 *   ...
 *   ```
 *
 * The snippet is written to scripts/snippets/extracted/<skill>-<n>.ts, then
 * the whole directory is type-checked with `tsc --noEmit` using a relaxed
 * tsconfig and the ambient declarations in ambient.d.ts.
 *
 * The marker convention means authors opt snippets in once they're confident
 * the snippet stands alone — illustrative excerpts stay un-checked instead
 * of producing noise.
 */
import { execSync } from "node:child_process";
import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");
const SNIPPETS_DIR = join(ROOT, "scripts/snippets");
const EXTRACTED_DIR = join(SNIPPETS_DIR, "extracted");

function* walkMd(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) yield* walkMd(p);
    else if (entry.endsWith(".md")) yield p;
  }
}

function extractFrom(filePath) {
  const source = readFileSync(filePath, "utf8");
  // Match opening fence `…```ts <rest of line>` then body up to closing ```
  const re = /```(ts|tsx)\s*([^\n]*)\n([\s\S]*?)\n```/g;
  const snippets = [];
  let match;
  let idx = 0;
  while ((match = re.exec(source)) !== null) {
    const [, lang, opener, content] = match;
    if (!/@verify\b/.test(opener)) continue;
    snippets.push({ lang, content, idx: idx++ });
  }
  return snippets;
}

function clean(dir) {
  if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
}

clean(EXTRACTED_DIR);

let total = 0;
const filesByMd = new Map();
for (const md of walkMd(SKILLS_DIR)) {
  const snippets = extractFrom(md);
  if (snippets.length === 0) continue;
  filesByMd.set(md, snippets);
  const slug = relative(SKILLS_DIR, md).replace(/[\\/]/g, "__").replace(/\.md$/, "");
  for (const s of snippets) {
    const fileName = `${slug}-${s.idx}.${s.lang}`;
    writeFileSync(join(EXTRACTED_DIR, fileName), s.content);
    total++;
  }
}

if (total === 0) {
  console.log("No snippets tagged `// @verify` found — nothing to check.");
  console.log("Add the marker to an opening fence to opt a snippet in:");
  console.log("  ```ts // @verify");
  process.exit(0);
}

console.log(`Compile-checking ${total} snippet(s) from ${filesByMd.size} file(s)...\n`);

try {
  execSync(`npx tsc -p ${join(SNIPPETS_DIR, "tsconfig.json")}`, {
    stdio: "inherit",
    cwd: ROOT,
  });
  console.log(`\n✓ All ${total} verified snippet(s) compile clean.`);
} catch {
  console.log(`\n✗ Snippet compile check failed — see TypeScript errors above.`);
  process.exit(1);
}
