import test from "node:test";
import assert from "node:assert/strict";
import { findModelByReference, formatModel, imageMimeType, modelSortKey, resolveScopedModels } from "./agent-models.js";

const models = [
  { provider: "anthropic", id: "claude-sonnet" },
  { provider: "openai-codex", id: "gpt-5.4" },
  { provider: "openai", id: "gpt-4.1" },
];

const registry = {
  getAvailable: () => models,
} as any;

test("findModelByReference resolves exact provider/model", () => {
  const result = findModelByReference(registry, "openai-codex/gpt-5.4");
  assert.equal(result.model?.provider, "openai-codex");
  assert.equal(result.model?.id, "gpt-5.4");
});

test("findModelByReference reports ambiguity", () => {
  const result = findModelByReference(registry, "gpt");
  assert.match(result.error ?? "", /ambiguous/i);
});

test("resolveScopedModels supports wildcard matching", () => {
  const result = resolveScopedModels(registry, ["openai*"]);
  assert.deepEqual(result.map((item) => `${item.model.provider}/${item.model.id}`), [
    "openai-codex/gpt-5.4",
    "openai/gpt-4.1",
  ]);
});

test("modelSortKey prioritizes openai-codex first", () => {
  const sorted = [...models].sort((a, b) => {
    const [ap, ak] = modelSortKey(a as any);
    const [bp, bk] = modelSortKey(b as any);
    return ap - bp || ak.localeCompare(bk);
  });
  assert.equal(sorted[0].provider, "openai-codex");
});

test("formatModel and imageMimeType behave as expected", () => {
  assert.equal(formatModel({ provider: "openai", id: "gpt-4.1" } as any), "openai/gpt-4.1");
  assert.equal(imageMimeType("image.png"), "image/png");
  assert.equal(imageMimeType("doc.txt"), undefined);
});
