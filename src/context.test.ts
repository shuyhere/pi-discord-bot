import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { syncLogToSessionManager } from "./context.js";

test("syncLogToSessionManager appends only non-bot, non-duplicate messages", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-discord-bot-test-"));
  writeFileSync(join(dir, "log.jsonl"), [
    JSON.stringify({ messageId: "1", authorName: "alice", text: "hello", date: "2026-01-01T00:00:00.000Z", isBot: false }),
    JSON.stringify({ messageId: "2", authorName: "bot", text: "reply", date: "2026-01-01T00:00:01.000Z", isBot: true }),
    JSON.stringify({ messageId: "3", authorName: "alice", text: "hello", date: "2026-01-01T00:00:02.000Z", isBot: false }),
  ].join("\n"));

  const appended: any[] = [];
  const sessionManager = {
    getEntries: () => [],
    appendMessage: (message: any) => appended.push(message),
  } as any;

  const count = syncLogToSessionManager(sessionManager, dir);
  assert.equal(count, 1);
  assert.equal(appended.length, 1);
  assert.equal(appended[0].content[0].text, "[alice]: hello");
});

test("syncLogToSessionManager respects excludeMessageId", () => {
  const dir = mkdtempSync(join(tmpdir(), "pi-discord-bot-test-"));
  writeFileSync(join(dir, "log.jsonl"), JSON.stringify({ messageId: "1", authorName: "alice", text: "hello", date: "2026-01-01T00:00:00.000Z", isBot: false }));

  const appended: any[] = [];
  const sessionManager = {
    getEntries: () => [],
    appendMessage: (message: any) => appended.push(message),
  } as any;

  const count = syncLogToSessionManager(sessionManager, dir, "1");
  assert.equal(count, 0);
  assert.equal(appended.length, 0);
});
