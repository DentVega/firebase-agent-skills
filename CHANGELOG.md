# Changelog

All notable changes to this package are documented here. The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [SemVer](https://semver.org/).

Versions are also reflected in `package.json` and `.claude-plugin/plugin.json`.

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
