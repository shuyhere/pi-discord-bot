import test from "node:test";
import assert from "node:assert/strict";
import { buildApprovalCard, buildTreeSelectionCard, chunkText, formatWorkingText, truncate } from "./discord-ui.js";

test("chunkText splits long text into safe chunks", () => {
  const text = "a ".repeat(1500);
  const chunks = chunkText(text, 100);
  assert.ok(chunks.length > 1);
  assert.ok(chunks.every((chunk) => chunk.length <= 100));
});

test("formatWorkingText and truncate are stable", () => {
  assert.equal(formatWorkingText("hello", true), "hello\n\n...");
  assert.equal(formatWorkingText("hello", false), "hello");
  assert.equal(truncate("abcdef", 5), "ab...");
});

test("buildTreeSelectionCard creates options and rows", () => {
  const card = buildTreeSelectionCard({
    title: "Session tree",
    description: "desc",
    messageId: "123",
    entries: [
      { id: "a", depth: 0, type: "message", preview: "root", isCurrent: true },
      { id: "b", depth: 1, type: "message", preview: "child", isCurrent: false },
    ],
  });
  assert.equal(card.options.length, 2);
  assert.equal(card.rows.length, 2);
});

test("buildApprovalCard includes action row", () => {
  const card = buildApprovalCard({
    title: "Approve",
    description: "Do it?",
    approveId: "yes",
    rejectId: "no",
    bullets: ["one"],
  });
  assert.equal(card.rows.length, 1);
});
