import { ChannelType, PermissionFlagsBits, type Client, type TextBasedChannel } from "discord.js";
import type { DiscordEvent } from "./discord-types.js";

export function createGuildToolApi(params: {
  client: Client;
  event: DiscordEvent;
  channel: TextBasedChannel;
  sendable: any;
  fetchAnchorMessage: () => Promise<any>;
}) {
  const { client, event, channel, sendable, fetchAnchorMessage } = params;

  return {
    listGuildChannels: async () => {
      if (!event.guildId) throw new Error("Channel management is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      await guild.channels.fetch();
      return Array.from(guild.channels.cache.values())
        .map((c: any) => ({ id: c.id, name: c.name ?? c.id, type: String(c.type), parentId: c.parentId ?? undefined }))
        .sort((a, b) => a.name.localeCompare(b.name));
    },
    resolveGuildChannel: async (query: string) => {
      if (!event.guildId) throw new Error("Channel lookup is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      await guild.channels.fetch();
      const channels = Array.from(guild.channels.cache.values())
        .map((c: any) => ({ id: c.id, name: c.name ?? c.id, type: String(c.type), parentId: c.parentId ?? undefined }));
      const needle = query.trim().toLowerCase();
      const exact = channels.find((c) => c.id === query || c.name.toLowerCase() === needle);
      if (exact) return exact;
      const partial = channels.filter((c) => c.name.toLowerCase().includes(needle));
      if (partial.length === 1) return partial[0];
      if (partial.length === 0) throw new Error(`No channel or category matches: ${query}`);
      throw new Error(`Channel query is ambiguous: ${partial.slice(0, 8).map((c) => `${c.name} (${c.id})`).join(", ")}`);
    },
    resolveGuildMember: async (query: string) => {
      if (!event.guildId) throw new Error("Member lookup is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      await guild.members.fetch();
      const members = Array.from(guild.members.cache.values()).map((m: any) => ({ id: m.id, userName: m.user?.username ?? m.id, displayName: m.displayName ?? m.user?.username ?? m.id }));
      const needle = query.trim().toLowerCase();
      const exact = members.find((m) => m.id === query || m.userName.toLowerCase() === needle || m.displayName.toLowerCase() === needle);
      if (exact) return exact;
      const partial = members.filter((m) => m.userName.toLowerCase().includes(needle) || m.displayName.toLowerCase().includes(needle));
      if (partial.length === 1) return partial[0];
      if (partial.length === 0) throw new Error(`No guild member matches: ${query}`);
      throw new Error(`Member query is ambiguous: ${partial.slice(0, 8).map((m) => `${m.displayName} (${m.id})`).join(", ")}`);
    },
    resolveGuildRole: async (query: string) => {
      if (!event.guildId) throw new Error("Role lookup is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      await guild.roles.fetch();
      const roles = Array.from(guild.roles.cache.values()).map((r: any) => ({ id: r.id, name: r.name ?? r.id }));
      const needle = query.trim().toLowerCase();
      const exact = roles.find((r) => r.id === query || r.name.toLowerCase() === needle);
      if (exact) return exact;
      const partial = roles.filter((r) => r.name.toLowerCase().includes(needle));
      if (partial.length === 1) return partial[0];
      if (partial.length === 0) throw new Error(`No role matches: ${query}`);
      throw new Error(`Role query is ambiguous: ${partial.slice(0, 8).map((r) => `${r.name} (${r.id})`).join(", ")}`);
    },
    createGuildTextChannel: async ({ name, parentId, topic, private: isPrivate, memberIds, roleIds }: { name: string; parentId?: string; topic?: string; private?: boolean; memberIds?: string[]; roleIds?: string[] }) => {
      if (!event.guildId) throw new Error("Channel management is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      const overwrites = isPrivate
        ? [
            { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
            { id: event.userId, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
            ...(memberIds ?? []).filter((id) => id !== event.userId).map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
            ...(roleIds ?? []).map((id) => ({ id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] })),
            { id: client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads] },
          ]
        : undefined;
      const created = await guild.channels.create({ name, type: ChannelType.GuildText, parent: parentId, topic, permissionOverwrites: overwrites });
      return { id: created.id, name: "name" in created ? (created.name ?? name) : name };
    },
    createGuildCategory: async ({ name }: { name: string }) => {
      if (!event.guildId) throw new Error("Channel management is only available in guilds.");
      const guild = await client.guilds.fetch(event.guildId);
      const created = await guild.channels.create({ name, type: ChannelType.GuildCategory });
      return { id: created.id, name: "name" in created ? (created.name ?? name) : name };
    },
    renameGuildChannel: async ({ channelId, name }: { channelId: string; name: string }) => {
      const target = await client.channels.fetch(channelId);
      if (!target || !("setName" in target) || typeof (target as any).setName !== "function") throw new Error(`Channel ${channelId} cannot be renamed.`);
      const updated = await (target as any).setName(name);
      return { id: updated.id, name: updated.name ?? name };
    },
    moveGuildChannel: async ({ channelId, parentId }: { channelId: string; parentId?: string | null }) => {
      const target = await client.channels.fetch(channelId);
      if (!target || !("setParent" in target) || typeof (target as any).setParent !== "function") throw new Error(`Channel ${channelId} cannot be moved.`);
      const updated = await (target as any).setParent(parentId ?? null);
      return { id: updated.id, name: updated.name ?? channelId, parentId: (updated as any).parentId ?? null };
    },
    deleteGuildChannel: async ({ channelId }: { channelId: string }) => {
      const target = await client.channels.fetch(channelId);
      if (!target || !("delete" in target) || typeof (target as any).delete !== "function") throw new Error(`Channel ${channelId} cannot be deleted.`);
      await (target as any).delete();
      return { id: channelId };
    },
    createThreadFromCurrentChannel: async ({ name, autoArchiveDuration }: { name: string; autoArchiveDuration?: 60 | 1440 | 4320 | 10080 }) => {
      if (channel.isThread()) throw new Error("Already in a thread.");
      const base = await fetchAnchorMessage();
      if (base && typeof (base as any).startThread === "function") {
        const thread = await (base as any).startThread({ name, autoArchiveDuration: autoArchiveDuration ?? 1440 });
        return { id: thread.id, name: thread.name ?? name };
      }
      if ("threads" in sendable && sendable.threads?.create) {
        const thread = await sendable.threads.create({ name, autoArchiveDuration: autoArchiveDuration ?? 1440 });
        return { id: thread.id, name: thread.name ?? name };
      }
      throw new Error("This channel does not support thread creation.");
    },
    renameThread: async ({ threadId, name }: { threadId: string; name: string }) => {
      const target = await client.channels.fetch(threadId);
      if (!target?.isThread()) throw new Error(`Thread ${threadId} not found.`);
      const updated = await target.setName(name);
      return { id: updated.id, name: updated.name ?? name };
    },
    archiveThread: async ({ threadId, archived, locked }: { threadId: string; archived?: boolean; locked?: boolean }) => {
      const target = await client.channels.fetch(threadId);
      if (!target?.isThread()) throw new Error(`Thread ${threadId} not found.`);
      const updated = await target.setArchived(archived ?? true);
      if (typeof locked === "boolean" && "setLocked" in updated && typeof (updated as any).setLocked === "function") {
        await (updated as any).setLocked(locked);
      }
      return { id: updated.id, archived: archived ?? true, locked };
    },
  };
}
