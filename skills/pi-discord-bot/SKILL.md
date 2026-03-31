---
name: pi-discord-bot
description: Use this skill whenever the user wants to install, configure, start, debug, verify, or operate pi-discord-bot. Trigger for npm install, pi package install, source install, Discord bot setup, Discord permissions or intents, systemd setup, env setup, discord-policy.json, workspace setup, or why the bot is not responding. Prefer guiding the user through Pi skill usage instead of making them manually discover the setup flow.
---

# pi-discord-bot

Use this skill to help users install and operate `pi-discord-bot` with very low friction.

## Trigger check

This skill should trigger for requests like:
- "help me install pi-discord-bot"
- "how do I use pi-discord-bot from Pi?"
- "install this through npm"
- "install this from source"
- "help me configure the Discord bot"
- "how do I create discord-policy.json?"
- "help me run this with systemd"
- "the bot is not responding in Discord"

If the user wants to use, install, configure, start, debug, or verify `pi-discord-bot`, use this skill.

## Main goal

Help the user in the simplest possible way:
- install the skill into Pi via npm or from source
- invoke the skill from Pi with `/skill:pi-discord-bot`
- let the skill guide the repo setup and operation
- configure env, policy, and Discord app settings only as needed
- start the bot locally or with systemd
- verify it responds in Discord

Always use and follow:
- `README.md`
- `docs/operator-env-config.md`
- `docs/using-skill-in-pi.md`

Assume many users already use normal Pi CLI / TUI on the same machine. Prefer Pi shared auth/settings flow instead of repo-local provider API keys unless the user explicitly asks for lower-level auth details.

## Principles

- Keep guidance practical and low-friction.
- Prefer Pi package installation and `/skill:pi-discord-bot` over making the user manually memorize setup steps.
- Keep the workspace outside the repo.
- Default workspace is `$XDG_STATE_HOME/pi-discord-bot/agent` or `~/.local/state/pi-discord-bot/agent`.
- Respect `PI_DISCORD_BOT_WORKDIR` when set.
- Use the included systemd service for stable background operation.
- Do not hardcode machine-specific absolute paths in code.

## Preferred user flows

When the user asks how to use this with Pi, prefer these flows.

### Option A: Install from npm into Pi

This is the preferred low-setup path when the package is published.

```bash
pi install npm:pi-discord-bot
pi
```

Then in Pi:

```text
/skill:pi-discord-bot
```

or:

```text
/skill:pi-discord-bot help me set up the bot
```

### Option B: Install from source into Pi

If the user has the repo checked out locally:

```bash
pi install /absolute/path/to/pi-discord-bot
pi
```

Then in Pi:

```text
/skill:pi-discord-bot
```

### Option C: Run Pi inside the repo

If the user is already in the repo, Pi can auto-discover the project skill.

```bash
cd /path/to/pi-discord-bot
pi
```

Then either ask naturally:

```text
Help me configure this bot.
```

or force it explicitly:

```text
/skill:pi-discord-bot
```

## How to help the user

Prefer this sequence unless the user asks for something narrower.

### 1. Start from skill usage

First explain the simplest way to use the skill:
- `pi install npm:pi-discord-bot`
- or `pi install /path/to/pi-discord-bot`
- then `/skill:pi-discord-bot`

Do not start by dumping a long manual setup checklist unless the user specifically asks for raw steps.

### 2. Configure env and auth

Create or edit:

- `~/.config/pi-discord-bot.env`

Minimum:

```bash
DISCORD_TOKEN=...
```

Optional:

```bash
DISCORD_GUILD_ID=123456789012345678
PI_DISCORD_BOT_WORKDIR=/absolute/path/to/pi-discord-bot-agent
```

If the user already uses Pi CLI / TUI on the same machine, prefer Pi shared auth/settings flow.

### 3. Configure Discord

Use `README.md` for the bot app setup details.
Explain the required intents, scopes, and permissions.

### 4. Configure the workspace policy

Create the external workspace and copy the policy example:

```bash
mkdir -p ~/.local/state/pi-discord-bot/agent
cp discord-policy.example.json ~/.local/state/pi-discord-bot/agent/discord-policy.json
```

Or with a custom workspace:

```bash
mkdir -p "$PI_DISCORD_BOT_WORKDIR"
cp discord-policy.example.json "$PI_DISCORD_BOT_WORKDIR/discord-policy.json"
```

Only explain the policy fields this repo uses:
- `allowDMs`
- `guildIds`
- `channelIds`
- `mentionMode`
- `slashCommands.guildId`

### 5. Start the bot

If the user installed from source:

```bash
cd /path/to/pi-discord-bot
npm install
npx tsx src/main.ts
```

If the user installed the package to run the bot directly:

```bash
pi-discord-bot
```

### 6. Run with systemd

Use:
- `pi-discord-bot.service`
- `pi-discord-bot.env.example`

Typical source-based flow:

```bash
cd /path/to/pi-discord-bot
mkdir -p ~/.config/systemd/user ~/.config
cp pi-discord-bot.service ~/.config/systemd/user/
cp pi-discord-bot.env.example ~/.config/pi-discord-bot.env
$EDITOR ~/.config/pi-discord-bot.env
systemctl --user daemon-reload
systemctl --user enable --now pi-discord-bot.service
```

### 7. Verify in Discord

Help the user verify one of these works:
- DM the bot
- mention the bot in an allowed guild channel
- run `/pi`

If verification fails, inspect config and logs before proposing deeper changes.

## Product behavior to explain

- One runner per conversation key:
  - `dm:<userId>`
  - `guild:<guildId>:channel:<channelId>`
  - `guild:<guildId>:thread:<threadId>`
- Main message shows progress and final answer
- Replies or detail threads contain verbose details
- Logs are append-only
- The bot supports Discord slash commands and plain text commands beginning with `/`
- The bot uses Pi shared auth/settings/model flow rather than a hardcoded model layer

## Good outcomes

A successful help session usually ends with the user having:
- installed the skill with `pi install npm:pi-discord-bot` or `pi install /path/to/pi-discord-bot`
- used `/skill:pi-discord-bot`
- created `~/.config/pi-discord-bot.env`
- created an external workspace and `<workspace>/discord-policy.json`
- started the bot locally or via systemd
- verified it responds in Discord
