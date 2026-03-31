# GitHub publish checklist and safe first release flow

This guide is the exact recommended flow for publishing `pi-discord-bot` safely as a GitHub repository.

---

## Part 1: Pre-publish checklist

Run these from the repo root:

```bash
cd ~/pi-discord-bot
```

### 1. Confirm runtime/private data is not being published
Check that these are **not** intended for publication:
- external workspace contents
- local logs
- local env files
- auth files
- downloaded attachments

Quick check:

```bash
git status --ignored
```

You should see local env/runtime artifacts ignored, and the workspace should not live inside the repo.

### 2. Confirm code is healthy

```bash
npm test
npx tsc --noEmit
```

### 3. Review package metadata placeholders
Open `package.json` and replace:
- `REPLACE_ME` in `repository.url`
- `REPLACE_ME` in `homepage`
- `REPLACE_ME` in `bugs.url`

If you do **not** want npm publishing yet, keep:

```json
"private": true
```

### 4. Confirm docs are publish-ready
Check these files:
- `README.md`
- `docs/operator-env-config.md`
- `docs/publishing-checklist.md`
- `pi-discord-bot.env.example`
- `discord-policy.example.json`
- `pi-discord-bot.service`

### 5. Confirm license choice
This repo currently includes:
- `LICENSE` = MIT

If that is what you want, keep it.

---

## Part 2: Safe GitHub publish flow

### Step 1: initialize git if needed

```bash
git init
```

### Step 2: inspect what will be committed

```bash
git status
```

Carefully verify that these are **not** staged or included:
- workspace contents
- `.env`
- any private logs
- any auth files

### Step 3: stage files

```bash
git add .
```

### Step 4: inspect staged files before commit

```bash
git diff --cached --stat
git diff --cached
```

This is the most important safety step.
Do not skip it.

### Step 5: first commit

```bash
git commit -m "Initial release"
```

### Step 6: create GitHub repo
Create a new empty GitHub repository, for example:
- `pi-discord-bot`

Do **not** initialize it with:
- README
- license
- gitignore

because those already exist locally.

### Step 7: connect remote

```bash
git branch -M main
git remote add origin git@github.com:<YOUR_USER>/pi-discord-bot.git
```

Or use HTTPS:

```bash
git remote add origin https://github.com/<YOUR_USER>/pi-discord-bot.git
```

### Step 8: push

```bash
git push -u origin main
```

---

## Part 3: Post-publish checks

After pushing:

### 1. Inspect the GitHub file list
Make sure the repo does **not** contain:
- `agent/`
- local env files
- logs
- private artifacts

### 2. Check rendered docs
Verify on GitHub that these render well:
- `README.md`
- `docs/operator-env-config.md`
- `docs/publishing-checklist.md`
- `docs/github-release-flow.md`

### 3. Check example files
Make sure users can easily find:
- `pi-discord-bot.env.example`
- `discord-policy.example.json`
- `pi-discord-bot.service`

---

## Part 4: Recommended first public release posture

For the **first public release**, I recommend:
- publish as a GitHub repo only
- keep `package.json` as:

```json
"private": true
```

That means:
- people can clone and run it
- you avoid accidental npm publish
- you keep package boundaries flexible while the project stabilizes

This is the safest first release mode.

---

## Part 5: Optional GitHub release tag flow

After the initial repo push, if you want a tagged release:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Then create a GitHub Release in the UI.

Suggested first release title:
- `v0.1.0 — Initial public release`

Suggested notes:
- Discord harness around Pi primitives
- Discord-native model/settings/tree/approval cards
- systemd-friendly local operation
- Pi shared auth/settings flow
- runtime workspace stored in `./agent`

---

## Part 6: Safe npm publish flow later

Do this **later**, not as part of the first GitHub publish.

When ready:
1. replace package metadata placeholders
2. run:

```bash
npm pack --dry-run
```

3. inspect included files carefully
4. remove or change:

```json
"private": true
```

5. then publish

---

## Short version

If you want the shortest safe release path:

```bash
cd ~/pi-discord-bot
npm test
npx tsc --noEmit
git init
git add .
git diff --cached --stat
git commit -m "Initial release"
git branch -M main
git remote add origin git@github.com:<YOUR_USER>/pi-discord-bot.git
git push -u origin main
```

Before `git commit`, verify again that workspace data is **not** included.
