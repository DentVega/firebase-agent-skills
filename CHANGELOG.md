# Changelog

All notable changes to this package are documented here. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [SemVer](https://semver.org/).

Versions are also reflected in `package.json` and `.claude-plugin/plugin.json`.

## [0.3.0] — 2026-06-10

### Added

- New skill **`firebase-hosting`** — static / SPA / Next.js hosting, preview channels with auto-PR comments, redirects, custom headers, multi-site, SSR via Cloud Functions. Includes a CI-focused reference for the `FirebaseExtended/action-hosting-deploy` setup.
- New skill **`firebase-cost-optimization`** — cross-cutting audit + reduction across Firestore reads, Functions GB-seconds, Storage egress, AI Logic tokens. Triggers on billing / quota questions. Quarterly audit checklist included.
- New skill **`firebase-realtime-database`** — presence with `onDisconnect`, low-latency chat, JSON-tree rules, fan-out indexes for queries Firestore can't express. Clear "RTDB vs Firestore" decision matrix.
- **Minimum viable example section** prepended to every SKILL.md (15 skills). A 5-10 line snippet at the top showing the smallest working pattern — gives the agent an anchor for what success looks like before reading the rest of the skill.
- **Mermaid diagrams** in three high-value references: auth state lifecycle (`firebase-auth/references/react-native.md`), FCM message lifecycle across app states (`firebase-messaging/references/notification-channels.md`), and App Check token exchange flow (`firebase-app-check/references/debug-tokens.md`).
- **Opt-in TypeScript compile check** for code samples via `// @verify` marker on the opening fence. `scripts/check-snippets.mjs` extracts tagged snippets, type-checks against a relaxed tsconfig with `firebase` / `firebase-admin` / `firebase-functions` real types and stubbed `@react-native-firebase/*` modules. Initial coverage: 8 verified snippets (all MVE blocks).
- **Scaffolding scripts** under `scripts/scaffold/` — `auth-screen.mjs`, `callable-function.mjs`, `firestore-rules.mjs`. SKILL.md files now point at the scaffolds as the recommended way to generate canonical boilerplate.
- **Logo + social preview** under `assets/`. Logo is a Firebase-flame mark with skill sparkles. Social preview is a 1280×640 SVG sized for GitHub's og:image — see `assets/README.md` for conversion + upload instructions.
- **Screencast script** at `docs/screencast-script.md` — a 90-second shot list / narration for recording a demo to embed in the README.
- **CI** now runs `check:snippets` after `validate`. `npm run check:all` runs both locally.

### Changed

- `firebase-auth`, `firebase-cloud-functions`, `firebase-firestore` SKILL.md now include a "Scaffold a …" subsection pointing at the matching scaffold script.
- `README.md` and `README.es.md` now display the logo in the title block.

## [0.2.0] — 2026-05-24

### Added

- New skill **`firebase-emulators`** — dedicated guide for the local emulator suite, client connection from web and Expo/RN, seeding via import/export, `emulators:exec` for CI, and `@firebase/rules-unit-testing` reference.
- New skill **`firebase-storage`** — buckets, security rules with size/contentType caps, signed URLs from Cloud Functions, plus reference for Expo ImagePicker integration with `putFile`.
- New skill **`firebase-messaging`** — FCM push setup for iOS (APNs) and Android, foreground / background / quit handlers, token arrays with pruning on send failure, plus reference covering Android channels, custom sounds, rich notifications, and action buttons.
- New skill **`firebase-crashlytics`** — install, JS error capture via `recordError`, user IDs, breadcrumbs, source maps, dSYMs, plus troubleshooting reference.
- New skill **`firebase-app-check`** — Play Integrity / App Attest / reCAPTCHA Enterprise setup, enforcement per product, plus debug-token playbook for CI and team rotation.
- New skill **`firebase-remote-config`** — defaults, targeting by audience, gradual rollouts, plus a rollout playbook reference (internal → 1% → A/B → 100% with rollback runbook).
- New skill **`firebase-analytics`** — events, user properties, iOS ATT consent, DebugView, BigQuery export, plus Google Consent Mode v2 reference for EEA/UK/CH.
- New skill **`firebase-ai-logic`** — Gemini in client apps, multimodal, streaming, structured JSON output, chat sessions, plus function calling reference with security guidance.
- **Stricter validator** — now checks description starts with a known action verb, includes a "Use when/whenever/for" trigger clause, and that every SKILL.md has a "Common mistakes" section. Code blocks must have a language tag; bash invocations of `firebase` must go through `npx -y firebase-tools@latest`.
- **`scripts/auto-tag-code-blocks.mjs`** — one-shot helper that heuristically adds language tags to untagged fenced code blocks.
- **GitHub Actions workflow** runs the validator on every push and PR.
- **CONTRIBUTING.md**, issue forms (`new-skill`, `skill-bug`), PR template.
- **Topics** on the GitHub repo for discoverability.

### Changed

- `firebase-auth` and `firebase-firestore` SKILL.md now have explicit "Common mistakes" sections, replacing scattered "Universal patterns" callouts.
- All code blocks across every skill now have explicit language tags.
- README tables and `FIREBASE.md` routing cheat-sheet updated for the 8 new skills.

## [0.1.0] — 2026-05-24

Initial release.

### Added

- Four foundation skills: `firebase-auth`, `firebase-firestore`, `firebase-cloud-functions`, `firebase-expo`.
- Multi-tool manifests: `.claude-plugin/{plugin,marketplace}.json`, `gemini-extension.json`, `.mcp.json`.
- Bilingual READMEs (English + Spanish).
- Initial validator covering frontmatter, required fields, name/directory matching, minimum description length, and broken reference links.
