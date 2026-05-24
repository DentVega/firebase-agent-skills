#!/usr/bin/env node
/**
 * Validate every skill in skills/* and every top-level manifest.
 *
 * Two severity levels:
 *   ERROR — blocks CI (structural issues that break the package)
 *   WARN  — surfaced but doesn't block (style / quality issues)
 */
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SKILLS_DIR = join(ROOT, "skills");
const MIN_DESCRIPTION_LEN = 80;

const errors = [];
const warnings = [];

function err(file, msg) {
  errors.push(`✗ ${relative(ROOT, file)}: ${msg}`);
}
function warn(file, msg) {
  warnings.push(`⚠ ${relative(ROOT, file)}: ${msg}`);
}

// -- Frontmatter parsing ----------------------------------------------------

function extractFrontmatter(source) {
  if (!source.startsWith("---\n")) return null;
  const end = source.indexOf("\n---", 4);
  if (end === -1) return null;
  const yamlBlock = source.slice(4, end);
  try {
    return { data: yaml.load(yamlBlock), body: source.slice(end + 4) };
  } catch (e) {
    return { error: e.message };
  }
}

// -- Description quality heuristics -----------------------------------------

// Whitelist of acceptable verbs the description can start with. Add new ones
// as new skills introduce them — we want to *encourage* a consistent voice.
const VERB_WHITELIST = new Set([
  "sets", "configures", "integrates", "adds", "protects", "provisions",
  "scaffolds", "runs", "manages", "implements", "wires", "installs",
  "deploys", "generates", "handles", "builds", "creates", "validates",
  "documents", "optimizes", "audits", "monitors", "tests", "logs",
  "stores", "queries", "syncs",
]);

function descriptionStartsWithVerb(desc) {
  const firstWord = desc.trim().split(/\s+/)[0]?.toLowerCase().replace(/[.,]$/, "");
  return firstWord && VERB_WHITELIST.has(firstWord);
}

function descriptionHasTriggerClause(desc) {
  return /\buse\s+(this\s+skill\s+)?(when|whenever|for)\b/i.test(desc);
}

// -- Body checks ------------------------------------------------------------

function hasCommonMistakesSection(body) {
  return /^#+\s*.*common\s+mistakes/im.test(body);
}

function codeBlocksWithoutLang(body) {
  // Match full fenced pairs so we don't count closing fences. Capture only
  // the opener's language tag (whatever follows the opening ```).
  const matches = [...body.matchAll(/```([^\n]*)\n[\s\S]*?\n```/g)];
  return matches.filter((m) => m[1].trim() === "").length;
}

function bareFirebaseInvocations(body) {
  // Lines inside bash blocks that call `firebase` without `npx`.
  const bashBlocks = [...body.matchAll(/```(?:bash|sh|shell)\n([\s\S]*?)\n```/g)];
  const offenders = [];
  for (const block of bashBlocks) {
    const lines = block[1].split("\n");
    for (const line of lines) {
      const trimmed = line.replace(/^\$\s*/, "").trim();
      // Match `firebase <something>` at start, but NOT npx wrappers or paths
      if (/^firebase\b/.test(trimmed) && !/firebase-tools/.test(trimmed)) {
        offenders.push(trimmed);
      }
    }
  }
  return offenders;
}

// -- Per-skill validation ---------------------------------------------------

