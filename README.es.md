# Firebase Agent Skills (Comunidad)

Colección de [Agent Skills](https://agentskills.io/home) para asistentes de código con IA (Claude Code, Cursor, Gemini CLI, GitHub Copilot) que les enseñan a integrar Firebase en proyectos nuevos — incluyendo flujos de **Expo / React Native** que el paquete oficial [`firebase/agent-skills`](https://github.com/firebase/agent-skills) todavía no cubre.

> 🇬🇧 [English version](./README.md)

## Skills incluidas

| Skill | Qué enseña |
|---|---|
| `firebase-auth` | Email/contraseña, Google y Apple Sign-In — aprovisionamiento, uso del SDK y seguridad |
| `firebase-firestore` | Creación de la base, reglas de seguridad, modelado de datos y patrones de queries |
| `firebase-cloud-functions` | Escribir, emular localmente y desplegar Cloud Functions (v2) |
| `firebase-expo` | Integrar Firebase en apps Expo / React Native con los config plugins de `@react-native-firebase` y EAS Build |

## Instalación

### Universal (recomendado)

Funciona con Claude Code, Cursor, GitHub Copilot y cualquier otra herramienta que soporte el formato [Agent Skills](https://agentskills.io):

```bash
npx skills add TU-USUARIO-GITHUB/firebase-agent-skills
```

### Gemini CLI

```bash
gemini extensions install https://github.com/TU-USUARIO-GITHUB/firebase-agent-skills
```

### Claude Code (como plugin)

```bash
claude plugin marketplace add TU-USUARIO-GITHUB/firebase-agent-skills
claude plugin install firebase-extras@firebase-extras
```

## Cómo funcionan las skills

Cada skill es una carpeta en `skills/<nombre-skill>/` que contiene:

- `SKILL.md` — frontmatter YAML (`name`, `description`, `compatibility`) más las instrucciones que lee el agente
- `references/` — guías largas que se cargan solo cuando hacen falta (progressive disclosure)

El agente lee la `description` de cada skill y decide si la tarea actual coincide. Mantén las descripciones específicas y orientadas a la acción — eso es lo que hace que se activen correctamente.

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
