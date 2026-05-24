# Contributing

Thanks for wanting to improve these skills. This guide covers how to add a new skill, edit an existing one, and the conventions that make skills actually trigger and run well in real AI agents.

## Quick start

```bash
git clone https://github.com/DentVega/firebase-agent-skills
cd firebase-agent-skills
npm install
npm run validate
```

The validator must pass before any PR is merged — CI runs it on every push.

## Adding a new skill

1. Create `skills/<kebab-case-name>/SKILL.md`. The directory name and the frontmatter `name` field must match exactly.
2. Add YAML frontmatter at the top:

   ```yaml
   ---
   name: firebase-something
   description: >-
     Verb-first sentence explaining what this skill does AND when to use it.
     Mention the specific Firebase products, platforms, and user scenarios
     that should trigger it. Aim for 150-300 characters.
   compatibility: Any prerequisites — required SDKs, paired skills, etc.
   ---
   ```

3. Write the body as scannable, numbered sections. The agent will read the entire file when activated.
4. Move long deep-dives into `references/<topic>.md` and link to them inline from SKILL.md. This is **progressive disclosure** — keeps the main file scannable while making depth available when needed.
5. Update both READMEs (`README.md` and `README.es.md`) with a one-line entry in the skills table.
6. Update `FIREBASE.md` with a one-line routing entry.
7. Run `npm run validate` until it passes.

## Writing a great `description`

The description is the **only** field the model reads to decide whether to activate the skill. It is by far the most important field in the whole file.

✅ Good:
> Sets up Firebase Authentication with email/password, Google Sign-In, and Apple Sign-In. Use this skill whenever the user needs sign-in, sign-up, user sessions, password reset, OAuth providers, or auth-gated routes in a web, React Native, or Expo app.

Why it works: starts with a verb, names the products, names the platforms, lists the trigger phrases a user might say.

❌ Bad:
> Firebase Auth skill.

Why it fails: the model has no signal about when to activate.

Rules:
- Start with an action verb (Sets up, Configures, Integrates, Protects, ...)
- Name the Firebase product(s) explicitly
- Name the platforms (web, Expo, React Native, ...)
- Include a "Use whenever..." clause with the trigger scenarios
- Minimum 80 characters (enforced by CI); 150-300 is the sweet spot

## SKILL.md style

Skills that work well in production tend to share these traits:

- **Numbered sections** — Provisioning, Client SDK, Security, Common mistakes
- **Action-first prose** — "Run X" / "Set Y" / "Never Z", not "It is recommended that..."
- **A "Common mistakes" section at the end** — the highest-value part for the agent. List the non-obvious traps with a one-line explanation each.
- **`npx -y firebase-tools@latest <cmd>`** instead of assuming `firebase` is installed globally
- **Cross-reference other skills** with backticks (e.g. `firebase-app-check`) — agents follow these
- **Code samples** for the exact pattern you want the agent to produce. Include imports.
- **Bold critical warnings** with `**CRITICAL**:` so they're hard to miss

## When to use `references/`

Move content into `references/<topic>.md` when:

- It's a deep dive (1000+ words on one sub-topic)
- It's platform-specific and only applies to some users (e.g. iOS-only setup)
- It's a procedural runbook (rollout playbook, troubleshooting tree)
- It would push SKILL.md past ~500 lines

Keep content in SKILL.md when it's the canonical path every user follows.

Link references inline at the section where they're relevant, not in a footer — agents read top-down and may stop before reaching a footer.

## Editing an existing skill

- **Don't rename a skill directory** without also updating: the frontmatter `name`, both READMEs, FIREBASE.md, and any other skill that cross-references it.
- **When fixing a factual error**, mention what was wrong in the commit message — helps future reviewers verify.
- **When adding a "Common mistake"**, prefer concrete: include the symptom AND the cause, not just "watch out for X".

## Local validation

`npm run validate` checks:

- Every `skills/*/SKILL.md` has valid YAML frontmatter
- `name` is present and matches the directory
- `description` is present and ≥ 80 chars
- Every `[...](references/foo.md)` link resolves to an existing file
- All four top-level JSON manifests parse

Failures block CI. Run it before pushing.

## Commit & PR conventions

- One skill per PR when possible. If you're editing two skills for unrelated reasons, split the PR.
- Commit messages: `<type>(<skill>): <summary>` is a fine pattern — `feat(firebase-auth): document SAML provider setup`.
- Reference issues with `Fixes #N` in the PR body, not the title.

## Language

Skill content is in **English** — the model's training data weight is heavier there, and triggering accuracy benefits. READMEs are bilingual (EN + ES). PR descriptions and issues can be in either language.

## Questions

Open a Discussion or an issue using one of the templates. For security concerns about a skill that could lead an agent astray, please email rather than file a public issue.
