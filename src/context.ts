import type { UserMessage } from "@mariozechner/pi-ai";
import { SessionManager, type SessionMessageEntry, SettingsManager } from "@mariozechner/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

interface LogEntry {
  date?: string;
  messageId?: string;
  authorId?: string;
  authorName?: string;
  text?: string;
  isBot?: boolean;
}

export function syncLogToSessionManager(
  sessionManager: SessionManager,
  channelDir: string,
  excludeMessageId?: string,
): number {
  const logPath = join(channelDir, "log.jsonl");
  if (!existsSync(logPath)) return 0;

  const existing = new Set<string>();
  for (const entry of sessionManager.getEntries()) {
    if (entry.type !== "message") continue;
    const message = (entry as SessionMessageEntry).message as { role: string; content?: unknown };
    if (message.role !== "user") continue;
    const content = message.content;
    if (typeof content === "string") existing.add(content);
    if (Array.isArray(content)) {
      for (const part of content) {
        if (typeof part === "object" && part && "type" in part && part.type === "text" && "text" in part) {
          existing.add(String(part.text));
        }
      }
    }
  }

  const lines = readFileSync(logPath, "utf-8").split("\n").filter(Boolean);
  const toAppend: Array<{ timestamp: number; message: UserMessage }> = [];

  for (const line of lines) {
    try {
      const entry = JSON.parse(line) as LogEntry;
      if (entry.isBot) continue;
      if (excludeMessageId && entry.messageId === excludeMessageId) continue;
      const text = `[${entry.authorName ?? entry.authorId ?? "unknown"}]: ${entry.text ?? ""}`;
      if (existing.has(text)) continue;
      existing.add(text);
      toAppend.push({
        timestamp: entry.date ? new Date(entry.date).getTime() : Date.now(),
        message: {
          role: "user",
          content: [{ type: "text", text }],
          timestamp: entry.date ? new Date(entry.date).getTime() : Date.now(),
        },
      });
    } catch {}
  }

  toAppend.sort((a, b) => a.timestamp - b.timestamp);
  for (const item of toAppend) {
    sessionManager.appendMessage(item.message);
  }
  return toAppend.length;
}

export function createDiscordSettingsManager(_workspaceDir: string): SettingsManager {
  return SettingsManager.create();
}
