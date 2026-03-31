import { appendFileSync, createWriteStream, mkdirSync } from "node:fs";
import { promises as fs } from "node:fs";
import { dirname, extname, join } from "node:path";
import type { Attachment } from "discord.js";

export interface StoredAttachment {
  id: string;
  url: string;
  local: string;
  name: string;
  contentType?: string | null;
  size: number;
}

export class ChannelStore {
  constructor(private readonly workingDir: string) {}

  channelDir(channelId: string): string {
    return join(this.workingDir, channelId);
  }

  logPath(channelId: string): string {
    return join(this.channelDir(channelId), "log.jsonl");
  }

  contextPath(channelId: string): string {
    return join(this.channelDir(channelId), "context.jsonl");
  }

  attachmentsDir(channelId: string): string {
    return join(this.channelDir(channelId), "attachments");
  }

  ensureChannelDir(channelId: string): void {
    mkdirSync(this.channelDir(channelId), { recursive: true });
  }

  appendLog(channelId: string, entry: object): void {
    this.ensureChannelDir(channelId);
    const path = this.logPath(channelId);
    const line = `${JSON.stringify(entry)}\n`;
    appendFileSync(path, line);
  }

  async storeAttachments(channelId: string, attachments: Iterable<Attachment>): Promise<StoredAttachment[]> {
    const dir = this.attachmentsDir(channelId);
    mkdirSync(dir, { recursive: true });
    const stored: StoredAttachment[] = [];

    for (const attachment of attachments) {
      const name = attachment.name ?? `${attachment.id}${extname(attachment.url)}`;
      const localName = `${Date.now()}-${attachment.id}-${name}`;
      const filePath = join(dir, localName);
      const response = await fetch(attachment.url);
      if (!response.ok) continue;

      await fs.mkdir(dirname(filePath), { recursive: true });
      const fileStream = createWriteStream(filePath);
      const buffer = Buffer.from(await response.arrayBuffer());
      await new Promise<void>((resolve, reject) => {
        fileStream.on("finish", () => resolve());
        fileStream.on("error", reject);
        fileStream.end(buffer);
      });

      stored.push({
        id: attachment.id,
        url: attachment.url,
        local: filePath,
        name,
        contentType: attachment.contentType,
        size: attachment.size,
      });
    }

    return stored;
  }
}
