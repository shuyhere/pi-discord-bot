import test from "node:test";
import assert from "node:assert/strict";
import { clearPending, registerManyPending, registerPending } from "./discord-registry.js";

test("registerPending stores a single entry", () => {
  const registry = new Map<string, { userId: string; resolve: (value: string) => void }>();
  const resolve = () => {};
  registerPending({ registry, key: "a", userId: "u1", resolve });
  assert.equal(registry.get("a")?.userId, "u1");
});

test("registerManyPending and clearPending work together", () => {
  const registry = new Map<string, { userId: string; resolve: (value: string) => void }>();
  const resolve = () => {};
  registerManyPending({ registry, keys: ["a", "b", "c"], userId: "u1", resolve });
  assert.equal(registry.size, 3);
  assert.equal(clearPending(registry, ["a", "c", "missing"]), true);
  assert.deepEqual([...registry.keys()], ["b"]);
});
