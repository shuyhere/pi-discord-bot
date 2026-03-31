import { readFileSync, existsSync } from "node:fs";
import { mkdir } from "node:fs/promises";
import type { ImageContent } from "@mariozechner/pi-ai";
import type { AgentSession } from "@mariozechner/pi-coding-agent";
import type { DiscordContext } from "./discord.js";
import { imageMimeType } from "./agent-models.js";
import type { RunState } from "./agent-types.js";
import * as log from "./log.js";
import { syncLogToSessionManager } from "./context.js";

function truncate(text: string, max = 1800): string {
  return text.length <= max ? text : `${text.slice(0, max - 3)}...`;
}

function codeBlock(text: string, language = ""): string {
  const suffix = language ? language : "";
  return `\`\`\`${suffix}\n${text}\n\`\`\``;
}

function formatToolResult(params: { toolName: string; label?: string; durationMs: number; argsText: string; resultText: string; isError: boolean; result: unknown }): string {
  const status = params.isError ? "✗" : "✓";
  const title = params.label && params.label !== params.toolName ? `${status} ${params.toolName} — ${params.label}` : `${status} ${params.toolName}`;
  const resultObj = params.result as any;
  const textSummary = Array.isArray(resultObj?.content) ? resultObj.content.filter((item: any) => item?.type === "text" && typeof item.text === "string").map((item: any) => item.text).join("\n") : "";
  if (!params.isError) {
    return textSummary.trim() ? `**${title}** · ${(params.durationMs / 1000).toFixed(1)}s\n\n${truncate(textSummary, 1200)}` : `**${title}** · ${(params.durationMs / 1000).toFixed(1)}s`;
  }
  return [`**${title}** · ${(params.durationMs / 1000).toFixed(1)}s`, "", "**Args**", codeBlock(params.argsText, "json"), "", "**Result**", codeBlock(params.resultText, "json")].join("\n");
}

export function wireSessionUpdates(session: AgentSession, runState: RunState): void {
  const enqueue = (fn: () => Promise<void>) => {
    runState.queue = runState.queue.then(fn).catch((err) => {
      log.warn("discord update failed", err instanceof Error ? err.message : String(err));
    });
  };

  session.subscribe((event) => {
    if (!runState.ctx) return;
    const ctx = runState.ctx;

    if (event.type === "tool_execution_start") {
      const args = event.args as { label?: string };
      runState.pendingTools.set(event.toolCallId, { toolName: event.toolName, label: args.label ?? event.toolName, args: event.args, startedAt: Date.now() });
      enqueue(() => ctx.setToolActive(true));
    }

    if (event.type === "tool_execution_end") {
      const pending = runState.pendingTools.get(event.toolCallId);
      runState.pendingTools.delete(event.toolCallId);
      const durationMs = pending ? Date.now() - pending.startedAt : 0;
      const argsText = pending?.args ? truncate(JSON.stringify(pending.args, null, 2), 1200) : "{}";
      const resultText = truncate(JSON.stringify(event.result, null, 2), 1800);
      enqueue(() => ctx.setToolActive(false));
      if (event.isError) {
        const reply = formatToolResult({ toolName: event.toolName, label: pending?.label, durationMs, argsText, resultText, isError: event.isError, result: event.result });
        enqueue(() => ctx.respondInThread(reply));
        enqueue(() => ctx.respond(`Error: ${truncate(resultText, 200)}`, false));
      }
    }

    if (event.type === "message_end" && event.message.role === "assistant") {
      const assistant = event.message as any;
      if (assistant.stopReason) runState.stopReason = assistant.stopReason;
      if (assistant.errorMessage) runState.errorMessage = assistant.errorMessage;
      const text = assistant.content.filter((part: { type: string }) => part.type === "text").map((part: { text: string }) => part.text).join("\n");
      if (text.trim()) {
        enqueue(async () => {
          await ctx.setWorking(false);
          await ctx.replaceMessage(text);
        });
      }
    }
  });
}

export async function runAgentTurn(params: {
  ctx: DiscordContext;
  conversationDir: string;
  scratchDir: string;
  sessionManager: any;
  agent: any;
  session: AgentSession;
  runState: RunState;
}): Promise<{ stopReason: string; errorMessage?: string }> {
  const { ctx, conversationDir, scratchDir, sessionManager, agent, session, runState } = params;
  await mkdir(scratchDir, { recursive: true });
  await mkdir(conversationDir, { recursive: true });

  syncLogToSessionManager(sessionManager, conversationDir, ctx.message.messageId);
  agent.state.messages = sessionManager.buildSessionContext().messages;
  session.setActiveToolsByName(session.getActiveToolNames());

  runState.ctx = ctx;
  runState.stopReason = "stop";
  runState.errorMessage = undefined;
  runState.pendingTools.clear();

  const imageAttachments: ImageContent[] = [];
  const otherAttachments: string[] = [];
  for (const attachment of ctx.message.attachments) {
    const mimeType = imageMimeType(attachment.local);
    if (mimeType && existsSync(attachment.local)) {
      imageAttachments.push({ type: "image", mimeType, data: readFileSync(attachment.local).toString("base64") });
    } else {
      otherAttachments.push(attachment.local);
    }
  }

  let prompt = `[${ctx.message.userName}]: ${ctx.message.text}`;
  if (otherAttachments.length > 0) prompt += `\n\n<discord_attachments>\n${otherAttachments.join("\n")}\n</discord_attachments>`;

  await ctx.setTyping(true);
  await ctx.setWorking(true);
  await session.prompt(prompt, imageAttachments.length > 0 ? { images: imageAttachments } : undefined);
  await runState.queue;
  await ctx.setTyping(false);
  await ctx.setWorking(false);

  const result = { stopReason: runState.stopReason, errorMessage: runState.errorMessage };
  runState.ctx = null;
  return result;
}
