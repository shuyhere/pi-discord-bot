---
name: pi-discord-bot
description: Use this skill whenever the user wants to install, configure, start, debug, verify, or operate the pi-discord-bot repo. Make sure to use it when the user mentions Discord bot setup, Discord permissions or intents, systemd service setup, `.env` or credentials for this repo, the bot workspace or `discord-policy.json`, local startup, background running, or why the bot is not responding. Focus on practical local setup and operation of this repository, not turning it into a large hosted deployment.
---

# pi-discord-bot

Use this skill when helping a user set up or operate this repository.

## Trigger check

This skill should trigger for requests like:
- "help me install this Discord bot repo"
- "how do I configure the env file for pi-discord-bot?"
- "what Discord intents and permissions do I need?"
- "how do I create agent/discord-policy.json?"
- "how do I run this with systemd?"
- "the bot is not responding in Discord, help me debug it"

If the user is asking how to get this repo running, configured, or verified, use this skill.

## Main goal

Help the user:
- install dependencies
- configure Discord env and Pi shared auth/settings
- create the external workspace directory
- create `<workspace>/discord-policy.json`
- start the bot locally
- run it stably with the included systemd user service
- verify that the bot can respond in Discord

Always use and follow:
- `README.md`
- `docs/operator-env-config.md`

Assume many operators already use the normal Pi CLI / TUI on the same machine. Prefer Pi shared auth/settings flow instead of repo-local provider API key setup unless the user explicitly needs a lower-level auth explanation.

Do **not** turn this into a complex deployment project unless the user explicitly asks.

## Principles

- Keep the design small, direct, and easy to operate.
- Keep the app as a small Discord harness around Pi primitives.
- Prefer local setup and simple operation.
- Never hardcode machine-specific absolute paths in code.
- Prefer relative paths in commands and examples where possible.
- Keep the workspace directory outside the repo.
- Default workspace is `$XDG_STATE_HOME/pi-discord-bot/agent` or `~/.local/state/pi-discord-bot/agent`.
- Respect `PI_DISCORD_BOT_WORKDIR` when the user sets it.
- Stable backend operation should come from the included systemd service, not a custom in-app health system.

## Default workflow

When helping the user, prefer this order unless they ask for something more specific.

### 1. Install dependencies

```bash
npm install
```

### 2. Configure env and auth
Create or edit:

- `~/.config/pi-discord-bot.env`

with at least:

```bash
DISCORD_TOKEN=...
```

Optional:

```bash
DISCORD_GUILD_ID=123456789012345678
```

If the user already uses Pi CLI / TUI on the same machine, prefer explaining Pi shared auth/settings flow rather than telling them to paste provider API keys into this repo env file.
Use `docs/operator-env-config.md` as the source of truth.

### 3. Configure Discord
Help the user set up the Discord application and bot with the intents, scopes, and permissions described in `README.md`.
Also use `docs/operator-env-config.md` for operator-facing env/policy explanations.

### 4. Configure the workspace
Create the external workspace, for example:

- `~/.local/state/pi-discord-bot/agent/discord-policy.json`

using:

```bash
mkdir -p ~/.local/state/pi-discord-bot/agent
cp discord-policy.example.json ~/.local/state/pi-discord-bot/agent/discord-policy.json
```

Or, when the user prefers a custom path:

```bash
mkdir -p "$PI_DISCORD_BOT_WORKDIR"
cp discord-policy.example.json "$PI_DISCORD_BOT_WORKDIR/discord-policy.json"
```

Explain only the small policy fields the repo currently uses:
- `allowDMs`
- `guildIds`
- `channelIds`
- `mentionMode`
- `slashCommands.guildId`

### 5. Start the bot
For local development:

```bash
npx tsx src/main.ts
```

For built output:

```bash
npm run build
npm start
```

### 6. Run in background with systemd
Use the included files:

- `pi-discord-bot.service`
- `pi-discord-bot.env.example`

Typical flow:

```bash
mkdir -p ~/.config/systemd/user ~/.config
cp pi-discord-bot.service ~/.config/systemd/user/
cp pi-discord-bot.env.example ~/.config/pi-discord-bot.env
$EDITOR ~/.config/pi-discord-bot.env
systemctl --user daemon-reload
systemctl --user enable --now pi-discord-bot.service
```

Verification:

```bash
systemctl --user status pi-discord-bot.service
journalctl --user -u pi-discord-bot.service -f
```

### 7. Verify in Discord
Help the user verify one of these works:
- DM the bot
- mention the bot in an allowed guild channel
- run `/pi`

If verification fails, inspect config and logs before proposing deeper changes.

## Product behavior to explain to users

- One runner per conversation key:
  - `dm:<userId>`
  - `guild:<guildId>:channel:<channelId>`
  - `guild:<guildId>:thread:<threadId>`
- Main message shows progress and final answer
- Replies contain verbose details such as tool output
- Logs are append-only
- The bot supports both Discord slash commands and plain text commands that begin with `/`
- If operators are used to Pi TUI, explain that the Discord bot is another surface over Pi shared auth/settings, not a separate model hardcoding layer

## Architecture awareness

Know these files when helping the user:
- `src/main.ts`: entrypoint and process lifecycle
- `src/discord.ts`: Discord intake and reply/edit behavior
- `src/context.ts`: `log.jsonl` and `context.jsonl` sync
- `src/agent.ts`: Pi `Agent` + `AgentSession` wiring
- `src/store.ts`: attachment persistence
- `README.md`: setup and operation guide
- `docs/operator-env-config.md`: operator env/config/auth guide
- `pi-discord-bot.service`: stable background run

## Avoid

- Pushing the user toward a heavy deployment setup unless asked
- Adding big abstractions when the user only needs setup help
- Suggesting complex permission matrices unless truly necessary
- Hardcoding absolute paths in code changes

## Good outcomes

A successful help session usually ends with the user having:
- installed dependencies
- created `~/.config/pi-discord-bot.env`
- created an external workspace and `<workspace>/discord-policy.json`
- started the bot locally or via systemd
- verified it responds in Discord

## Quick checklist before answering

1. Keep guidance practical and local-first.
2. Prefer existing repo files and documented commands over inventing new flows.
3. Do not suggest large deployment architecture unless the user explicitly asks.
4. Keep examples relative-path friendly where possible.
5. If changing repo files, preserve the repo's simplicity.
