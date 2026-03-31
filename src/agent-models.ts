import type { Model } from "@mariozechner/pi-ai";
import { ModelRegistry } from "@mariozechner/pi-coding-agent";
import type { createDiscordSettingsManager } from "./context.js";

export function resolveInitialModel(modelRegistry: ModelRegistry, settingsManager: ReturnType<typeof createDiscordSettingsManager>): Model<any> {
  const available = modelRegistry.getAvailable();
  const all = modelRegistry.getAll();
  const savedProvider = settingsManager.getDefaultProvider();
  const savedModelId = settingsManager.getDefaultModel();
  const saved = savedProvider && savedModelId ? modelRegistry.find(savedProvider, savedModelId) : undefined;

  return saved ?? available[0] ?? all[0] ?? (() => {
    throw new Error("No models available in Pi model registry");
  })();
}

export function findModelByReference(modelRegistry: ModelRegistry, reference: string): { model?: Model<any>; error?: string } {
  const query = reference.trim().toLowerCase();
  if (!query) return { error: "Missing model reference." };

  const models = modelRegistry.getAvailable();
  if (models.length === 0) return { error: "No available models. Authenticate with Pi first." };

  const exact = models.find((model) => `${model.provider}/${model.id}`.toLowerCase() === query || model.id.toLowerCase() === query);
  if (exact) return { model: exact };

  const partial = models.filter((model) => `${model.provider}/${model.id}`.toLowerCase().includes(query) || model.id.toLowerCase().includes(query));
  if (partial.length === 1) return { model: partial[0] };
  if (partial.length === 0) return { error: `No available model matches \`${reference}\`.` };
  return {
    error: `Model reference is ambiguous. Matches: ${partial.slice(0, 8).map((model) => `\`${model.provider}/${model.id}\``).join(", ")}`,
  };
}

export function formatModel(model: Model<any> | undefined): string {
  return model ? `${model.provider}/${model.id}` : "(no model selected)";
}

export function modelSortKey(model: Model<any>): [number, string] {
  const providerPriority = model.provider === "openai-codex"
    ? 0
    : model.provider === "anthropic"
      ? 1
      : model.provider === "openai"
        ? 2
        : 3;
  return [providerPriority, `${model.provider}/${model.id}`.toLowerCase()];
}

function wildcardToRegExp(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

export function resolveScopedModels(modelRegistry: ModelRegistry, patterns: string[]): Array<{ model: Model<any> }> {
  const available = modelRegistry.getAvailable();
  const resolved: Array<{ model: Model<any> }> = [];
  const seen = new Set<string>();

  for (const raw of patterns) {
    const pattern = raw.trim();
    if (!pattern) continue;

    const exact = available.filter((model) => `${model.provider}/${model.id}`.toLowerCase() === pattern.toLowerCase() || model.id.toLowerCase() === pattern.toLowerCase());
    const regex = wildcardToRegExp(pattern.includes("/") ? pattern : `*${pattern}*`);
    const matches = exact.length > 0
      ? exact
      : available.filter((model) => regex.test(`${model.provider}/${model.id}`) || regex.test(model.id));

    for (const model of matches) {
      const key = `${model.provider}/${model.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      resolved.push({ model });
    }
  }

  return resolved;
}

export function imageMimeType(path: string): string | undefined {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return undefined;
}
