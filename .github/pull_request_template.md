## What this PR does

<!-- One or two sentences. Reference any issues with "Fixes #N". -->

## Scope

- [ ] New skill
- [ ] Edit to existing skill: `<skill-name>`
- [ ] New reference file
- [ ] Docs / tooling / CI only

## Checklist

- [ ] `npm run validate` passes locally
- [ ] If editing a skill, the `description` still starts with a verb and is ≥ 80 chars
- [ ] If adding a new skill, both `README.md` and `README.es.md` tables are updated, plus `FIREBASE.md` routing
- [ ] Every `references/foo.md` linked from a SKILL.md exists
- [ ] No secrets / private project IDs / tokens in code examples
- [ ] Code snippets use `npx -y firebase-tools@latest <cmd>` rather than assuming a global install

## Verification

<!--
How did you verify the change is correct? Examples:
- "Ran the code snippet against a fresh Firebase project — confirmed output X"
- "Cross-checked against Firebase release notes for SDK vX.Y.Z"
- "Asked Claude Code to follow the skill on a fresh project — produced the expected files"
-->
