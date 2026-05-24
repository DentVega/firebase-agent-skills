#!/usr/bin/env node
/**
 * Validate every skill in skills/* and every top-level manifest.
 * Exits non-zero on any failure so CI blocks the PR.
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

  // Required fields
  if (!data.name) err(skillFile, "frontmatter missing `name`");
  if (!data.description) err(skillFile, "frontmatter missing `description`");

  // name must match directory
  if (data.name && data.name !== skillName) {
    err(skillFile, `frontmatter name="${data.name}" must match directory "${skillName}"`);
  }

  // Description quality
  if (data.description) {
    const desc = String(data.description).trim();
    if (desc.length < MIN_DESCRIPTION_LEN) {
      err(skillFile,
        `description is ${desc.length} chars — minimum ${MIN_DESCRIPTION_LEN} for reliable model triggering`);
    }
  }

  // References: every relative link must resolve
  const refLinks = [...body.matchAll(/\]\((references\/[^)]+)\)/g)].map((m) => m[1]);
  for (const link of refLinks) {
    const target = join(skillDir, link);
    if (!existsSync(target)) {
      err(skillFile, `broken reference link: ${link}`);
    }
  }

  // Warn if SKILL.md has no body (only frontmatter)
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
  console.log("Warnings:");
  warnings.forEach((w) => console.log("  " + w));
  console.log();
}

if (errors.length) {
  console.log("Errors:");
  errors.forEach((e) => console.log("  " + e));
  console.log(`\n${errors.length} error(s) — see above`);
  process.exit(1);
}

console.log(`✓ ${skillDirs.length} skills valid, all manifests parse`);
