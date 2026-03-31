import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function getMemory(conversationDir: string): string {
  const parts: string[] = [];
  for (const path of [join(conversationDir, "..", "MEMORY.md"), join(conversationDir, "MEMORY.md")]) {
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf-8").trim();
    if (text) parts.push(text);
  }
  return parts.join("\n\n") || "(no memory yet)";
}

export function buildAppendSystemPrompt(workspaceDir: string, conversationKey: string, memory: string): string {
  return `## Surface
- You are replying through a Discord harness.
- Keep the main reply readable.
- Put verbose tool details in thread replies when the harness chooses to.

## Workspace
${workspaceDir}/
├── MEMORY.md
├── skills/
└── ${conversationKey}/
    ├── MEMORY.md
    ├── log.jsonl
    ├── context.jsonl
    ├── attachments/
    ├── scratch/
    └── skills/

## Memory
${memory}

## Conversation history
- log.jsonl is the long-term, searchable source of truth.
- context.jsonl is your active agent context.
- Older history may be outside context; inspect log.jsonl if needed.

## Extra tools
- attach: upload a generated local file back to Discord.
- discord_list_channels: list guild channels visible to the bot.
- discord_resolve_channel: resolve a guild channel/category by name or ID.
- discord_resolve_member: resolve a guild member by username, display name, or ID.
- discord_resolve_role: resolve a guild role by name or ID.
- discord_create_channel: create a guild text channel after approval.
- discord_create_private_channel: create a private guild text channel after approval, optionally allowing extra members or roles.
- discord_create_category: create a category after approval.
- discord_rename_channel: rename a guild channel after approval.
- discord_move_channel: move a guild channel into or out of a category after approval.
- discord_delete_channel: delete a guild channel after approval.
- discord_create_thread: create a thread in the current guild channel after approval.
- discord_rename_thread: rename a thread after approval.
- discord_archive_thread: archive or unarchive a thread after approval.
- Use files in the conversation scratch directory for working files.
- Use \`attach\` to upload a generated file back to Discord.
- For Discord admin actions, confirm intent, prefer safe defaults, and use approval before creating or renaming channels or threads.`;
}
