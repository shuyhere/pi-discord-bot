import type { ChatInputCommandInteraction, Client, TextBasedChannel } from "discord.js";
import type { ChannelStore } from "./store.js";
import type { DiscordContext, DiscordEvent, LoggedMessage } from "./discord-types.js";
import { chunkText, formatWorkingText, sendOrEditAnchor } from "./discord-ui.js";
import { createGuildToolApi } from "./discord-guild-tools.js";

export async function createDiscordContext(params: {
  client: Client;
  store: ChannelStore;
  event: DiscordEvent;
  pendingSlashInteractions: Map<string, ChatInputCommandInteraction>;
  getConversationKeyFromIds: (guildId: string | undefined, channelId: string, threadId: string | undefined, userId: string) => string;
  requestApproval: (event: DiscordEvent, params: { title: string; description: string; bullets?: string[]; caution?: string; approveLabel?: string }) => Promise<boolean>;
}): Promise<DiscordContext> {
  const { client, store, event, pendingSlashInteractions, getConversationKeyFromIds, requestApproval } = params;
  const channel = await client.channels.fetch(event.channelId);
  if (!channel?.isTextBased()) throw new Error(`Channel ${event.channelId} is not text-based`);

  const slashInteraction = event.source === "slash" ? pendingSlashInteractions.get(event.messageId) ?? null : null;
  const channels = [...client.channels.cache.values()]
    .filter((c): c is TextBasedChannel & { name?: string } => c.isTextBased())
    .map((c) => ({ id: c.id, name: "name" in c ? (c.name ?? c.id) : c.id }));
  const users = [...client.users.cache.values()].map((u) => ({ id: u.id, userName: u.username, displayName: u.displayName ?? u.username }));

  let replyMessageId: string | null = null;
  let currentText = "";
  let working = true;
  let detailThreadId: string | null = null;
  let typingInterval: ReturnType<typeof setInterval> | null = null;
  const sendable = channel as any;

  const fetchAnchorMessage = async () => {
    if (!replyMessageId) return null;
    if (slashInteraction) {
      try {
        return await slashInteraction.fetchReply();
      } catch {
        return null;
      }
    }
    try {
      return await sendable.messages.fetch(replyMessageId);
    } catch {
      return null;
    }
  };

  const sourceMessage = event.source === "message" ? await sendable.messages.fetch(event.messageId).catch(() => null) : null;

  const syncReaction = async (emoji: string, enabled: boolean) => {
    if (!sourceMessage) return;
    try {
      const existing = sourceMessage.reactions.cache.find((reaction: any) => reaction.emoji?.name === emoji);
      if (enabled) {
        if (!existing) await sourceMessage.react(emoji);
      } else if (existing) {
        await existing.users.remove(client.user?.id);
      }
    } catch {}
  };

  const sendOrEdit = async (text: string, shouldLog = true) => {
    currentText = text;
    const display = formatWorkingText(text, working);
    const anchor = await sendOrEditAnchor({ slashInteraction, sendable, replyMessageId, text: display });
    replyMessageId = anchor.replyMessageId;

    if (shouldLog && replyMessageId) {
      const key = getConversationKeyFromIds(event.guildId, event.channelId, event.threadId, event.userId);
      const entry: LoggedMessage = {
        date: new Date().toISOString(),
        messageId: replyMessageId,
        channelId: event.channelId,
        guildId: event.guildId,
        threadId: event.threadId,
        authorId: client.user?.id,
        authorName: client.user?.username,
        text,
        isBot: true,
      };
      store.appendLog(key, entry);
    }
  };

  const getDetailSendable = async () => {
    if (channel.isDMBased()) return null;
    if (channel.isThread()) return sendable;
    if (detailThreadId) {
      const existing = await client.channels.fetch(detailThreadId).catch(() => null);
      if (existing?.isTextBased()) return existing as any;
    }

    const base = await fetchAnchorMessage();
    if (base && typeof (base as any).startThread === "function") {
      const thread = await (base as any).startThread({ name: `Details · ${event.userName}`.slice(0, 100), autoArchiveDuration: 1440 }).catch(() => null);
      if (thread) {
        detailThreadId = thread.id;
        return thread as any;
      }
    }

    return sendable;
  };

  const guildApi = createGuildToolApi({ client, event, channel, sendable, fetchAnchorMessage });

  return {
    message: event,
    channels,
    users,
    respond: async (text, shouldLog = true) => sendOrEdit(currentText ? `${currentText}\n${text}` : text, shouldLog),
    replaceMessage: async (text) => {
      const parts = chunkText(text);
      await sendOrEdit(parts[0] ?? "", false);
      for (const part of parts.slice(1)) await sendable.send(part);
    },
    respondInThread: async (text) => {
      if (channel.isDMBased()) return;
      const detailSendable = await getDetailSendable();
      if (!detailSendable) return;
      for (const part of chunkText(text)) await detailSendable.send(part);
    },
    setTyping: async (isTyping) => {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      if (!isTyping) return;
      if (slashInteraction) {
        if (!replyMessageId) {
          const response = await slashInteraction.editReply("Thinking...");
          replyMessageId = response.id;
          currentText = "Thinking...";
        }
        return;
      }
      if (typeof sendable.sendTyping === "function") {
        await sendable.sendTyping();
        typingInterval = setInterval(() => {
          void sendable.sendTyping().catch(() => {});
        }, 7000);
      }
    },
    uploadFile: async (filePath, title) => {
      if (channel.isDMBased()) {
        await sendable.send({ files: [{ attachment: filePath, name: title }] });
        return;
      }
      const base = await fetchAnchorMessage();
      if (base && typeof base.reply === "function") {
        await base.reply({ files: [{ attachment: filePath, name: title }] });
        return;
      }
      if (slashInteraction) {
        const response = await slashInteraction.editReply(currentText || "Working...");
        replyMessageId = response.id;
        if (typeof response.reply === "function") {
          await response.reply({ files: [{ attachment: filePath, name: title }] });
          return;
        }
      }
      await sendable.send({ files: [{ attachment: filePath, name: title }] });
    },
    setWorking: async (isWorking) => {
      working = isWorking;
      await syncReaction("🤔", isWorking);
      if (!isWorking) await syncReaction("🧑‍💻", false);
      if (!replyMessageId) return;
      const anchor = await sendOrEditAnchor({ slashInteraction, sendable, replyMessageId, text: formatWorkingText(currentText, working) });
      replyMessageId = anchor.replyMessageId;
    },
    setToolActive: async (active) => {
      await syncReaction("🧑‍💻", active);
    },
    deleteMessage: async () => {
      if (typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
      if (!replyMessageId) return;
      if (slashInteraction) {
        await slashInteraction.deleteReply();
        pendingSlashInteractions.delete(event.messageId);
        replyMessageId = null;
        return;
      }
      const msg = await sendable.messages.fetch(replyMessageId);
      await msg.delete();
      replyMessageId = null;
    },
    confirmAction: async (approvalParams) => requestApproval(event, approvalParams),
    ...guildApi,
  };
}
