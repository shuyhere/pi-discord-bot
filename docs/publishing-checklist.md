# Publishing checklist

Use this checklist before publishing `pi-discord-bot` as a public repo or future npm package.

## 1. Publish safety review

### Do not publish runtime/private state
Make sure these are **not** included in your release commit or package contents:
- workspace contents
- `~/.config/pi-discord-bot.env`
- Pi auth files
- Discord tokens
- logs with user conversations
- downloaded attachments

### Current repo risk summary
The main source tree does **not** contain obvious hardcoded secrets.
The main publishing risk is runtime data in the workspace directory, which should live outside the repo and is private operational state.

## 2. Git repo checklist

Before pushing to GitHub/GitLab:

```bash
git status
```

Check that these are ignored or absent:
- workspace contents
- `.env`
- local auth/config files
- generated `.tgz` package artifacts

Recommended validation:

```bash
npm test
npx tsc --noEmit
```

## 3. Repo metadata checklist

Before publishing the repo publicly, confirm:
- `README.md` is current
- `docs/operator-env-config.md` is current
- `LICENSE` is correct for your intended distribution
- `package.json` metadata is updated with your real repository URLs

Fields to replace before public release:
- `repository.url`
- `homepage`
- `bugs.url`
- author/publisher metadata if you want them included

## 4. npm publishing checklist

When publishing to npm:
1. confirm `dist/` build output is correct
2. confirm package metadata is correct
3. confirm the package contents are safe
4. run a dry pack:

```bash
npm pack --dry-run
```

5. inspect the file list carefully
6. only then publish

## 5. Recommended package-content review

Run:

```bash
npm pack --dry-run
```

Verify that the package would include only things like:
- `dist/`
- `README.md`
- `LICENSE`
- maybe selected docs/examples

It should **not** include:
- workspace contents
- tests unless you want them shipped
- local config
- private logs

## 6. Release recommendation

Recommended order:
1. publish the Git repo
2. publish the npm package
3. let users install either from npm or from source, depending on their workflow
