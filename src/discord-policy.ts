import { ApplicationCommandOptionType, ChannelType, type Message, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";
import { existsSync, readFileSync } from "node:fs";
import type { DiscordPolicy } from "./discord-types.js";
import * as log from "./log.js";

export function loadDiscordPolicy(policyPath: string): DiscordPolicy {
  if (!existsSync(policyPath)) {
    return {
      allowDMs: true,
      mentionMode: "mention-only",
      slashCommands: { enabled: true, guildId: process.env.DISCORD_GUILD_ID },
    };
  }

  try {
    return JSON.parse(readFileSync(policyPath, "utf-8")) as DiscordPolicy;
  } catch (err) {
    log.warn("failed to parse discord-policy.json", err instanceof Error ? err.message : String(err));
    return { allowDMs: true, mentionMode: "mention-only", slashCommands: { enabled: true } };
  }
}

export function buildSlashCommands(): RESTPostAPIChatInputApplicationCommandsJSONBody[] {
  return [
    {
      name: "pi",
      description: "Ask the Pi-powered Discord bot to do something",
      options: [{ name: "prompt", description: "What should the bot do?", type: ApplicationCommandOptionType.String, required: true }],
    },
    { name: "stop", description: "Abort the current run for this conversation" },
    { name: "new", description: "Start a new Pi session for this conversation" },
    {
      name: "name",
      description: "Set the current Pi session name",
      options: [{ name: "name", description: "New session name", type: ApplicationCommandOptionType.String, required: true }],
    },
    { name: "session", description: "Show current Pi session information" },
    {
      name: "tree",
      description: "Show or navigate the current Pi session tree",
      options: [{ name: "entry_id", description: "Optional session entry id to navigate to", type: ApplicationCommandOptionType.String, required: false }],
    },
    {
      name: "model",
      description: "Show or change the current Pi model",
      options: [{ name: "reference", description: "provider/model or search string", type: ApplicationCommandOptionType.String, required: false }],
    },
    {
      name: "scoped-models",
      description: "Show or set Pi scoped models",
      options: [{ name: "patterns", description: "Comma-separated model patterns, or clear", type: ApplicationCommandOptionType.String, required: false }],
    },
    { name: "settings", description: "Show current Pi settings summary" },
    {
      name: "compact",
      description: "Compact the current Pi session",
      options: [{ name: "instructions", description: "Optional custom compaction instructions", type: ApplicationCommandOptionType.String, required: false }],
    },
    { name: "reload", description: "Reload Pi resources" },
    {
      name: "login",
      description: "Show how to log in with shared Pi auth",
      options: [{ name: "provider", description: "Optional provider name", type: ApplicationCommandOptionType.String, required: false }],
    },
    {
      name: "logout",
      description: "Show how to log out from shared Pi auth",
      options: [{ name: "provider", description: "Optional provider name", type: ApplicationCommandOptionType.String, required: false }],
    },
  ];
}

export function isAllowedDiscordMessage(message: Message, botUserId: string, policy: DiscordPolicy): { allowed: boolean; reason?: string } {
  const isDm = message.channel.type === ChannelType.DM;
  const trimmed = message.content.trim();
  const isTextCommand = trimmed.startsWith("/");

  if (isDm) {
    if (policy.allowDMs === false) return { allowed: false, reason: "DMs disabled by policy" };
    return { allowed: true };
  }

  if (policy.guildIds?.length && (!message.guildId || !policy.guildIds.includes(message.guildId))) {
    return { allowed: false, reason: "guild not in allowlist" };
  }

  const effectiveChannelId = message.channel.isThread() ? message.channel.parentId ?? message.channel.id : message.channel.id;
  if (policy.channelIds?.length && !policy.channelIds.includes(effectiveChannelId) && !policy.channelIds.includes(message.channel.id)) {
    return { allowed: false, reason: "channel not in allowlist" };
  }

  const mentionMode = policy.mentionMode ?? "mention-only";
  if (mentionMode === "mention-only" && !message.mentions.users.has(botUserId) && !isTextCommand) {
    return { allowed: false, reason: "no mention" };
  }

  return { allowed: true };
}
