<h1 align="center">
  <img src="./assets/logo.svg" width="64" alt="" style="vertical-align: middle"/><br/>
  Firebase Agent Skills (Community)
</h1>

A collection of [Agent Skills](https://agentskills.io/home) for AI coding assistants (Claude Code, Cursor, Gemini CLI, GitHub Copilot) that teach them how to integrate Firebase into new projects — including **Expo / React Native** workflows that the official [`firebase/agent-skills`](https://github.com/firebase/agent-skills) package does not yet cover.

> 🇪🇸 [Versión en español](./README.es.md)

## Included skills

| Skill | What it teaches |
|---|---|
| `firebase-auth` | Email/password, Google, and Apple sign-in — provisioning, client SDK usage, and security |
| `firebase-firestore` | Database provisioning, security rules, data modeling, and query patterns |
| `firebase-cloud-functions` | Writing, locally emulating, and deploying Cloud Functions (v2) |
| `firebase-expo` | Integrating Firebase into Expo / React Native apps with `@react-native-firebase` config plugins and EAS Build |
| `firebase-storage` | Cloud Storage — buckets, security rules, upload/download (web + RN), signed URLs, Expo ImagePicker |
| `firebase-messaging` | FCM push notifications — APNs/Android setup, tokens, topics, sending from Cloud Functions, deep links |
| `firebase-crashlytics` | Crash reporting on RN — install, JS error capture, user IDs, breadcrumbs, source maps, dSYMs |
| `firebase-app-check` | Backend abuse protection — Play Integrity, App Attest, reCAPTCHA Enterprise, enforcement per product |
| `firebase-remote-config` | Feature flags and dynamic params — defaults, targeting, A/B tests, gradual rollouts |
| `firebase-analytics` | Custom events, user properties, iOS ATT consent, DebugView, BigQuery export |
| `firebase-ai-logic` | Gemini in client apps via Firebase AI Logic — multimodal, streaming, structured JSON, chat |
| `firebase-emulators` | Local Emulator Suite — setup, client wiring, seed import/export, CI usage, rules unit tests |
| `firebase-hosting` | Static / SPA / Next.js hosting — preview channels, redirects, custom headers, multi-site |
| `firebase-realtime-database` | RTDB for presence, low-latency chat, ephemeral state — rules, `onDisconnect`, fan-out indexes |
| `firebase-cost-optimization` | Cross-cutting audit + reduction of Firestore reads, Functions GB-s, Storage egress, AI Logic tokens |

## Installation

### Universal (recommended)

Works with Claude Code, Cursor, GitHub Copilot, and any other tool that supports the [Agent Skills](https://agentskills.io) format:

```bash
npx skills add DentVega/firebase-agent-skills
```

### Gemini CLI

```bash
gemini extensions install https://github.com/DentVega/firebase-agent-skills
```

### Claude Code (as plugin)

```bash
claude plugin marketplace add DentVega/firebase-agent-skills
claude plugin install firebase-extras@firebase-extras
```

## How skills work

Each skill is a folder under `skills/<skill-name>/` containing:

- `SKILL.md` — YAML frontmatter (`name`, `description`, `compatibility`) plus the instructions the agent reads
- `references/` — longer guides loaded only when needed (progressive disclosure)

The agent reads each skill's `description` and decides whether the current task matches. Keep descriptions specific and action-oriented — that is what drives correct triggering.

## See it in action

[**DentVega/firebase-skills-example**](https://github.com/DentVega/firebase-skills-example) — a reference Expo + Firebase project showing what an agent produces when guided by these skills. Auth-gated routing, email + Google sign-in, real-time Firestore todos with secure rules, plus a v2 callable function.

## Why this exists vs. the official repo

The official [`firebase/agent-skills`](https://github.com/firebase/agent-skills) covers web-first scenarios (App Hosting, Hosting, Data Connect). This repo focuses on:

- **Mobile-first workflows** (Expo / React Native / EAS)
- Skills that orchestrate **multiple Firebase products together** for common app patterns
- A **community-maintained** alternative you can fork and extend per project

## Contributing

PRs welcome. New skills should:

1. Live under `skills/<kebab-case-name>/SKILL.md`
2. Have a `description` that starts with a verb and clearly states *when* the skill should activate
3. Prefer `npx -y firebase-tools@latest <cmd>` over assuming the CLI is installed globally
4. Move long content into `references/*.md` so the main `SKILL.md` stays scannable

## License

MIT — see [LICENSE](./LICENSE).