function validateSkill(skillDir) {
  const skillName = skillDir.split("/").pop();
  const skillFile = join(skillDir, "SKILL.md");

  if (!existsSync(skillFile)) {
    err(skillDir, "missing SKILL.md");
    return;
  }

  const source = readFileSync(skillFile, "utf8");
  const fm = extractFrontmatter(source);

  if (!fm) {
    err(skillFile, "no YAML frontmatter found (must start with `---`)");
    return;
  }
  if (fm.error) {
    err(skillFile, `invalid YAML frontmatter: ${fm.error}`);
    return;
  }

  const { data, body } = fm;

  // ERROR: required fields
  if (!data.name) err(skillFile, "frontmatter missing `name`");
  if (!data.description) err(skillFile, "frontmatter missing `description`");

  // ERROR: name must match directory
  if (data.name && data.name !== skillName) {
    err(skillFile, `frontmatter name="${data.name}" must match directory "${skillName}"`);
  }

  // Description quality
  if (data.description) {
    const desc = String(data.description).trim();

    // ERROR: minimum length for reliable model triggering
    if (desc.length < MIN_DESCRIPTION_LEN) {
      err(skillFile,
        `description is ${desc.length} chars — minimum ${MIN_DESCRIPTION_LEN} for reliable model triggering`);
    }

    // ERROR: must start with capital
    if (!/^[A-Z]/.test(desc)) {
      err(skillFile, "description must start with a capital letter");
    }

    // WARN: should start with an approved verb
    if (!descriptionStartsWithVerb(desc)) {
      warn(skillFile,
        `description doesn't start with a known action verb (got "${desc.split(/\s+/)[0]}") — see CONTRIBUTING.md "Writing a great description"`);
    }

    // WARN: should include a "Use when/whenever/for" trigger clause
    if (!descriptionHasTriggerClause(desc)) {
      warn(skillFile,
        "description is missing a 'Use when/whenever/for ...' trigger clause — the model relies on this to know when to activate");
    }
  }

  // ERROR: references/* links must resolve
  const refLinks = [...body.matchAll(/\]\((references\/[^)]+)\)/g)].map((m) => m[1]);
  for (const link of refLinks) {
    const target = join(skillDir, link);
    if (!existsSync(target)) {
      err(skillFile, `broken reference link: ${link}`);
    }
  }

  // WARN: should have a "Common mistakes" section
  if (!hasCommonMistakesSection(body)) {
    warn(skillFile,
      "SKILL.md is missing a 'Common mistakes' section — this is the highest-value content for an agent");
  }

  // WARN: code blocks without language tag (hurts syntax highlighting + parsing)
  const untaggedBlocks = codeBlocksWithoutLang(body);
  if (untaggedBlocks > 0) {
    warn(skillFile,
      `${untaggedBlocks} fenced code block(s) without a language tag (use \`\`\`bash, \`\`\`ts, \`\`\`json, etc.)`);
  }

  // WARN: bare `firebase` invocations in bash blocks (should use npx -y firebase-tools@latest)
  const bareCmds = bareFirebaseInvocations(body);
  if (bareCmds.length > 0) {
    warn(skillFile,
      `${bareCmds.length} bash invocation(s) using bare \`firebase\` instead of \`npx -y firebase-tools@latest\` (first: "${bareCmds[0]}")`);
  }

  // WARN: suspiciously short body
  if (body.trim().length < 100) {
    warn(skillFile, "SKILL.md body is suspiciously short");
  }
}

// -- JSON manifest validation -----------------------------------------------

function validateJson(file) {
  if (!existsSync(file)) {
    err(file, "missing");
    return;
  }
  try {
    JSON.parse(readFileSync(file, "utf8"));
  } catch (e) {
    err(file, `invalid JSON: ${e.message}`);
  }
}

// -- Run --------------------------------------------------------------------

if (!existsSync(SKILLS_DIR)) {
  console.error("✗ skills/ directory missing");
  process.exit(1);
}

const skillDirs = readdirSync(SKILLS_DIR)
  .map((name) => join(SKILLS_DIR, name))
  .filter((p) => statSync(p).isDirectory());

if (skillDirs.length === 0) {
  console.error("✗ no skills found");
  process.exit(1);
}

console.log(`Validating ${skillDirs.length} skills...\n`);
for (const dir of skillDirs) validateSkill(dir);

console.log("Validating manifests...\n");
validateJson(join(ROOT, ".claude-plugin/plugin.json"));
validateJson(join(ROOT, ".claude-plugin/marketplace.json"));
validateJson(join(ROOT, "gemini-extension.json"));
validateJson(join(ROOT, ".mcp.json"));

if (warnings.length) {
  console.log(`Warnings (${warnings.length}):`);
  warnings.forEach((w) => console.log("  " + w));
  console.log();
}

if (errors.length) {
  console.log(`Errors (${errors.length}):`);
  errors.forEach((e) => console.log("  " + e));
  console.log(`\n${errors.length} error(s) — failing.`);
  process.exit(1);
}

console.log(`✓ ${skillDirs.length} skills valid, all manifests parse`);
if (warnings.length > 0) {
  console.log(`(${warnings.length} warning(s) — review above)`);
}
