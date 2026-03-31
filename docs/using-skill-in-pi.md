# Use `pi-discord-bot` from Pi with almost zero setup

This guide is for people who already use **Pi CLI / TUI** and want Pi itself to guide the bot setup.

The goal is:
- install the package as a Pi package
- load the skill
- let the skill walk you through the rest

## Recommended path: install the skill from npm

Once the package is published, install it into Pi with:

```bash
pi install npm:@shuyhere/pi-discord-bot
```

Then start Pi:

```bash
pi
```

Then run:

```text
/skill:pi-discord-bot
```

Or directly:

```text
/skill:pi-discord-bot help me set up and run the Discord bot
```

That is the preferred low-friction workflow.

---

## Install the skill from source instead

If you have the repo checked out locally, you can install it into Pi from the local path:

```bash
pi install /absolute/path/to/pi-discord-bot
```

Then:

```bash
pi
```

And in Pi:

```text
/skill:pi-discord-bot
```

This is the best option if you are developing the repo locally.

---

## No install path if you are already inside the repo

If you are already in the repo, Pi can discover the project skill automatically:

```bash
cd ~/pi-discord-bot
pi
```

Then either ask naturally:

```text
Help me configure this bot.
```

or force the skill explicitly:

```text
/skill:pi-discord-bot
```

---

## What to ask Pi

After the skill is loaded, ask Pi things like:
- "Set up this bot with the simplest workflow."
- "Help me configure `~/.config/pi-discord-bot.env`."
- "Help me create the workspace `discord-policy.json`."
- "Set this up with the included systemd user service."
- "The bot is not responding in Discord; debug it."

The skill is meant to drive the setup flow for you, instead of making you manually piece the repo together.

---

## Best practice

If you want the cleanest user flow, do this:

### npm package flow
```bash
pi install npm:@shuyhere/pi-discord-bot
pi
```

Then in Pi:

```text
/skill:pi-discord-bot help me set up the bot
```

### source flow
```bash
pi install /absolute/path/to/pi-discord-bot
pi
```

Then in Pi:

```text
/skill:pi-discord-bot help me set up the bot
```

That way the user mainly interacts with **Pi + the skill**, not a long manual checklist.
