import type { Attachment } from "discord.js";

export interface StoredAttachmentLike {
  id: string;
  url: string;
  local: string;
  name: string;
  contentType?: string | null;
  size: number;
}

export interface DiscordEvent {
  type: "mention" | "dm" | "slash";
  source: "message" | "slash";
  channelId: string;
  guildId?: string;
  threadId?: string;
  messageId: string;
  userId: string;
  userName: string;
  text: string;
  attachments: StoredAttachmentLike[];
}

export interface ChannelInfo {
  id: string;
  name: string;
}

export interface UserInfo {
  id: string;
  userName: string;
  displayName: string;
}

export interface DiscordContext {
  message: DiscordEvent;
  channels: ChannelInfo[];
  users: UserInfo[];
  respond(text: string, shouldLog?: boolean): Promise<void>;
  replaceMessage(text: string): Promise<void>;
  respondInThread(text: string): Promise<void>;
  setTyping(isTyping: boolean): Promise<void>;
  uploadFile(filePath: string, title?: string): Promise<void>;
  setWorking(working: boolean): Promise<void>;
  setToolActive(active: boolean): Promise<void>;
  deleteMessage(): Promise<void>;
  confirmAction(params: { title: string; description: string; bullets?: string[]; caution?: string; approveLabel?: string }): Promise<boolean>;
  listGuildChannels(): Promise<Array<{ id: string; name: string; type: string; parentId?: string }>>;
  resolveGuildChannel(query: string): Promise<{ id: string; name: string; type: string; parentId?: string }>;
  resolveGuildMember(query: string): Promise<{ id: string; userName: string; displayName: string }>;
  resolveGuildRole(query: string): Promise<{ id: string; name: string }>;
  createGuildTextChannel(params: { name: string; parentId?: string; topic?: string; private?: boolean; memberIds?: string[]; roleIds?: string[] }): Promise<{ id: string; name: string }>;
  createGuildCategory(params: { name: string }): Promise<{ id: string; name: string }>;
  renameGuildChannel(params: { channelId: string; name: string }): Promise<{ id: string; name: string }>;
  moveGuildChannel(params: { channelId: string; parentId?: string | null }): Promise<{ id: string; name: string; parentId?: string | null }>;
  deleteGuildChannel(params: { channelId: string }): Promise<{ id: string }>;
  createThreadFromCurrentChannel(params: { name: string; autoArchiveDuration?: 60 | 1440 | 4320 | 10080 }): Promise<{ id: string; name: string }>;
  renameThread(params: { threadId: string; name: string }): Promise<{ id: string; name: string }>;
  archiveThread(params: { threadId: string; archived?: boolean; locked?: boolean }): Promise<{ id: string; archived: boolean; locked?: boolean }>;
}

export interface DiscordHandler {
  isRunning(conversationKey: string): boolean;
  handleEvent(event: DiscordEvent, transport: { createContext(event: DiscordEvent): Promise<DiscordContext> }): Promise<void>;
  handleStop(conversationKey: string, transport: unknown): Promise<void>;
}

export interface DiscordPolicy {
  allowDMs?: boolean;
  guildIds?: string[];
  channelIds?: string[];
  mentionMode?: "mention-only" | "allow-all";
  slashCommands?: {
    enabled?: boolean;
    guildId?: string;
  };
}

export interface LoggedMessage {
  date?: string;
  messageId?: string;
  channelId?: string;
  guildId?: string;
  threadId?: string;
  authorId?: string;
  authorName?: string;
  text?: string;
  attachments?: StoredAttachmentLike[];
  isBot?: boolean;
}

export type DiscordAttachmentIterable = Iterable<Attachment>;
