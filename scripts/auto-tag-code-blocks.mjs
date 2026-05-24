#!/usr/bin/env node
/**
 * One-shot: walk every .md under skills/ and add a language tag to any
 * fenced code block opened with a bare ```. Heuristic based on content.
 * Run with: node scripts/auto-tag-code-blocks.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");

function detectLang(content) {
  const c = content.trim();

  // JSON: starts with { or [
  if (/^[\s\n]*[{[]/.test(c) && /[}\]]$/.test(c)) return "json";

  // Shell: starts with a shell command we know
  if (/^(npx|npm|yarn|pnpm|bun|git|cd|mkdir|ls|cat|export|brew|gcloud|gsutil|adb|xcrun|eas|expo|node|firebase|chmod|rm|cp|mv)\b/m.test(c)) return "bash";

  // Firestore rules
  if (/^rules_version\s*=/.test(c) || /^service\s+(cloud\.firestore|firebase\.storage)/m.test(c)) return "firestore-rules";

  // YAML: top-level "key: value" lines, common in workflow snippets
  if (/^[a-zA-Z_-]+:\s/m.test(c) && !c.includes("=>") && !c.includes(";") && !c.includes("(")) return "yaml";

  // TypeScript / JavaScript heuristics
  if (/\b(import|export|const|let|function|await|async|interface|type)\b/.test(c)) return "ts";

  // JSX/TSX
  if (/<[A-Z][a-zA-Z]*\s|<\/[A-Z][a-zA-Z]*>/.test(c)) return "tsx";

  // Default: leave untagged (probably intentional plain text)
  return null;
}

function processFile(filePath) {
  const source = readFileSync(filePath, "utf8");
  let changed = false;
  let tagged = 0;

  // Find all fence pairs; only modify openers that have NO language tag.
  const out = source.replace(/```([^\n]*)\n([\s\S]*?)\n```/g, (match, opener, content) => {
    if (opener.trim() !== "") return match; // already tagged
    const lang = detectLang(content);
    if (!lang) return match;
    changed = true;
    tagged++;
    return "```" + lang + "\n" + content + "\n```";
  });

  if (changed) {
    writeFileSync(filePath, out);
    console.log(`  tagged ${tagged} block(s) in ${filePath.replace(ROOT + "/", "")}`);
  }
  return tagged;
}

function walk(dir) {
  let total = 0;
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    const s = statSync(p);
    if (s.isDirectory()) {
      total += walk(p);
    } else if (entry.endsWith(".md")) {
      total += processFile(p);
    }
  }
  return total;
}

if (!statSync(SKILLS_DIR).isDirectory()) {
  console.error("skills/ not found");
  process.exit(1);
}

const total = walk(SKILLS_DIR);
console.log(`\nDone. Tagged ${total} code block(s).`);
