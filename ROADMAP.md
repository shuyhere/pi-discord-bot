# Discord bot roadmap

Goal: keep this small, focused, and easy to operate.

## Core loop
- log inbound Discord messages to `log.jsonl`
- sync missing user messages into `context.jsonl`
- run Pi agent
- keep one main message for progress/final answer
- put verbose details in replies

## Keep simple
- one runner per conversation
- one workspace per conversation
- minimal config
- minimal commands

## Current commands
- `/pi`
- `/stop`

## Current policy
`discord-policy.json`
- `allowDMs`
- `guildIds`
- `channelIds`
- `mentionMode`
- `slashCommands.guildId`

## Next small tasks
- make backfill a bit more robust
- document Discord app setup clearly
- keep avoiding extra subsystems
