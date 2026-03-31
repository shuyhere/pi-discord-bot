import { Type } from "@sinclair/typebox";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ToolDefinition } from "@mariozechner/pi-coding-agent";
import type { RunState } from "./agent-types.js";

export function createDiscordCustomTools(params: { scratchDir: string; runState: RunState }): ToolDefinition[] {
  const { scratchDir, runState } = params;

  const noContextError = () => ({ content: [{ type: "text", text: "No active Discord context." }], details: {}, isError: true } as any);

  return [{
    name: "attach",
    label: "Attach file",
    description: "Upload a local file from the workspace back to Discord.",
    parameters: Type.Object({
      filePath: Type.String({ description: "Absolute or scratch-relative path to the file to upload" }),
      title: Type.Optional(Type.String({ description: "Optional display name for the uploaded file" })),
      label: Type.Optional(Type.String({ description: "Short user-visible label for the action" })),
    }),
    execute: async (_toolCallId, rawParams) => {
      const params = rawParams as { filePath: string; title?: string };
      const ctx = runState.ctx;
      if (!ctx) return { content: [{ type: "text", text: "No active Discord context; cannot upload file." }], details: {} };
      const filePath = params.filePath.startsWith("/") ? params.filePath : join(scratchDir, params.filePath);
      if (!existsSync(filePath)) {
        return { content: [{ type: "text", text: `File not found: ${filePath}` }], details: {}, isError: true } as any;
      }
      await ctx.uploadFile(filePath, params.title);
      return { content: [{ type: "text", text: `Uploaded ${params.title ?? filePath} to Discord.` }], details: { filePath, title: params.title ?? null } };
    },
  }, {
    name: "discord_list_channels",
    label: "List Discord guild channels",
    description: "List guild channels visible to the bot in the current server.",
    parameters: Type.Object({ label: Type.Optional(Type.String()) }),
    execute: async () => {
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const channels = await ctx.listGuildChannels();
      return { content: [{ type: "text", text: `Found ${channels.length} channels.` }], details: { channels } };
    },
  }, {
    name: "discord_resolve_channel",
    label: "Resolve Discord channel",
    description: "Resolve a guild channel or category by name or ID.",
    parameters: Type.Object({ query: Type.String({ description: "Channel or category name or ID" }), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { query: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const resolved = await ctx.resolveGuildChannel(params.query);
      return { content: [{ type: "text", text: `Resolved ${params.query} to ${resolved.name}.` }], details: resolved };
    },
  }, {
    name: "discord_resolve_member",
    label: "Resolve Discord member",
    description: "Resolve a guild member by username, display name, or ID.",
    parameters: Type.Object({ query: Type.String({ description: "Member username, display name, or ID" }), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { query: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const resolved = await ctx.resolveGuildMember(params.query);
      return { content: [{ type: "text", text: `Resolved ${params.query} to ${resolved.displayName}.` }], details: resolved };
    },
  }, {
    name: "discord_resolve_role",
    label: "Resolve Discord role",
    description: "Resolve a guild role by name or ID.",
    parameters: Type.Object({ query: Type.String({ description: "Role name or ID" }), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { query: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const resolved = await ctx.resolveGuildRole(params.query);
      return { content: [{ type: "text", text: `Resolved ${params.query} to role ${resolved.name}.` }], details: resolved };
    },
  }, {
    name: "discord_create_channel",
    label: "Create Discord text channel",
    description: "Create a guild text channel after approval.",
    parameters: Type.Object({ name: Type.String(), parentId: Type.Optional(Type.String()), topic: Type.Optional(Type.String()), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { name: string; parentId?: string; topic?: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve channel creation", description: `Create a new text channel named \`${params.name}\`?`, bullets: [params.parentId ? `Parent category: ${params.parentId}` : "No parent category", params.topic ? `Topic: ${params.topic}` : "No topic"], caution: "This changes the Discord server structure.", approveLabel: "Create channel" });
      if (!approved) return { content: [{ type: "text", text: "Channel creation cancelled." }], details: { approved: false } };
      const created = await ctx.createGuildTextChannel(params);
      return { content: [{ type: "text", text: `Created channel ${created.name}.` }], details: created };
    },
  }, {
    name: "discord_create_private_channel",
    label: "Create private Discord text channel",
    description: "Create a private guild text channel after approval.",
    parameters: Type.Object({ name: Type.String(), parentId: Type.Optional(Type.String()), topic: Type.Optional(Type.String()), memberIds: Type.Optional(Type.Array(Type.String())), roleIds: Type.Optional(Type.Array(Type.String())), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { name: string; parentId?: string; topic?: string; memberIds?: string[]; roleIds?: string[] };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve private channel creation", description: `Create a new private text channel named \`${params.name}\`?`, bullets: [params.parentId ? `Parent category: ${params.parentId}` : "No parent category", params.topic ? `Topic: ${params.topic}` : "No topic", params.memberIds?.length ? `Extra allowed members: ${params.memberIds.join(", ")}` : "No extra allowed members", params.roleIds?.length ? `Extra allowed roles: ${params.roleIds.join(", ")}` : "No extra allowed roles", "Visible only to allowed users/roles and the bot unless you change permissions later"], caution: "This changes the Discord server structure and permissions.", approveLabel: "Create private channel" });
      if (!approved) return { content: [{ type: "text", text: "Private channel creation cancelled." }], details: { approved: false } };
      const created = await ctx.createGuildTextChannel({ ...params, private: true });
      return { content: [{ type: "text", text: `Created private channel ${created.name}.` }], details: created };
    },
  }, {
    name: "discord_create_category",
    label: "Create Discord category",
    description: "Create a guild category after approval.",
    parameters: Type.Object({ name: Type.String(), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { name: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve category creation", description: `Create a category named \`${params.name}\`?`, caution: "This changes the Discord server structure.", approveLabel: "Create category" });
      if (!approved) return { content: [{ type: "text", text: "Category creation cancelled." }], details: { approved: false } };
      const created = await ctx.createGuildCategory(params);
      return { content: [{ type: "text", text: `Created category ${created.name}.` }], details: created };
    },
  }, {
    name: "discord_rename_channel",
    label: "Rename Discord channel",
    description: "Rename a guild channel after approval.",
    parameters: Type.Object({ channelId: Type.String(), name: Type.String(), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { channelId: string; name: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve channel rename", description: `Rename channel \`${params.channelId}\` to \`${params.name}\`?`, caution: "This changes an existing Discord channel.", approveLabel: "Rename" });
      if (!approved) return { content: [{ type: "text", text: "Channel rename cancelled." }], details: { approved: false } };
      const updated = await ctx.renameGuildChannel(params);
      return { content: [{ type: "text", text: `Renamed channel to ${updated.name}.` }], details: updated };
    },
  }, {
    name: "discord_move_channel",
    label: "Move Discord channel",
    description: "Move a guild channel into or out of a category after approval.",
    parameters: Type.Object({ channelId: Type.String(), parentId: Type.Optional(Type.String()), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { channelId: string; parentId?: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve channel move", description: params.parentId ? `Move channel \`${params.channelId}\` into category \`${params.parentId}\`?` : `Remove channel \`${params.channelId}\` from its category?`, caution: "This changes the Discord server layout.", approveLabel: "Move channel" });
      if (!approved) return { content: [{ type: "text", text: "Channel move cancelled." }], details: { approved: false } };
      const updated = await ctx.moveGuildChannel({ channelId: params.channelId, parentId: params.parentId ?? null });
      return { content: [{ type: "text", text: `Moved channel ${updated.name}.` }], details: updated };
    },
  }, {
    name: "discord_delete_channel",
    label: "Delete Discord channel",
    description: "Delete a guild channel after approval.",
    parameters: Type.Object({ channelId: Type.String(), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { channelId: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve channel deletion", description: `Delete channel \`${params.channelId}\`?`, bullets: ["This cannot be undone through the bot."], caution: "This permanently deletes a Discord channel.", approveLabel: "Delete channel" });
      if (!approved) return { content: [{ type: "text", text: "Channel deletion cancelled." }], details: { approved: false } };
      const deleted = await ctx.deleteGuildChannel(params);
      return { content: [{ type: "text", text: `Deleted channel ${deleted.id}.` }], details: deleted };
    },
  }, {
    name: "discord_create_thread",
    label: "Create Discord thread",
    description: "Create a thread in the current guild channel after approval.",
    parameters: Type.Object({ name: Type.String(), autoArchiveDuration: Type.Optional(Type.Union([Type.Literal(60), Type.Literal(1440), Type.Literal(4320), Type.Literal(10080)])), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { name: string; autoArchiveDuration?: 60 | 1440 | 4320 | 10080 };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve thread creation", description: `Create a thread named \`${params.name}\` in the current channel?`, bullets: [params.autoArchiveDuration ? `Auto archive: ${params.autoArchiveDuration} minutes` : "Auto archive: 1440 minutes"], caution: "This creates a new thread in the current guild channel.", approveLabel: "Create thread" });
      if (!approved) return { content: [{ type: "text", text: "Thread creation cancelled." }], details: { approved: false } };
      const created = await ctx.createThreadFromCurrentChannel(params);
      return { content: [{ type: "text", text: `Created thread ${created.name}.` }], details: created };
    },
  }, {
    name: "discord_rename_thread",
    label: "Rename Discord thread",
    description: "Rename a thread after approval.",
    parameters: Type.Object({ threadId: Type.String(), name: Type.String(), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { threadId: string; name: string };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: "Approve thread rename", description: `Rename thread \`${params.threadId}\` to \`${params.name}\`?`, caution: "This changes an existing Discord thread.", approveLabel: "Rename thread" });
      if (!approved) return { content: [{ type: "text", text: "Thread rename cancelled." }], details: { approved: false } };
      const updated = await ctx.renameThread(params);
      return { content: [{ type: "text", text: `Renamed thread to ${updated.name}.` }], details: updated };
    },
  }, {
    name: "discord_archive_thread",
    label: "Archive Discord thread",
    description: "Archive or unarchive a thread after approval.",
    parameters: Type.Object({ threadId: Type.String(), archived: Type.Optional(Type.Boolean()), locked: Type.Optional(Type.Boolean()), label: Type.Optional(Type.String()) }),
    execute: async (_id, rawParams) => {
      const params = rawParams as { threadId: string; archived?: boolean; locked?: boolean };
      const ctx = runState.ctx;
      if (!ctx) return noContextError();
      const approved = await ctx.confirmAction({ title: params.archived === false ? "Approve thread unarchive" : "Approve thread archive", description: `${params.archived === false ? "Unarchive" : "Archive"} thread \`${params.threadId}\`?`, bullets: [typeof params.locked === "boolean" ? `Set locked=${params.locked}` : "Leave lock state unchanged"], caution: "This changes an existing Discord thread state.", approveLabel: params.archived === false ? "Unarchive" : "Archive" });
      if (!approved) return { content: [{ type: "text", text: "Thread archive action cancelled." }], details: { approved: false } };
      const updated = await ctx.archiveThread(params);
      return { content: [{ type: "text", text: `${updated.archived ? "Archived" : "Unarchived"} thread ${updated.id}.` }], details: updated };
    },
  }];
}
