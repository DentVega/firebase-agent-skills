# 90-second demo screencast — script

This is a tight script for a screencast you can record to embed in the README. Total target length: **90 seconds**. Going over hurts watch-through; going under cuts the demo short.

Record at 1920×1080. Voice optional — captions work fine if you'd rather skip narrating.

---

## Setup before you hit record

- Have two terminal windows side-by-side: one for the shell, one for Claude Code.
- Have a fresh empty directory `~/Desktop/demo-fas` ready.
- Bookmark this script open on your phone or second monitor.
- Disable notifications globally.

Files / state you want on screen:
- `https://github.com/DentVega/firebase-agent-skills` open in a browser tab (for the opening shot)
- The terminal font at ~16pt so it's readable when scaled to YouTube/X thumbnail size.

---

## Shot list

### 0:00 – 0:08 · Hook

**On screen**: GitHub repo page for `firebase-agent-skills`, scroll past the skills table.

**Voiceover / caption**:
> 15 Firebase skills your AI coding agent should know — auth, Firestore, security rules, the gotchas — all in one install.

### 0:08 – 0:20 · Install

**On screen**: Terminal in `~/Desktop/demo-fas`. Type the commands so the viewer sees them appear:

```bash
mkdir demo && cd demo
git clone --depth 1 https://github.com/DentVega/firebase-agent-skills .claude/firebase-agent-skills
ln -s firebase-agent-skills/skills .claude/skills
```

**Voiceover**:
> Drop them into any project's `.claude/skills/` — that's the whole install.

### 0:20 – 0:35 · Open Claude Code

**On screen**: Run `claude` in the same directory. Claude Code opens. The skills list appears (or use `/skills` if needed to show them).

**Voiceover**:
> Now my agent knows 15 specific things about Firebase, not generic LLM training data.

### 0:35 – 0:60 · The prompt

**On screen**: Type into Claude Code:

> Integrate Firebase Auth and Firestore in this Expo app. Email and Google sign-in. Add a todos screen scoped per user with secure rules.

The agent responds, mentioning the skills it's using (`firebase-auth`, `firebase-firestore`, `firebase-expo`). Show it reading SKILL.md, then writing files.

**Voiceover (over the agent working)**:
> It activates the right skills automatically based on the description field. Reads them. Writes code that follows them.

### 0:60 – 0:78 · Show the output

**On screen**: Switch to file tree. Open `firestore.rules`, point at the `request.auth.uid` ownership check. Open the sign-in screen, point at the `webClientId` placeholder note. Open the auth-aware `_layout.tsx`, point at the `onAuthStateChanged` listener.

**Voiceover**:
> Real rules. Not `request.auth != null` everywhere. The exact patterns that survive production.

### 0:78 – 0:88 · The lift

**On screen**: Quick cut back to the skill table on GitHub, with cursor highlighting `firebase-app-check`, `firebase-cost-optimization`, `firebase-ai-logic`.

**Voiceover**:
> Same install, every Firebase product. Adds cost optimization, Gemini integration, App Check — every gotcha I've ever hit, baked in.

### 0:88 – 0:90 · CTA

**On screen**: GitHub URL in big text:

```
github.com/DentVega/firebase-agent-skills
```

**Voiceover**:
> Link in the README. Star it if it helped. Open issues with what's missing.

---

## Production notes

- **Pace**: aim for typed text to appear naturally — too fast and viewers can't read; too slow and watch-through drops. Casey Neistat / Fireship pacing is the reference.
- **No dead air**: cut every pause longer than 0.5s.
- **Caption everything**: most viewers watch muted. Burn in captions (don't rely on YouTube auto-captions).
- **Don't show personal info**: GitHub username is fine, but blur any `~/projects/<other-client>` paths visible in your shell.
- **One take per shot**: rerecord sections; don't try to do it in one continuous take.

## After recording

1. Trim to exactly 90 seconds.
2. Upload to YouTube **unlisted** first; share the link to test before going public.
3. Embed in the main README right under the title:

   ```md
   [![Demo](./assets/demo-thumbnail.png)](https://youtu.be/<id>)
   ```

4. Also drop the unlisted link in `firebase-skills-example`'s README.

## Tools

- **Screen recording**: macOS QuickTime, or [Screen Studio](https://screen.studio) (paid but auto-zooms to cursor — looks great)
- **Editing**: iMovie / DaVinci Resolve / Descript (Descript has auto-captions)
- **Thumbnail**: take a screenshot at 0:60 (the file tree shot), overlay the title text in Figma / Sketch
