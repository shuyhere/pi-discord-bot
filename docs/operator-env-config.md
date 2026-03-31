# Operator env and config guide

This page is for people operating `pi-discord-bot` locally, especially if they already use the normal Pi CLI / TUI on the same machine.

## Mental model

`pi-discord-bot` uses:
- **Discord token** from an env file
- **Pi shared auth/settings** from your normal Pi setup
- **runtime workspace** outside the repo by default
- **Discord policy** from `<workspace>/discord-policy.json`

So in most cases you do **not** need to put model provider API keys in this repo-specific env file if Pi is already authenticated on the machine.

---

## 1. Environment file

Recommended path:

```bash
~/.config/pi-discord-bot.env
```

Minimum example:

```bash
DISCORD_TOKEN=your_discord_bot_token
```

Optional:

```bash
DISCORD_GUILD_ID=123456789012345678
```

### What each variable does

#### `DISCORD_TOKEN`
Required.
Used by the Discord bot client to log in.

#### `DISCORD_GUILD_ID`
Optional.
If set, the default generated policy can use it for guild-scoped slash command registration / faster iteration.
If omitted, the bot can register commands globally.

---

## 2. Pi auth and settings

This bot intentionally follows **Pi shared auth/settings/default model flow**.

That means:
- it uses Pi’s shared auth storage
- it uses Pi’s shared settings manager
- it does **not** hardcode a provider/model in repo config

### If you already use Pi TUI / CLI
If you already use Pi normally on this machine, that is the expected setup.
The Discord bot should reuse that auth/settings context.

Typical user flow:
1. open Pi TUI / CLI
2. authenticate there
3. run `pi-discord-bot`
4. use `/model`, `/settings`, etc. in Discord if you want per-session changes

### Important operator note
Do not keep stale repo docs or env files that suggest this bot requires provider-specific API keys like:
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`

Those may still be valid for Pi itself depending on your environment, but this bot is designed to rely on **Pi shared auth** rather than hardcoded bot-local model credentials.

---

## 3. Runtime workspace

Default runtime dir used by this repo:

```text
$XDG_STATE_HOME/pi-discord-bot/agent
```

or, if `XDG_STATE_HOME` is unset:

```text
~/.local/state/pi-discord-bot/agent
```

Optional override via env:

```bash
PI_DISCORD_BOT_WORKDIR=/absolute/path/to/pi-discord-bot-agent
```

Important contents:

```text
./agent/
  discord-policy.json
  MEMORY.md
  skills/
  guild:.../
  dm:.../
```

Treat this directory as **private runtime state**.
It may contain:
- user messages
- assistant responses
- local file paths
- attachment metadata
- tool outputs

Do not commit or share it.

---

## 4. Discord policy file

Create it with:

```bash
mkdir -p ~/.local/state/pi-discord-bot/agent
cp discord-policy.example.json ~/.local/state/pi-discord-bot/agent/discord-policy.json
```

Or with a custom workspace:

```bash
mkdir -p "$PI_DISCORD_BOT_WORKDIR"
cp discord-policy.example.json "$PI_DISCORD_BOT_WORKDIR/discord-policy.json"
```

Example:

```json
{
  "allowDMs": true,
  "guildIds": ["123456789012345678"],
  "channelIds": ["234567890123456789"],
  "mentionMode": "mention-only",
  "slashCommands": {
    "enabled": true
  }
}
```

### Main fields

#### `allowDMs`
Allow or deny bot usage in DMs.

#### `guildIds`
Optional guild allowlist.
Omit to allow all guilds.

#### `channelIds`
Optional channel allowlist.
Omit to allow all channels.

#### `mentionMode`
- `mention-only`: normal guild chat must mention the bot
- `allow-all`: normal guild chat can be processed without mention gating

Text commands starting with `/` are still accepted as commands.

#### `slashCommands.enabled`
Enable or disable slash command registration.

#### `slashCommands.guildId`
Optional guild-scoped slash command registration.
Useful for faster development iteration.
If omitted, global commands are used.

---

## 5. How this fits with Pi TUI users

Most operators who use Pi already will probably do this:

### Step A: authenticate in Pi first
Use Pi in its normal interface and make sure auth works there.

### Step B: configure Discord env
Create:

```bash
~/.config/pi-discord-bot.env
```

with at least:

```bash
DISCORD_TOKEN=...
```

### Step C: configure workspace policy
Create:

```bash
~/.local/state/pi-discord-bot/agent/discord-policy.json
```

### Step D: start bot

```bash
npx tsx src/main.ts ./agent
```

or with systemd.

This is the intended operator workflow.
The workspace should live outside the repo.

---

## 6. systemd setup

Typical setup:

```bash
mkdir -p ~/.config/systemd/user ~/.config
cp pi-discord-bot.service ~/.config/systemd/user/
cp pi-discord-bot.env.example ~/.config/pi-discord-bot.env
$EDITOR ~/.config/pi-discord-bot.env
systemctl --user daemon-reload
systemctl --user enable --now pi-discord-bot.service
```

Useful commands:

```bash
systemctl --user status pi-discord-bot.service
journalctl --user -u pi-discord-bot.service -f
systemctl --user restart pi-discord-bot.service
```

---

## 7. Troubleshooting checklist

### Bot starts but cannot answer model requests
Check that Pi auth works outside the bot first.
If Pi itself is not authenticated, the Discord bot will not have usable model access either.

### Slash commands do not show immediately
If commands are global, Discord may take time to refresh them.
This is a Discord propagation issue, not necessarily a bot bug.

### Normal guild messages are ignored
Check:
- `guildIds`
- `channelIds`
- `mentionMode`

If `mentionMode` is `mention-only`, normal chat must mention the bot.
Text commands like `/tree` are handled separately.

### Admin actions fail
Check bot permissions in Discord:
- Manage Channels
- Create Public Threads
- Create Private Threads
- Send Messages
- Read Message History

---

## 8. Recommended operator practice

If you maintain this repo for other Pi users:
- keep env docs focused on `DISCORD_TOKEN`
- document Pi shared auth instead of provider-specific API keys
- keep `./agent` out of version control
- treat Discord policy and systemd as the main operator knobs
