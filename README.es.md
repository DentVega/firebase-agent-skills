<h1 align="center">
  <img src="./assets/logo.svg" width="64" alt="" style="vertical-align: middle"/><br/>
  Firebase Agent Skills (Comunidad)
</h1>

Colección de [Agent Skills](https://agentskills.io/home) para asistentes de código con IA (Claude Code, Cursor, Gemini CLI, GitHub Copilot) que les enseñan a integrar Firebase en proyectos nuevos — incluyendo flujos de **Expo / React Native** que el paquete oficial [`firebase/agent-skills`](https://github.com/firebase/agent-skills) todavía no cubre.

> 🇬🇧 [English version](./README.md)

## Skills incluidas

| Skill | Qué enseña |
|---|---|
| `firebase-auth` | Email/contraseña, Google y Apple Sign-In — aprovisionamiento, uso del SDK y seguridad |
| `firebase-firestore` | Creación de la base, reglas de seguridad, modelado de datos y patrones de queries |
| `firebase-cloud-functions` | Escribir, emular localmente y desplegar Cloud Functions (v2) |
| `firebase-expo` | Integrar Firebase en apps Expo / React Native con los config plugins de `@react-native-firebase` y EAS Build |
| `firebase-storage` | Cloud Storage — buckets, reglas, upload/download (web + RN), signed URLs, Expo ImagePicker |
| `firebase-messaging` | Push notifications con FCM — setup APNs/Android, tokens, topics, envío desde Cloud Functions, deep links |
| `firebase-crashlytics` | Reporte de crashes en RN — install, captura de errores JS, user IDs, breadcrumbs, source maps, dSYMs |
| `firebase-app-check` | Protección contra abuso del backend — Play Integrity, App Attest, reCAPTCHA Enterprise, enforcement por producto |
| `firebase-remote-config` | Feature flags y parámetros dinámicos — defaults, targeting, A/B tests, rollouts graduales |
| `firebase-analytics` | Eventos custom, user properties, consentimiento ATT en iOS, DebugView, export a BigQuery |
| `firebase-ai-logic` | Gemini en apps cliente vía Firebase AI Logic — multimodal, streaming, JSON estructurado, chat |
| `firebase-emulators` | Local Emulator Suite — setup, conexión del cliente, seed import/export, uso en CI, tests de reglas |
| `firebase-hosting` | Hosting estático / SPA / Next.js — preview channels, redirects, headers personalizados, multi-site |
| `firebase-realtime-database` | RTDB para presence, chat de baja latencia, estado efímero — reglas, `onDisconnect`, fan-out indexes |
| `firebase-cost-optimization` | Auditoría cross-cutting y reducción de Firestore reads, Functions GB-s, Storage egress, AI Logic tokens |
| `firebase-architecture` | SOLID para apps Firebase + RN — hooks, services, patrón Repository, cuándo cada nivel de abstracción vale la pena |

## Instalación

### Universal (recomendado)

Funciona con Claude Code, Cursor, GitHub Copilot y cualquier otra herramienta que soporte el formato [Agent Skills](https://agentskills.io):

```bash
npx skills add DentVega/firebase-agent-skills
```

### Gemini CLI

```bash
gemini extensions install https://github.com/DentVega/firebase-agent-skills
```

### Claude Code (como plugin)

```bash
claude plugin marketplace add DentVega/firebase-agent-skills
claude plugin install firebase-extras@firebase-extras
```

## Cómo funcionan las skills

Cada skill es una carpeta en `skills/<nombre-skill>/` que contiene:

- `SKILL.md` — frontmatter YAML (`name`, `description`, `compatibility`) más las instrucciones que lee el agente
- `references/` — guías largas que se cargan solo cuando hacen falta (progressive disclosure)

El agente lee la `description` de cada skill y decide si la tarea actual coincide. Mantén las descripciones específicas y orientadas a la acción — eso es lo que hace que se activen correctamente.

## Velo en acción

[**DentVega/firebase-skills-example**](https://github.com/DentVega/firebase-skills-example) — proyecto Expo + Firebase de referencia que muestra qué genera un agente cuando sigue estas skills. Routing con guardas de auth, sign-in con email + Google, todos en Firestore en tiempo real con reglas seguras, más una callable function v2.

## Por qué existe este repo vs. el oficial

El oficial [`firebase/agent-skills`](https://github.com/firebase/agent-skills) cubre escenarios web-first (App Hosting, Hosting, Data Connect). Este repo se enfoca en:

- **Flujos mobile-first** (Expo / React Native / EAS)
- Skills que orquestan **varios productos Firebase juntos** para patrones comunes de apps
- Una alternativa **mantenida por la comunidad** que puedes forkear y extender por proyecto

## Contribuir

Los PRs son bienvenidos. Las skills nuevas deberían:

1. Vivir bajo `skills/<nombre-en-kebab-case>/SKILL.md`
2. Tener una `description` que empiece con un verbo y diga claramente *cuándo* debe activarse la skill
3. Preferir `npx -y firebase-tools@latest <cmd>` en vez de asumir que el CLI está instalado globalmente
4. Mover el contenido largo a `references/*.md` para que el `SKILL.md` principal sea fácil de escanear

## Licencia

MIT — ver [LICENSE](./LICENSE).
