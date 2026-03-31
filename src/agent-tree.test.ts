import test from "node:test";
import assert from "node:assert/strict";
import { flattenTreeNodes, getTreeEntryPreview, summarizeTreeNode } from "./agent-tree.js";

test("getTreeEntryPreview formats message entries", () => {
  const preview = getTreeEntryPreview({
    type: "message",
    id: "m1",
    message: { role: "user", content: [{ type: "text", text: "hello\nworld" }] },
  });
  assert.match(preview, /^user — hello world/);
});

test("flattenTreeNodes preserves depth and current marker", () => {
  const nodes = [{
    entry: { id: "root", type: "message", message: { role: "user", content: "root" } },
    children: [{ entry: { id: "child", type: "model_change", provider: "openai", modelId: "gpt-4.1" }, children: [] }],
  }];
  const flat = flattenTreeNodes(nodes, "child");
  assert.equal(flat.length, 2);
  assert.equal(flat[0].depth, 0);
  assert.equal(flat[1].depth, 1);
  assert.equal(flat[1].isCurrent, true);
});

test("summarizeTreeNode renders nested bullet tree", () => {
  const lines = summarizeTreeNode({
    entry: { id: "r", type: "message", message: { role: "user", content: "root" } },
    children: [{ entry: { id: "c", type: "session_info", name: "test" }, children: [] }],
  });
  assert.equal(lines.length, 2);
  assert.match(lines[0], /^- user — root \(r\)$/);
  assert.match(lines[1], /^  - session info — test \(c\)$/);
});
